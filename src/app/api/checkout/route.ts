import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id, utm } = body;

    // Sanitize UTM params (only allow known keys, string values, max 256 chars)
    const utmNotes: Record<string, string> = {};
    if (utm && typeof utm === "object") {
      const allowedKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      for (const key of allowedKeys) {
        if (typeof utm[key] === "string" && utm[key].length > 0) {
          utmNotes[key] = utm[key].slice(0, 256);
        }
      }
    }

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
    const currentCoursePrice = Number(course.price);

    // ──────────────────────────────────────────────
    // 5. EXISTING ENROLLMENT CHECK
    // ──────────────────────────────────────────────
    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    if (existingEnrollment) {
      return NextResponse.json({ error: "ALREADY_ENROLLED" }, { status: 409 });
    }

    // ──────────────────────────────────────────────
    // 6. EXISTING ORDER / IDEMPOTENCY CHECK
    // ──────────────────────────────────────────────
    const { data: existingOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, course_id, amount, status, created_at, gateway_order_id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[Diagnostics] Error fetching existing orders:", ordersError);
    }

    if (existingOrders && existingOrders.length > 0) {
      // 6.1 Check if an order is already COMPLETED
      const completedOrder = existingOrders.find((o) => o.status === "COMPLETED");
      if (completedOrder) {
        // User already purchased this course. Self-heal enrollment if missing.
        const { error: healError } = await supabaseAdmin
          .from("enrollments")
          .insert({
            user_id: user.id,
            course_id: course_id,
          });

        if (healError && healError.code !== "23505") {
          console.error("[Diagnostics] Failed to heal enrollment for completed order:", healError);
        }

        return NextResponse.json(
          {
            error: "ALREADY_ENROLLED",
            order_id: completedOrder.id,
          },
          { status: 409 }
        );
      }

      // 6.2 Inspect all PENDING orders (from newest to oldest)
      const pendingOrders = existingOrders.filter((o) => o.status === "PENDING");
      let reusableOrder = null;

      for (const pendingOrder of pendingOrders) {
        if (pendingOrder.gateway_order_id) {
          try {
            const rzpOrder = await razorpay.orders.fetch(pendingOrder.gateway_order_id);

            // Check if user already paid this order on Razorpay
            const isPaid = Boolean(
              rzpOrder && (
                rzpOrder.status === "paid" ||
                (typeof rzpOrder.amount_paid === "number" && rzpOrder.amount_paid > 0)
              )
            );

            if (isPaid) {
              // Order was paid on Razorpay! Complete it and enroll immediately.
              console.log(`[Diagnostics] Razorpay order ${pendingOrder.gateway_order_id} is already paid. Fulfilling order ${pendingOrder.id}`);

              await supabaseAdmin
                .from("orders")
                .update({ status: "COMPLETED" })
                .eq("id", pendingOrder.id);

              try {
                const paymentsList = await razorpay.orders.fetchPayments(pendingOrder.gateway_order_id);
                const successfulPayment = paymentsList?.items?.find(
                  (p: any) => p.status === "captured" || p.status === "authorized"
                );
                if (successfulPayment) {
                  await supabaseAdmin.from("payments").insert({
                    order_id: pendingOrder.id,
                    amount: Number(pendingOrder.amount),
                    status: "SUCCESS",
                    payment_method: successfulPayment.method || "razorpay",
                    gateway_payment_id: successfulPayment.id,
                    gateway_signature: null,
                  });
                }
              } catch (payFetchErr: any) {
                console.warn("[Diagnostics] Failed fetching payment details for paid order:", payFetchErr?.message || payFetchErr);
              }

              const { error: enrollError } = await supabaseAdmin
                .from("enrollments")
                .insert({
                  user_id: user.id,
                  course_id: course_id,
                });

              if (enrollError && enrollError.code !== "23505") {
                console.error("[Diagnostics] Enrollment creation error for paid order:", enrollError);
              }

              return NextResponse.json(
                {
                  error: "ALREADY_ENROLLED",
                  order_id: pendingOrder.id,
                },
                { status: 409 }
              );
            }

            // Unpaid Razorpay order: check if amount and currency match current course price
            const isAmountMatch = (
              Number(pendingOrder.amount) === currentCoursePrice &&
              rzpOrder.amount === amount_paise &&
              rzpOrder.currency === "INR"
            );

            if (isAmountMatch && !reusableOrder) {
              reusableOrder = pendingOrder;
            } else {
              // Amount differs from current course price (or older duplicate pending order).
              // Mark CANCELLED to preserve history while preventing reuse.
              console.log(`[Diagnostics] Cancelling stale pending order ${pendingOrder.id}: local amount ${pendingOrder.amount}, current course price ${currentCoursePrice}`);
              await supabaseAdmin
                .from("orders")
                .update({ status: "CANCELLED" })
                .eq("id", pendingOrder.id);
            }
          } catch (fetchErr: any) {
            console.warn(`[Diagnostics] Razorpay order fetch failed for ${pendingOrder.gateway_order_id}:`, fetchErr?.message || fetchErr);
            // Stale or invalid Razorpay order id; cancel local pending order
            await supabaseAdmin
              .from("orders")
              .update({ status: "CANCELLED" })
              .eq("id", pendingOrder.id);
          }
        } else {
          // Pending order without gateway_order_id; cancel it safely
          await supabaseAdmin
            .from("orders")
            .update({ status: "CANCELLED" })
            .eq("id", pendingOrder.id);
        }
      }

      // If a valid pending order with matching current price exists, reuse it
      if (reusableOrder) {
        return NextResponse.json(
          {
            success: true,
            existing: true,
            razorpay_key_id: razorpayKeyId,
            order: {
              id: reusableOrder.id,
              course_id: reusableOrder.course_id,
              amount: Number(reusableOrder.amount),
              status: reusableOrder.status,
              gateway_order_id: reusableOrder.gateway_order_id,
            },
          },
          { status: 200 }
        );
      }
    }

    // ──────────────────────────────────────────────
    // 7. CREATE NEW PENDING ORDER (AT CURRENT PRICE)
    // ──────────────────────────────────────────────
    const orderId = crypto.randomUUID();
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amount_paise,
        currency: "INR",
        receipt: orderId,
        ...(Object.keys(utmNotes).length > 0 ? { notes: utmNotes } : {}),
      });
    } catch (rzpErr: any) {
      console.error("[Diagnostics] Razorpay order creation failed:", {
        error: rzpErr?.message || String(rzpErr),
        statusCode: rzpErr?.statusCode,
        amount: amount_paise,
        currency: "INR",
        keyIdPrefix: razorpayKeyId?.substring(0, 8),
      });
      return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
    }

    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        id: orderId,
        user_id: user.id,
        course_id: course_id,
        amount: currentCoursePrice,
        status: "PENDING",
        gateway_order_id: rzpOrder.id,
      })
      .select("id, course_id, amount, status, gateway_order_id")
      .single();

    if (insertError || !newOrder) {
      console.error("[Diagnostics] Error creating order in DB:", insertError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
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
  } catch (err: any) {
    console.error("[Diagnostics] Checkout error:", err?.message || err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
