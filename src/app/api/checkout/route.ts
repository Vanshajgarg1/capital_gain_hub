import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 1. AUTHENTICATION — derive user from JWT
    // ──────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // ──────────────────────────────────────────────
    // 2. VALIDATE COURSE — read authoritative price
    // ──────────────────────────────────────────────
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, price")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "COURSE_NOT_FOUND" }, { status: 404 });
    }

    // ──────────────────────────────────────────────
    // 3. FREE COURSE PROTECTION
    // ──────────────────────────────────────────────
    if (Number(course.price) === 0) {
      return NextResponse.json(
        { error: "FREE_COURSE_USE_ENROLL_ENDPOINT" },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────
    // 4. SERVICE ROLE & RAZORPAY CONFIG
    // ──────────────────────────────────────────────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Missing Razorpay environment variables");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const amount_paise = Math.round(Number(course.price) * 100);

    // ──────────────────────────────────────────────
    // 5. EXISTING ENROLLMENT CHECK
    // ──────────────────────────────────────────────
    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({ error: "ALREADY_ENROLLED" }, { status: 409 });
    }

    // ──────────────────────────────────────────────
    // 6. EXISTING ORDER / IDEMPOTENCY CHECK
    // ──────────────────────────────────────────────
    const { data: existingOrders } = await supabaseAdmin
      .from("orders")
      .select("id, course_id, amount, status, created_at, gateway_order_id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .in("status", ["PENDING", "COMPLETED"]);

    if (existingOrders && existingOrders.length > 0) {
      const completedOrder = existingOrders.find((o) => o.status === "COMPLETED");
      if (completedOrder) {
        return NextResponse.json(
          {
            error: "ORDER_COMPLETED_BUT_NOT_ENROLLED",
            order_id: completedOrder.id,
          },
          { status: 409 }
        );
      }

      const pendingOrder = existingOrders.find((o) => o.status === "PENDING");
      if (pendingOrder) {
        if (pendingOrder.gateway_order_id) {
          // Reuse existing Razorpay order
          return NextResponse.json(
            {
              success: true,
              existing: true,
              razorpay_key_id: razorpayKeyId,
              order: {
                id: pendingOrder.id,
                course_id: pendingOrder.course_id,
                amount: Number(pendingOrder.amount),
                status: pendingOrder.status,
                gateway_order_id: pendingOrder.gateway_order_id,
              },
            },
            { status: 200 }
          );
        } else {
          // Missing gateway_order_id on existing PENDING order. Create Razorpay order and update local order.
          try {
            const rzpOrder = await razorpay.orders.create({
              amount: amount_paise,
              currency: "INR",
              receipt: pendingOrder.id,
            });

            await supabaseAdmin
              .from("orders")
              .update({ gateway_order_id: rzpOrder.id })
              .eq("id", pendingOrder.id);

            return NextResponse.json(
              {
                success: true,
                existing: true,
                razorpay_key_id: razorpayKeyId,
                order: {
                  id: pendingOrder.id,
                  course_id: pendingOrder.course_id,
                  amount: Number(pendingOrder.amount),
                  status: pendingOrder.status,
                  gateway_order_id: rzpOrder.id,
                },
              },
              { status: 200 }
            );
          } catch (rzpErr) {
            console.error("Razorpay order recovery failed:", rzpErr);
            return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
          }
        }
      }
    }

    // ──────────────────────────────────────────────
    // 7. CREATE NEW PENDING ORDER
    // ──────────────────────────────────────────────
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: course_id,
        amount: Number(course.price),
        status: "PENDING",
      })
      .select("id, course_id, amount, status")
      .single();

    if (insertError || !newOrder) {
      console.error("Error creating order:", insertError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Create Razorpay order
    let rzpOrderId = null;
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: amount_paise,
        currency: "INR",
        receipt: newOrder.id,
      });
      rzpOrderId = rzpOrder.id;
    } catch (rzpErr) {
      console.error("Razorpay order creation failed:", rzpErr);
      return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
    }

    // Update local order with gateway_order_id
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ gateway_order_id: rzpOrderId })
      .eq("id", newOrder.id);

    if (updateError) {
      console.error("Failed to update order with gateway_order_id:", updateError);
      // We still have the Razorpay order and the local order.
      // Next time the user tries, the "EXISTING ORDER" flow will handle it.
      return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
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
          gateway_order_id: rzpOrderId,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
