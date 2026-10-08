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

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return NextResponse.json({ error: "Invalid payment fields format" }, { status: 400 });
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

    if (
      Buffer.byteLength(generatedSignature) !== Buffer.byteLength(razorpay_signature) ||
      !crypto.timingSafeEqual(Buffer.from(generatedSignature, "utf8"), Buffer.from(razorpay_signature, "utf8"))
    ) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 3. SERVICE ROLE CLIENT & RAZORPAY INSTANCE
    // ──────────────────────────────────────────────
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      console.error("Missing RAZORPAY_KEY_ID environment variable");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // ──────────────────────────────────────────────
    // 4. VERIFY LOCAL ORDER
    // ──────────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, amount, status, gateway_order_id")
      .eq("gateway_order_id", razorpay_order_id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized order access" }, { status: 403 });
    }

    // ──────────────────────────────────────────────
    // 5. IDEMPOTENCY CHECKS
    // ──────────────────────────────────────────────
    const { data: existingPayment, error: existingPaymentError } =
      await supabaseAdmin
        .from("payments")
        .select("id, status, order_id, amount")
        .eq("gateway_payment_id", razorpay_payment_id)
        .maybeSingle();

    if (existingPaymentError) {
      console.error("[Diagnostics] Payment lookup failed:", existingPaymentError);
      return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
    }

    if (existingPayment && existingPayment.order_id !== order.id) {
      return NextResponse.json(
        { error: "Payment does not belong to this order" },
        { status: 400 }
      );
    }

    if (existingPayment?.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Refunded payment cannot grant enrollment" },
        { status: 409 }
      );
    }

    if (order.status !== "PENDING" && order.status !== "COMPLETED") {
      return NextResponse.json({ error: "Order cannot be fulfilled" }, { status: 400 });
    }

    if (existingPayment?.status === "SUCCESS") {
      // Ensure we don't grant enrollment for a mismatched payment that was
      // logged by the webhook for reconciliation but skipped enrollment.
      if (Number(existingPayment.amount) !== Number(order.amount)) {
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }

      if (order.status !== "COMPLETED") {
        const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
          .from("orders")
          .update({ status: "COMPLETED" })
          .eq("id", order.id)
          .select("id")
          .single();

        if (orderUpdateError || !updatedOrder) {
          console.error("[Diagnostics] Order recovery failed:", orderUpdateError);
          return NextResponse.json({ error: "Order recovery failed" }, { status: 500 });
        }
      }

      const { data: existingEnrollment, error: enrollmentLookupError } =
        await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("user_id", order.user_id)
          .eq("course_id", order.course_id)
          .maybeSingle();

      if (enrollmentLookupError) {
        console.error("[Diagnostics] Enrollment lookup failed:", enrollmentLookupError);
        return NextResponse.json({ error: "Enrollment lookup failed" }, { status: 500 });
      }

      if (!existingEnrollment) {
        const { error: enrollmentInsertError } = await supabaseAdmin
          .from("enrollments")
          .insert({
            user_id: order.user_id,
            course_id: order.course_id,
          });

        if (enrollmentInsertError && enrollmentInsertError.code !== "23505") {
          console.error("[Diagnostics] Enrollment recovery failed:", enrollmentInsertError);
          return NextResponse.json({ error: "Enrollment recovery failed" }, { status: 500 });
        }
      }

      return NextResponse.json(
        { success: true, message: "Already processed" },
        { status: 200 }
      );
    }

    if (order.status === "COMPLETED" && !existingPayment) {
      return NextResponse.json(
        { error: "Completed order needs payment reconciliation" },
        { status: 409 }
      );
    }

    // ──────────────────────────────────────────────
    // 6. AUTHORITATIVE COURSE & AMOUNT VERIFICATION
    // ──────────────────────────────────────────────
    // We verify the payment amount against the order amount (the price at the time of checkout),
    // not the current course price. Otherwise, price changes would break pending checkouts.
    const expectedAmountPaise = Math.round(Number(order.amount) * 100);

    // ──────────────────────────────────────────────
    // 7. RAZORPAY ORDER VERIFICATION
    // ──────────────────────────────────────────────
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    } catch (rzpOrderErr: unknown) {
      console.error("[Diagnostics] Failed to fetch Razorpay order:", rzpOrderErr instanceof Error ? rzpOrderErr.message : rzpOrderErr);
      return NextResponse.json({ error: "Invalid Razorpay order" }, { status: 400 });
    }

    if (!rzpOrder || rzpOrder.id !== razorpay_order_id) {
      return NextResponse.json({ error: "Razorpay order ID mismatch" }, { status: 400 });
    }

    if (rzpOrder.currency !== "INR") {
      console.error(`[Diagnostics] Invalid order currency: ${rzpOrder.currency}`);
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    if (rzpOrder.amount !== expectedAmountPaise) {
      console.error(`[Diagnostics] Order amount mismatch: Razorpay ${rzpOrder.amount} vs expected ${expectedAmountPaise}`);
      return NextResponse.json({ error: "Order amount mismatch" }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 8. RAZORPAY PAYMENT VERIFICATION
    // ──────────────────────────────────────────────
    let rzpPayment;
    try {
      rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (rzpPayErr: unknown) {
      console.error("[Diagnostics] Failed to fetch Razorpay payment:", rzpPayErr instanceof Error ? rzpPayErr.message : rzpPayErr);
      return NextResponse.json({ error: "Invalid Razorpay payment" }, { status: 400 });
    }

    if (!rzpPayment || rzpPayment.id !== razorpay_payment_id) {
      return NextResponse.json({ error: "Razorpay payment ID mismatch" }, { status: 400 });
    }

    if (rzpPayment.order_id !== razorpay_order_id) {
      console.error(`[Diagnostics] Payment order ID mismatch: Payment ${rzpPayment.order_id} vs Order ${razorpay_order_id}`);
      return NextResponse.json({ error: "Payment does not belong to this order" }, { status: 400 });
    }

    if (rzpPayment.currency !== "INR") {
      console.error(`[Diagnostics] Invalid payment currency: ${rzpPayment.currency}`);
      return NextResponse.json({ error: "Invalid payment currency" }, { status: 400 });
    }

    if (rzpPayment.amount !== expectedAmountPaise) {
      console.error(`[Diagnostics] Payment amount mismatch: Razorpay ${rzpPayment.amount} vs expected ${expectedAmountPaise}`);
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    if (rzpPayment.status !== "captured") {
      console.error(`[Diagnostics] Payment status not completed: ${rzpPayment.status}`);
      return NextResponse.json({ error: `Payment not completed. Status: ${rzpPayment.status}` }, { status: 400 });
    }

    // ──────────────────────────────────────────────
    // 9. FULFILLMENT
    // ──────────────────────────────────────────────
    // Recover an existing failed/pending attempt, or create the success record.
    if (existingPayment) {
      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "SUCCESS",
          amount: Number(rzpPayment.amount) / 100,
          payment_method: rzpPayment.method || "razorpay",
          gateway_signature: razorpay_signature,
        })
        .eq("id", existingPayment.id);

      if (paymentUpdateError) {
        console.error("[Diagnostics] Failed to recover payment record:", paymentUpdateError);
        return NextResponse.json({ error: "Failed to recover payment record" }, { status: 500 });
      }
    } else {
      const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        amount: Number(rzpPayment.amount) / 100,
        status: "SUCCESS",
        payment_method: rzpPayment.method || "razorpay",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: razorpay_signature,
      });

      if (paymentError) {
        if (paymentError.code !== "23505") {
          console.error("[Diagnostics] Failed to create payment record:", paymentError);
          return NextResponse.json({ error: "Failed to process payment record" }, { status: 500 });
        }

        // A concurrent webhook/verification may have inserted the row.
        const { data: duplicatePayment, error: duplicateLookupError } =
          await supabaseAdmin
            .from("payments")
            .select("id, status, order_id")
            .eq("gateway_payment_id", razorpay_payment_id)
            .maybeSingle();

        if (
          duplicateLookupError ||
          !duplicatePayment ||
          duplicatePayment.order_id !== order.id ||
          duplicatePayment.status === "REFUNDED"
        ) {
          console.error("[Diagnostics] Duplicate payment needs reconciliation:", {
            duplicateLookupError,
            duplicateStatus: duplicatePayment?.status,
          });
          return NextResponse.json({ error: "Payment reconciliation required" }, { status: 500 });
        }

        if (duplicatePayment.status !== "SUCCESS") {
          const { error: duplicateUpdateError } = await supabaseAdmin
            .from("payments")
            .update({
              status: "SUCCESS",
              amount: Number(rzpPayment.amount) / 100,
              payment_method: rzpPayment.method || "razorpay",
              gateway_signature: razorpay_signature,
            })
            .eq("id", duplicatePayment.id);

          if (duplicateUpdateError) {
            console.error("[Diagnostics] Duplicate payment recovery failed:", duplicateUpdateError);
            return NextResponse.json({ error: "Payment recovery failed" }, { status: 500 });
          }
        }
      }
    }

    // Update order status to COMPLETED
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "COMPLETED" })
      .eq("id", order.id);

    if (orderUpdateError) {
      console.error("[Diagnostics] Failed to update order status:", orderUpdateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // Create enrollment safely (handling unique constraint if already exists)
    const { error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });

    if (enrollError && enrollError.code !== "23505") {
      console.error("[Diagnostics] Failed to create enrollment:", enrollError);
      return NextResponse.json({ error: "Order processed but enrollment failed. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: unknown) {
    console.error("[Diagnostics] Payment verification error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
