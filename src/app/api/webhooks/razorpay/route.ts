import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    // ──────────────────────────────────────────────
    // 1. WEBHOOK SIGNATURE VERIFICATION
    // ──────────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Only process payment captured, payment failed, or order paid events
    if (event.event !== "payment.captured" && event.event !== "order.paid" && event.event !== "payment.failed") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    let paymentEntity = event.payload.payment?.entity;
    let orderEntity = event.payload.order?.entity;
    
    // Fallback based on event structure
    if (!paymentEntity && event.event === "payment.captured") {
        paymentEntity = event.payload.payment.entity;
    }

    const razorpay_order_id = paymentEntity?.order_id || orderEntity?.id;
    const razorpay_payment_id = paymentEntity?.id;
    const amountPaise = paymentEntity?.amount || orderEntity?.amount;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing order or payment ID in payload" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 2. SERVICE ROLE CLIENT
    // ──────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ──────────────────────────────────────────────
    // 3. VERIFY LOCAL ORDER
    // ──────────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, amount, status, gateway_order_id")
      .eq("gateway_order_id", razorpay_order_id)
      .single();

    if (orderError || !order) {
      // Order might not exist yet if webhook arrives before our DB insertion completes, 
      // but in our flow, DB insertion happens BEFORE Razorpay order creation.
      return NextResponse.json({ status: "ignored", message: "Local order not found" }, { status: 200 });
    }

    // Verify amount matches exactly
    const localAmountPaise = Math.round(Number(order.amount) * 100);
    if (localAmountPaise !== amountPaise) {
      console.error(`Amount mismatch: Local ${localAmountPaise} vs Webhook ${amountPaise}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 4. IDEMPOTENCY CHECKS
    // ──────────────────────────────────────────────
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("gateway_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment || order.status === "COMPLETED") {
      // Create enrollment just in case it was missed during a prior process
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("course_id", order.course_id)
        .single();

      if (!existingEnrollment) {
        await supabaseAdmin.from("enrollments").insert({
          user_id: order.user_id,
          course_id: order.course_id,
        });
      }

      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Order cannot be fulfilled" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 5. FULFILLMENT
    // ──────────────────────────────────────────────
    const paymentMethod = paymentEntity?.method || "unknown";
    const paymentStatus = event.event === "payment.failed" ? "FAILED" : "SUCCESS";

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: order.amount,
      status: paymentStatus,
      payment_method: paymentMethod,
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: null, // Webhook doesn't provide the frontend signature
    });

    if (paymentError) {
      if (paymentError.code === "23505") {
        console.log("Idempotent success: Payment already exists (23505)");
      } else {
        console.error("Failed to create payment record:", paymentError);
        return NextResponse.json({ error: "Failed to process payment record" }, { status: 500 });
      }
    }

    if (paymentStatus === "FAILED") {
      // For failed payments, we just record the payment attempt and stop here.
      // We don't complete the order or enroll the user.
      return NextResponse.json({ success: true, message: "Recorded failed payment" }, { status: 200 });
    }

    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "COMPLETED" })
      .eq("id", order.id);

    if (orderUpdateError) {
      console.error("Failed to update order status:", orderUpdateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    const { error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });

    if (enrollError && enrollError.code !== "23505") { 
      console.error("Failed to create enrollment:", enrollError);
      return NextResponse.json({ error: "Order processed but enrollment failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
