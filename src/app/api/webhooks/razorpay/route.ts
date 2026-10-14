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

    if (
      Buffer.byteLength(expectedSignature) !== Buffer.byteLength(signature) ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature, "utf8"), Buffer.from(signature, "utf8"))
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Only process payment captured, payment failed, or order paid events
    if (event.event !== "payment.captured" && event.event !== "order.paid" && event.event !== "payment.failed") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    let paymentEntity = event.payload.payment?.entity;
    const orderEntity = event.payload.order?.entity;

    // Fallback based on event structure
    if (!paymentEntity && event.event === "payment.captured") {
        paymentEntity = event.payload.payment.entity;
    }

    // An order.paid event without a payment entity is insufficient
    // to fulfill an enrollment. Wait for payment.captured instead.
    if (event.event === "order.paid" && !paymentEntity?.id) {
      return NextResponse.json(
        { status: "awaiting_payment_event" },
        { status: 200 }
      );
    }

    const razorpay_order_id = paymentEntity?.order_id || orderEntity?.id;
    const razorpay_payment_id = paymentEntity?.id;
    const amountPaise = paymentEntity?.amount ?? orderEntity?.amount;
    const currency = paymentEntity?.currency ?? orderEntity?.currency;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: "Missing order or payment ID" },
        { status: 400 }
      );
    }

    if (
      !currency ||
      typeof currency !== "string" ||
      !Number.isFinite(Number(amountPaise)) ||
      Number(amountPaise) <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid payment amount or currency" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Razorpay webhook] Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, course_id, amount, status, gateway_order_id")
      .eq("gateway_order_id", razorpay_order_id)
      .maybeSingle();

    if (orderError) {
      console.error("[Razorpay webhook] Order lookup failed", orderError);
      return NextResponse.json({ error: "Order lookup failed" }, { status: 500 });
    }

    if (!order) {
      // A webhook can arrive before its local order is visible.
      // Retry rather than silently acknowledging an unresolved payment.
      return NextResponse.json({ error: "Local order not found" }, { status: 500 });
    }

    const localAmountPaise = Math.round(Number(order.amount) * 100);

    const { data: existingPayment, error: paymentLookupError } =
      await supabaseAdmin
        .from("payments")
        .select("id, status, order_id")
        .eq("gateway_payment_id", razorpay_payment_id)
        .maybeSingle();

    if (paymentLookupError) {
      console.error("[Razorpay webhook] Payment lookup failed", paymentLookupError);
      return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
    }

    if (existingPayment && existingPayment.order_id !== order.id) {
      console.error("[Razorpay webhook] Payment/order association mismatch");
      return NextResponse.json({ error: "Payment association mismatch" }, { status: 400 });
    }

    // A late failure event must never downgrade a successful payment.
    if (event.event === "payment.failed") {
      if (
        existingPayment &&
        ["SUCCESS", "REFUNDED"].includes(existingPayment.status)
      ) {
        return NextResponse.json(
          { success: true, message: "Existing payment status preserved" },
          { status: 200 }
        );
      }

      if (existingPayment) {
        if (existingPayment.status !== "FAILED") {
          const { data: updatedPayment, error } = await supabaseAdmin
            .from("payments")
            .update({ status: "FAILED" })
            .eq("id", existingPayment.id)
            .in("status", ["PENDING"])
            .select("id, status")
            .maybeSingle();

          if (error) {
            console.error("[Razorpay webhook] Failed to update payment", error);
            return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
          }

          if (!updatedPayment) {
            const { data: currentPayment, error: readError } = await supabaseAdmin
              .from("payments")
              .select("status")
              .eq("id", existingPayment.id)
              .maybeSingle();

            if (readError || !currentPayment) {
              console.error("[Razorpay webhook] Failed payment re-check error:", readError);
              return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
            }

            if (["SUCCESS", "REFUNDED"].includes(currentPayment.status)) {
              return NextResponse.json(
                { success: true, message: "Existing payment status preserved" },
                { status: 200 }
              );
            }

            if (currentPayment.status === "FAILED") {
              return NextResponse.json(
                { success: true, message: "Failed payment recorded" },
                { status: 200 }
              );
            }

            return NextResponse.json({ error: "Payment state conflict" }, { status: 409 });
          }
        }
      } else {
        const { error } = await supabaseAdmin.from("payments").insert({
          order_id: order.id,
          amount: Number(amountPaise) / 100,
          status: "FAILED",
          payment_method: paymentEntity?.method || "unknown",
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: null,
        });

        if (error && error.code !== "23505") {
          console.error("[Razorpay webhook] Failed payment insert failed", error);
          return NextResponse.json({ error: "Payment recording failed" }, { status: 500 });
        }
      }

      return NextResponse.json(
        { success: true, message: "Failed payment recorded" },
        { status: 200 }
      );
    }

    // Only captured payments can grant course access.
    if (
      !["payment.captured", "order.paid"].includes(event.event) ||
      paymentEntity?.status !== "captured"
    ) {
      return NextResponse.json(
        { status: "awaiting_capture" },
        { status: 200 }
      );
    }

    if (existingPayment?.status === "REFUNDED") {
      return NextResponse.json(
        { status: "refunded_payment_not_fulfilled" },
        { status: 200 }
      );
    }

    const actualAmountPaid = Number(amountPaise) / 100;

    const isAmountMismatch = localAmountPaise !== Number(amountPaise);
    const isCurrencyMismatch = currency !== "INR";
    const hasMismatch = isAmountMismatch || isCurrencyMismatch;

    if (hasMismatch) {
      console.error("[Razorpay webhook] Amount or currency mismatch recorded for manual reconciliation", {
        localOrderId: order.id,
        localAmountPaise,
        gatewayAmountPaise: Number(amountPaise),
        currency,
      });

      // Preserve payment evidence without marking it SUCCESS.
      // If payment already exists with SUCCESS, do not overwrite/downgrade history.
      if (!existingPayment) {
        const { error: insertError } = await supabaseAdmin.from("payments").insert({
          order_id: order.id,
          amount: actualAmountPaid,
          status: "FAILED",
          payment_method: paymentEntity?.method || "unknown",
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: null,
        });

        if (insertError && insertError.code !== "23505") {
          console.error("[Razorpay webhook] Failed to record mismatched payment", insertError);
          return NextResponse.json({ error: "Payment recording failed" }, { status: 500 });
        }
      } else if (existingPayment.status !== "SUCCESS" && existingPayment.status !== "REFUNDED") {
        const { error: updateError } = await supabaseAdmin
          .from("payments")
          .update({
            status: "FAILED",
            amount: actualAmountPaid,
            payment_method: paymentEntity?.method || "unknown",
          })
          .eq("id", existingPayment.id)
          .in("status", ["PENDING", "FAILED"]);

        if (updateError) {
          console.error("[Razorpay webhook] Failed to update mismatched payment", updateError);
          return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
        }
      }

      const reason = currency !== "INR" ? "OTHER" : "AMOUNT_MISMATCH";
      const { error: logError } = await supabaseAdmin.from("payment_reconciliation_logs").insert({
        order_id: order.id,
        gateway_payment_id: razorpay_payment_id,
        gateway_order_id: razorpay_order_id,
        expected_amount: order.amount,
        actual_amount: actualAmountPaid,
        currency: currency || "INR",
        reason,
      });

      if (logError) {
        if (logError.code === "23505") {
          const { data: existingLog, error: logReadError } = await supabaseAdmin
            .from("payment_reconciliation_logs")
            .select("order_id, gateway_payment_id")
            .eq("gateway_payment_id", razorpay_payment_id)
            .eq("status", "PENDING")
            .maybeSingle();

          if (
            logReadError ||
            !existingLog ||
            existingLog.order_id !== order.id ||
            existingLog.gateway_payment_id !== razorpay_payment_id
          ) {
            console.error("[Razorpay webhook] Reconciliation log conflict verification failed:", {
              logReadError,
              existingLog,
            });
            return NextResponse.json({ error: "Reconciliation log verification failed" }, { status: 500 });
          }
        } else {
          console.error("[Razorpay webhook] Failed to record reconciliation log", logError);
          return NextResponse.json({ error: "Reconciliation logging failed" }, { status: 500 });
        }
      }

      return NextResponse.json(
        { status: "amount_mismatch_recorded" },
        { status: 200 }
      );
    }

    if (existingPayment) {
      if (existingPayment.status === "REFUNDED") {
        return NextResponse.json(
          { status: "refunded_payment_not_fulfilled" },
          { status: 200 }
        );
      }

      // Recover a previous FAILED/PENDING record when the same payment
      // is subsequently confirmed captured by Razorpay.
      if (existingPayment.status !== "SUCCESS") {
        const { data: updatedPayment, error } = await supabaseAdmin
          .from("payments")
          .update({
            status: "SUCCESS",
            amount: actualAmountPaid,
            payment_method: paymentEntity?.method || "unknown",
          })
          .eq("id", existingPayment.id)
          .in("status", ["PENDING", "FAILED"])
          .select("id, status")
          .maybeSingle();

        if (error) {
          console.error("[Razorpay webhook] Payment recovery failed", error);
          return NextResponse.json({ error: "Payment recovery failed" }, { status: 500 });
        }

        if (!updatedPayment) {
          const { data: currentPayment, error: readError } = await supabaseAdmin
            .from("payments")
            .select("status")
            .eq("id", existingPayment.id)
            .maybeSingle();

          if (readError || !currentPayment) {
            console.error("[Razorpay webhook] Payment status re-check failed:", readError);
            return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
          }

          if (currentPayment.status === "REFUNDED") {
            return NextResponse.json(
              { status: "refunded_payment_not_fulfilled" },
              { status: 200 }
            );
          }

          if (currentPayment.status !== "SUCCESS") {
            console.error("[Razorpay webhook] Payment state conflict:", currentPayment.status);
            return NextResponse.json({ error: "Payment state conflict" }, { status: 409 });
          }
        }
      }
    } else {
      const { error } = await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        amount: actualAmountPaid,
        status: "SUCCESS",
        payment_method: paymentEntity?.method || "unknown",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: null,
      });

      if (error) {
        if (error.code !== "23505") {
          console.error("[Razorpay webhook] Successful payment insert failed", error);
          return NextResponse.json({ error: "Payment recording failed" }, { status: 500 });
        }

        // Resolve a concurrent duplicate insert before fulfilling.
        const { data: duplicate, error: duplicateError } = await supabaseAdmin
          .from("payments")
          .select("id, status, order_id")
          .eq("gateway_payment_id", razorpay_payment_id)
          .maybeSingle();

        if (
          duplicateError ||
          !duplicate ||
          duplicate.order_id !== order.id ||
          duplicate.status !== "SUCCESS"
        ) {
          console.error("[Razorpay webhook] Duplicate payment needs retry", {
            duplicateError,
            duplicateStatus: duplicate?.status,
          });
          return NextResponse.json({ error: "Payment reconciliation required" }, { status: 500 });
        }
      }
    }

    // A captured payment against a cancelled local order needs manual
    // reconciliation rather than automatic enrollment.
    if (order.status === "CANCELLED") {
      console.error("[Razorpay webhook] Captured payment for cancelled order", {
        localOrderId: order.id,
        gatewayPaymentId: razorpay_payment_id,
      });
      const { error: logError } = await supabaseAdmin.from("payment_reconciliation_logs").insert({
        order_id: order.id,
        gateway_payment_id: razorpay_payment_id,
        gateway_order_id: razorpay_order_id,
        expected_amount: order.amount,
        actual_amount: actualAmountPaid,
        currency: paymentEntity?.currency || "INR",
        reason: "CANCELLED_ORDER"
      });

      if (logError) {
        if (logError.code === "23505") {
          const { data: existingLog, error: logReadError } = await supabaseAdmin
            .from("payment_reconciliation_logs")
            .select("order_id, gateway_payment_id")
            .eq("gateway_payment_id", razorpay_payment_id)
            .eq("status", "PENDING")
            .maybeSingle();

          if (
            logReadError ||
            !existingLog ||
            existingLog.order_id !== order.id ||
            existingLog.gateway_payment_id !== razorpay_payment_id
          ) {
            console.error("[Razorpay webhook] Reconciliation log conflict verification failed:", {
              logReadError,
              existingLog,
            });
            return NextResponse.json({ error: "Reconciliation log verification failed" }, { status: 500 });
          }
        } else {
          console.error("[Razorpay webhook] Failed to record reconciliation log", logError);
          return NextResponse.json({ error: "Reconciliation logging failed" }, { status: 500 });
        }
      }
      return NextResponse.json(
        { status: "manual_reconciliation_required" },
        { status: 200 }
      );
    }

    if (order.status !== "COMPLETED") {
      const { data: updatedOrder, error } = await supabaseAdmin
        .from("orders")
        .update({ status: "COMPLETED" })
        .eq("id", order.id)
        .eq("status", "PENDING")
        .select("id, status")
        .maybeSingle();

      if (error) {
        console.error("[Razorpay webhook] Order completion failed", error);
        return NextResponse.json({ error: "Order update failed" }, { status: 500 });
      }

      if (!updatedOrder) {
        // Check if order was concurrently marked CANCELLED or COMPLETED
        const { data: currentOrder, error: checkError } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", order.id)
          .maybeSingle();

        if (checkError || !currentOrder) {
          console.error("[Razorpay webhook] Order lookup failed", checkError);
          return NextResponse.json({ error: "Order lookup failed" }, { status: 500 });
        }

        if (currentOrder.status === "CANCELLED") {
          console.error("[Razorpay webhook] Captured payment for cancelled order (concurrent cancel)", {
            localOrderId: order.id,
            gatewayPaymentId: razorpay_payment_id,
          });
          const { error: logError } = await supabaseAdmin.from("payment_reconciliation_logs").insert({
            order_id: order.id,
            gateway_payment_id: razorpay_payment_id,
            gateway_order_id: razorpay_order_id,
            expected_amount: order.amount,
            actual_amount: actualAmountPaid,
            currency: paymentEntity?.currency || "INR",
            reason: "CANCELLED_ORDER"
          });

          if (logError) {
            if (logError.code === "23505") {
              const { data: existingLog, error: logReadError } = await supabaseAdmin
                .from("payment_reconciliation_logs")
                .select("order_id, gateway_payment_id")
                .eq("gateway_payment_id", razorpay_payment_id)
                .eq("status", "PENDING")
                .maybeSingle();

              if (
                logReadError ||
                !existingLog ||
                existingLog.order_id !== order.id ||
                existingLog.gateway_payment_id !== razorpay_payment_id
              ) {
                console.error("[Razorpay webhook] Reconciliation log conflict verification failed:", {
                  logReadError,
                  existingLog,
                });
                return NextResponse.json({ error: "Reconciliation log verification failed" }, { status: 500 });
              }
            } else {
              console.error("[Razorpay webhook] Failed to record reconciliation log", logError);
              return NextResponse.json({ error: "Reconciliation logging failed" }, { status: 500 });
            }
          }

          return NextResponse.json(
            { status: "manual_reconciliation_required" },
            { status: 200 }
          );
        }

        if (currentOrder.status !== "COMPLETED") {
          console.error("[Razorpay webhook] Unexpected order status", currentOrder.status);
          return NextResponse.json({ error: "Order state conflict" }, { status: 500 });
        }
      }
    }

    // The database unique constraint on (user_id, course_id) makes
    // repeated fulfillment safe. Do not ignore other database failures.
    const { error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .upsert(
        {
          user_id: order.user_id,
          course_id: order.course_id,
        },
        {
          onConflict: "user_id,course_id",
          ignoreDuplicates: true,
        }
      );

    if (enrollmentError) {
      console.error("[Razorpay webhook] Enrollment fulfillment failed", enrollmentError);
      return NextResponse.json({ error: "Enrollment fulfillment failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("Webhook processing error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
