import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
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
    // 2. SIGNATURE VERIFICATION
    // ──────────────────────────────────────────────
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      console.error("Missing RAZORPAY_KEY_SECRET environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 3. SERVICE ROLE CLIENT
    // ──────────────────────────────────────────────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ──────────────────────────────────────────────
    // 4. VERIFY LOCAL ORDER
    // ──────────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, amount, status, gateway_order_id")
      .eq("gateway_order_id", razorpay_order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized order access" }, { status: 403 });
    }

    // ──────────────────────────────────────────────
    // 4.5. RAZORPAY AMOUNT VERIFICATION
    // ──────────────────────────────────────────────
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      console.error("Missing RAZORPAY_KEY_ID environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    
    if (rzpOrder.id !== razorpay_order_id) {
      return NextResponse.json({ error: "Razorpay order ID mismatch" }, { status: 400 });
    }

    const localAmountPaise = Math.round(Number(order.amount) * 100);
    if (rzpOrder.amount !== localAmountPaise) {
      console.error(`Amount mismatch: Local ${localAmountPaise} vs Razorpay ${rzpOrder.amount}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 5. IDEMPOTENCY CHECKS
    // ──────────────────────────────────────────────
    // Check if payment record already exists
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("gateway_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment || order.status === "COMPLETED") {
      // Payment already processed (e.g. by webhook)
      // Check if enrollment exists, if not, create it just in case
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", order.course_id)
        .single();

      if (!existingEnrollment) {
        await supabaseAdmin.from("enrollments").insert({
          user_id: user.id,
          course_id: order.course_id,
        });
      }

      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Order cannot be fulfilled" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 6. FULFILLMENT
    // ──────────────────────────────────────────────
    // Create SUCCESS payment record
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: order.amount,
      status: "SUCCESS",
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: razorpay_signature,
    });

    if (paymentError) {
      if (paymentError.code === "23505") {
        // Unique constraint violation on gateway_payment_id.
        // A concurrent request already created this payment record.
        // Treat as idempotent success and proceed to ensure order is completed and enrollment exists.
        console.log("Idempotent success: Payment already exists (23505)");
      } else {
        console.error("Failed to create payment record:", paymentError);
        return NextResponse.json({ error: "Failed to process payment record" }, { status: 500 });
      }
    }

    // Update order status to COMPLETED
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "COMPLETED" })
      .eq("id", order.id);

    if (orderUpdateError) {
      console.error("Failed to update order status:", orderUpdateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // Create enrollment safely (catching uniqueness constraint if it exists)
    const { error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });

    if (enrollError && enrollError.code !== "23505") { // 23505 is unique violation in Postgres
      console.error("Failed to create enrollment:", enrollError);
      // At this point payment is processed, but enrollment failed.
      return NextResponse.json({ error: "Order processed but enrollment failed. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error("Payment verification error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
