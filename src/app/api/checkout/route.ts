
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id, utm } = body;

    if (!course_id || typeof course_id !== "string") {
      return NextResponse.json(
        { error: "course_id is required" },
        { status: 400 }
      );
    }

    // Sanitize UTM parameters.
    const utmNotes: Record<string, string> = {};
    if (utm && typeof utm === "object" && !Array.isArray(utm)) {
      const allowedKeys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ];

      for (const key of allowedKeys) {
        if (typeof utm[key] === "string" && utm[key].length > 0) {
          utmNotes[key] = utm[key].slice(0, 256);
        }
      }
    }

    // 1. Authenticate the user using their Supabase JWT.
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("[Checkout] Required Supabase environment variables are missing.");

      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("[Checkout] Razorpay environment variables are missing.");

      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // 2. Fetch the authoritative course price from Supabase.
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, price")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "COURSE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const currentCoursePrice = Number(course.price);

    if (
      !Number.isFinite(currentCoursePrice) ||
      currentCoursePrice < 0
    ) {
      console.error("[Checkout] Invalid course price:", course_id);

      return NextResponse.json(
        { error: "INVALID_COURSE_PRICE" },
        { status: 500 }
      );
    }

    if (currentCoursePrice === 0) {
      return NextResponse.json(
        { error: "FREE_COURSE_USE_ENROLL_ENDPOINT" },
        { status: 400 }
      );
    }

    const amountPaise = Math.round(currentCoursePrice * 100);

    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      return NextResponse.json(
        { error: "INVALID_COURSE_PRICE" },
        { status: 500 }
      );
    }

    // 3. Check whether the user is already enrolled.
    const { data: existingEnrollment, error: enrollmentCheckError } =
      await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course_id)
        .maybeSingle();

    if (enrollmentCheckError) {
      console.error(
        "[Checkout] Enrollment lookup failed:",
        enrollmentCheckError
      );

      return NextResponse.json(
        { error: "Unable to verify enrollment. Please retry." },
        { status: 503 }
      );
    }

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "ALREADY_ENROLLED" },
        { status: 409 }
      );
    }

    // 4. Load previous orders for this user and course.
    const { data: existingOrders, error: ordersError } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, course_id, amount, status, created_at, gateway_order_id"
        )
        .eq("user_id", user.id)
        .eq("course_id", course_id)
        .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[Checkout] Order lookup failed:", ordersError);

      return NextResponse.json(
        { error: "Unable to verify existing orders. Please retry." },
        { status: 503 }
      );
    }

    const completedOrder = existingOrders?.find(
      (order) => order.status === "COMPLETED"
    );

    if (completedOrder) {
      // Do not create another checkout for a completed purchase.
      // Enrollment reconciliation should be handled by the trusted
      // payment fulfillment/reconciliation flow.
      return NextResponse.json(
        {
          error: "ALREADY_ENROLLED",
          order_id: completedOrder.id,
        },
        { status: 409 }
      );
    }

    // 5. Verify pending orders with Razorpay before reusing them.
    const pendingOrders = (existingOrders ?? []).filter(
      (order) => order.status === "PENDING"
    );

    for (const pendingOrder of pendingOrders) {
      // A missing gateway ID does not prove that no payable gateway
      // order exists. Preserve the local order and stop safely.
      if (!pendingOrder.gateway_order_id) {
        console.error(
          "[Checkout] Pending order has no gateway order ID:",
          pendingOrder.id
        );

        return NextResponse.json(
          {
            error: "ORDER_STATUS_UNVERIFIED",
            message:
              "An existing payment session needs verification. Please retry later or contact support.",
          },
          { status: 503 }
        );
      }

      let rzpOrder;

      try {
        // IMPORTANT: fetch the existing order; never create a new one here.
        rzpOrder = await razorpay.orders.fetch(
          pendingOrder.gateway_order_id
        );
      } catch (fetchError: any) {
        console.error(
          "[Checkout] Could not verify existing Razorpay order:",
          {
            localOrderId: pendingOrder.id,
            gatewayStatus: fetchError?.statusCode,
            message: fetchError?.message,
          }
        );

        // A fetch failure is not proof that the gateway order is invalid.
        // Keep the existing order PENDING and avoid creating duplicates.
        return NextResponse.json(
          {
            error: "PAYMENT_GATEWAY_UNAVAILABLE",
            message:
              "Unable to verify your existing payment session. Please retry shortly.",
          },
          { status: 503 }
        );
      }

      // Do not fulfill a purchase merely because the gateway order
      // reports a paid status. The verified payment flow must confirm
      // payment details and create enrollment idempotently.
      if (
        rzpOrder.status === "paid" ||
        (Number(rzpOrder.amount_paid) > 0)
      ) {
        return NextResponse.json(
          {
            error: "PAYMENT_CONFIRMATION_PENDING",
            message:
              "A payment may already exist for this order. Please wait for verification or contact support before retrying.",
            order_id: pendingOrder.id,
          },
          { status: 409 }
        );
      }

      // If the existing gateway order has an unexpected status,
      // do not silently replace or cancel it.
      if (rzpOrder.status !== "created") {
        console.error(
          "[Checkout] Existing Razorpay order has unexpected status:",
          {
            localOrderId: pendingOrder.id,
            gatewayOrderId: pendingOrder.gateway_order_id,
            gatewayStatus: rzpOrder.status,
          }
        );

        return NextResponse.json(
          {
            error: "ORDER_STATUS_UNVERIFIED",
            message:
              "Your existing payment session needs verification before another checkout can be created.",
          },
          { status: 409 }
        );
      }

      const localAmount = Number(pendingOrder.amount);

      const amountMatches =
        Number.isFinite(localAmount) &&
        Math.round(localAmount * 100) === amountPaise &&
        Number(rzpOrder.amount) === amountPaise &&
        rzpOrder.currency === "INR";

      if (!amountMatches) {
        console.error("[Checkout] Existing order price mismatch:", {
          localOrderId: pendingOrder.id,
          localAmount,
          expectedAmountPaise: amountPaise,
          gatewayAmount: rzpOrder.amount,
          gatewayCurrency: rzpOrder.currency,
        });

        // The old gateway order may still be payable. Do not cancel it
        // locally and create another order without resolving that risk.
        return NextResponse.json(
          {
            error: "EXISTING_ORDER_PRICE_MISMATCH",
            message:
              "An existing payment session has a different amount. Please contact support before making another payment.",
            order_id: pendingOrder.id,
          },
          { status: 409 }
        );
      }

      // Reuse the verified order. Local amounts are stored in rupees;
      // Razorpay amounts are in paise.
      return NextResponse.json(
        {
          success: true,
          existing: true,
          razorpay_key_id: razorpayKeyId,
          order: {
            id: pendingOrder.id,
            course_id: pendingOrder.course_id,
            amount: localAmount,
            status: pendingOrder.status,
            gateway_order_id: pendingOrder.gateway_order_id,
          },
        },
        { status: 200 }
      );
    }

    // 6. Create a new gateway order only when no unresolved pending
    // order exists for this user/course.
    const orderId = crypto.randomUUID();

    let rzpOrder;

    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: orderId,
        ...(Object.keys(utmNotes).length > 0
          ? { notes: utmNotes }
          : {}),
      });
    } catch (rzpError: any) {
      console.error("[Checkout] Razorpay order creation failed:", {
        message: rzpError?.message,
        statusCode: rzpError?.statusCode,
        currency: "INR",
        amountPaise,
      });

      return NextResponse.json(
        {
          error: "Failed to create payment session",
          message: "Please retry shortly.",
        },
        { status: 502 }
      );
    }

    // Confirm the returned gateway order matches the requested amount.
    if (
      Number(rzpOrder.amount) !== amountPaise ||
      rzpOrder.currency !== "INR" ||
      !rzpOrder.id
    ) {
      console.error(
        "[Checkout] Razorpay returned unexpected order details:",
        {
          gatewayOrderId: rzpOrder.id,
          expectedAmountPaise: amountPaise,
          returnedAmount: rzpOrder.amount,
          returnedCurrency: rzpOrder.currency,
        }
      );

      // Do not issue a checkout response for an unverified gateway order.
      // Operational reconciliation may be required if the gateway
      // created an order despite the unexpected response.
      return NextResponse.json(
        { error: "Unable to verify payment session. Please contact support." },
        { status: 502 }
      );
    }

    // 7. Persist the order. Amount in the local orders table is rupees.
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        id: orderId,
        user_id: user.id,
        course_id,
        amount: currentCoursePrice,
        status: "PENDING",
        gateway_order_id: rzpOrder.id,
      })
      .select("id, course_id, amount, status, gateway_order_id")
      .single();

    if (insertError || !newOrder) {
      console.error("[Checkout] Failed to persist local order:", {
        message: insertError?.message,
        code: insertError?.code,
        gatewayOrderId: rzpOrder.id,
      });

      // The gateway order may already exist. Do not retry blindly:
      // reconcile this gateway order/local DB state before another
      // checkout is created.
      return NextResponse.json(
        {
          error: "Failed to save payment session",
          message:
            "Please contact support before retrying payment.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        razorpay_key_id: razorpayKeyId,
        order: {
          id: newOrder.id,
          course_id: newOrder.course_id,
          amount: Number(newOrder.amount),
          status: newOrder.status,
          gateway_order_id: newOrder.gateway_order_id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "[Checkout] Unexpected checkout error:",
      error?.message || error
    );

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}