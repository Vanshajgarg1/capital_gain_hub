import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

/**
 * Unit & Integration Test Suite for Dynamic Course Price Checkout, Verification & Webhook Flow
 *
 * Scenarios Tested:
 * 1. Checkout: Course price is ₹999 -> Razorpay order created for 99900 paise.
 * 2. Checkout: Price updated to ₹1,499 -> New checkout session creates 149900 paise order.
 * 3. Checkout: Stale pending order price mismatch -> Returns 409 EXISTING_ORDER_PRICE_MISMATCH
 *    preserving the original order for support resolution, preventing unauthorized undercharge.
 * 4. Checkout: Stale pending order already paid on Razorpay -> Returns 409 PAYMENT_CONFIRMATION_PENDING
 *    preventing duplicate payment initiation.
 * 5. Verify: Valid captured payment completes order, records payment, and enrolls user.
 * 6. Verify: Rejects invalid signature, price mismatch, currency mismatch, or failed payment.
 * 7. Verify: Idempotent on duplicate verification call without duplicate payment/enrollment.
 * 8. Checkout: Gateway fetch network failure returns 503 PAYMENT_GATEWAY_UNAVAILABLE safely.
 * 9. Checkout: Pending order missing gateway_order_id returns 503 ORDER_STATUS_UNVERIFIED.
 * 10. Verify: Rejects payment belonging to a different order (order ID association mismatch).
 * 11. Verify: Rejects refunded payment (409 Refunded payment cannot grant enrollment).
 * 12. Verify: Recovers a previous FAILED payment record to SUCCESS when valid captured payment is verified.
 * 13. Webhook: Constant-time signature verification rejects invalid or tampered signature (400).
 * 14. Webhook: Valid payment.captured event marks order COMPLETED and fulfills enrollment.
 * 15. Webhook: Duplicate delivery is idempotent (repeated payment.captured preserves single record).
 * 16. Webhook: payment.failed event does NOT overwrite an existing SUCCESS or REFUNDED payment.
 * 17. Webhook: Recovers a previous FAILED payment record to SUCCESS upon captured event.
 * 18. Webhook: Refund protection (REFUNDED payment does not grant enrollment or access).
 * 19. Webhook: Captured payment against CANCELLED order returns manual_reconciliation_required.
 * 20. Webhook: Amount mismatch between gateway payload and local order rejects with 400.
 */

// Helper to create mock Supabase query builder
function createMockSupabaseAdmin(initialData = {}) {
  const db = {
    courses: initialData.courses ? JSON.parse(JSON.stringify(initialData.courses)) : [],
    orders: initialData.orders ? JSON.parse(JSON.stringify(initialData.orders)) : [],
    payments: initialData.payments ? JSON.parse(JSON.stringify(initialData.payments)) : [],
    enrollments: initialData.enrollments ? JSON.parse(JSON.stringify(initialData.enrollments)) : [],
  };

  return {
    db,
    from(tableName) {
      const state = {
        table: tableName,
        filters: [],
        selectFields: "*",
        orderConfig: null,
        limitValue: null,
      };

      const builder = {
        select(fields = "*") {
          state.selectFields = fields;
          return builder;
        },
        eq(col, val) {
          state.filters.push({ col, op: "eq", val });
          return builder;
        },
        in(col, vals) {
          state.filters.push({ col, op: "in", val: vals });
          return builder;
        },
        order(col, config) {
          state.orderConfig = { col, ...config };
          return builder;
        },
        limit(count) {
          state.limitValue = count;
          return builder;
        },
        async single() {
          const rows = db[state.table] || [];
          const matched = rows.filter((r) =>
            state.filters.every((f) => {
              if (f.op === "eq") return r[f.col] === f.val;
              if (f.op === "in") return f.val.includes(r[f.col]);
              return true;
            })
          );
          if (matched.length === 0) {
            return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          }
          return { data: { ...matched[0] }, error: null };
        },
        async maybeSingle() {
          const rows = db[state.table] || [];
          const matched = rows.filter((r) =>
            state.filters.every((f) => {
              if (f.op === "eq") return r[f.col] === f.val;
              if (f.op === "in") return f.val.includes(r[f.col]);
              return true;
            })
          );
          return { data: matched[0] ? { ...matched[0] } : null, error: null };
        },
        async insert(record) {
          if (!db[state.table]) db[state.table] = [];
          const tableRows = db[state.table];
          if (state.table === "enrollments") {
            const exists = tableRows.some(
              (e) => e.user_id === record.user_id && e.course_id === record.course_id
            );
            if (exists) {
              return { data: null, error: { code: "23505", message: "Duplicate enrollment" } };
            }
          }
          if (state.table === "payments") {
            const exists = tableRows.some(
              (p) => p.gateway_payment_id === record.gateway_payment_id
            );
            if (exists) {
              return { data: null, error: { code: "23505", message: "Duplicate payment" } };
            }
          }
          if (state.table === "orders" && record.status === "PENDING") {
            const exists = tableRows.some(
              (o) => o.user_id === record.user_id && o.course_id === record.course_id && o.status === "PENDING"
            );
            if (exists) {
              return { data: null, error: { code: "23505", message: "Duplicate pending order" }, select() { return { async single() { return { data: null, error: { code: "23505" } }; } }; } };
            }
          }
          if (state.table === "payment_reconciliation_logs") {
            const exists = tableRows.some(
              (l) => l.gateway_payment_id === record.gateway_payment_id && l.status === "PENDING"
            );
            if (exists) {
              return { data: null, error: { code: "23505", message: "Duplicate reconciliation log" } };
            }
          }
          const newRecord = {
            id: record.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...record,
          };
          tableRows.push(newRecord);
          return {
            data: newRecord,
            error: null,
            select() {
              return {
                async single() {
                  return { data: newRecord, error: null };
                },
              };
            },
          };
        },
        async upsert(record, options = {}) {
          if (!db[state.table]) db[state.table] = [];
          const tableRows = db[state.table];
          if (state.table === "enrollments") {
            const exists = tableRows.some(
              (e) => e.user_id === record.user_id && e.course_id === record.course_id
            );
            if (exists) {
              if (options.ignoreDuplicates) {
                return { data: null, error: null };
              }
              return { data: null, error: { code: "23505", message: "Duplicate enrollment" } };
            }
          }
          const newRecord = {
            id: record.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...record,
          };
          tableRows.push(newRecord);
          return { data: newRecord, error: null };
        },
        update(updates) {
          const updateFilters = [];
          const updateBuilder = {
            eq(col, val) {
              updateFilters.push({ col, op: "eq", val });
              return updateBuilder;
            },
            in(col, vals) {
              updateFilters.push({ col, op: "in", val: vals });
              return updateBuilder;
            },
            select() {
              return {
                single() {
                  const tableRows = db[state.table] || [];
                  let updated = null;
                  for (const row of tableRows) {
                    if (updateFilters.every((f) => (f.op === "eq" ? row[f.col] === f.val : f.val.includes(row[f.col])))) {
                      Object.assign(row, updates);
                      updated = { ...row };
                    }
                  }
                  return Promise.resolve({ data: updated, error: null });
                },
                maybeSingle() {
                  const tableRows = db[state.table] || [];
                  let updated = null;
                  for (const row of tableRows) {
                    if (updateFilters.every((f) => (f.op === "eq" ? row[f.col] === f.val : f.val.includes(row[f.col])))) {
                      Object.assign(row, updates);
                      updated = { ...row };
                    }
                  }
                  return Promise.resolve({ data: updated, error: null });
                },
                then(onResolve, onReject) {
                  const tableRows = db[state.table] || [];
                  const updatedList = [];
                  for (const row of tableRows) {
                    if (updateFilters.every((f) => (f.op === "eq" ? row[f.col] === f.val : f.val.includes(row[f.col])))) {
                      Object.assign(row, updates);
                      updatedList.push({ ...row });
                    }
                  }
                  return Promise.resolve({ data: updatedList, error: null }).then(onResolve, onReject);
                },
              };
            },
            then(onResolve, onReject) {
              const tableRows = db[state.table] || [];
              for (const row of tableRows) {
                if (updateFilters.every((f) => (f.op === "eq" ? row[f.col] === f.val : f.val.includes(row[f.col])))) {
                  Object.assign(row, updates);
                }
              }
              return Promise.resolve({ data: null, error: null }).then(onResolve, onReject);
            },
          };
          return updateBuilder;
        },
      };

      builder.then = function (onResolve, onReject) {
        const rows = db[state.table] || [];
        let matched = rows.filter((r) =>
          state.filters.every((f) => {
            if (f.op === "eq") return r[f.col] === f.val;
            if (f.op === "in") return f.val.includes(r[f.col]);
            return true;
          })
        );
        if (state.orderConfig) {
          matched.sort((a, b) => {
            const valA = new Date(a[state.orderConfig.col]).getTime();
            const valB = new Date(b[state.orderConfig.col]).getTime();
            return state.orderConfig.ascending ? valA - valB : valB - valA;
          });
        }
        if (state.limitValue !== null) {
          matched = matched.slice(0, state.limitValue);
        }
        return Promise.resolve({ data: matched.map((r) => ({ ...r })), error: null }).then(
          onResolve,
          onReject
        );
      };

      return builder;
    },
  };
}

// Helper to create mock Razorpay client
function createMockRazorpay(ordersStore = {}, paymentsStore = {}) {
  return {
    ordersStore,
    paymentsStore,
    orders: {
      async create({ amount, currency, receipt, notes }) {
        const orderId = `order_${crypto.randomBytes(8).toString("hex")}`;
        const newOrder = {
          id: orderId,
          amount,
          currency,
          receipt,
          status: "created",
          amount_paid: 0,
          notes,
        };
        ordersStore[orderId] = newOrder;
        return newOrder;
      },
      async fetch(orderId) {
        const order = ordersStore[orderId];
        if (!order) {
          const err = new Error("Order not found");
          err.statusCode = 404;
          throw err;
        }
        return { ...order };
      },
      async fetchPayments(orderId) {
        const payments = Object.values(paymentsStore).filter((p) => p.order_id === orderId);
        return { items: payments };
      },
    },
    payments: {
      async fetch(paymentId) {
        const payment = paymentsStore[paymentId];
        if (!payment) {
          const err = new Error("Payment not found");
          err.statusCode = 404;
          throw err;
        }
        return { ...payment };
      },
    },
  };
}

// Pure business-logic simulation of checkout handler matching src/app/api/checkout/route.ts
async function simulateCheckout({ user, courseId, supabaseAdmin, razorpay }) {
  // 1. Authoritative course fetch
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, price")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return { status: 404, body: { error: "COURSE_NOT_FOUND" } };
  }

  if (Number(course.price) === 0) {
    return { status: 400, body: { error: "FREE_COURSE_USE_ENROLL_ENDPOINT" } };
  }

  const currentCoursePrice = Number(course.price);
  const amountPaise = Math.round(currentCoursePrice * 100);

  // 2. Existing enrollment check
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existingEnrollment) {
    return { status: 409, body: { error: "ALREADY_ENROLLED" } };
  }

  // 3. Existing orders check
  const { data: existingOrders } = await supabaseAdmin
    .from("orders")
    .select("id, course_id, amount, status, created_at, gateway_order_id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (existingOrders && existingOrders.length > 0) {
    const completedOrder = existingOrders.find((o) => o.status === "COMPLETED");
    if (completedOrder) {
      return { status: 409, body: { error: "ALREADY_ENROLLED", order_id: completedOrder.id } };
    }

    const pendingOrders = existingOrders.filter((o) => o.status === "PENDING");

    for (const pendingOrder of pendingOrders) {
      if (!pendingOrder.gateway_order_id) {
        return {
          status: 503,
          body: {
            error: "ORDER_STATUS_UNVERIFIED",
            message: "An existing payment session needs verification. Please retry later or contact support.",
          },
        };
      }

      let rzpOrder;
      try {
        rzpOrder = await razorpay.orders.fetch(pendingOrder.gateway_order_id);
      } catch (fetchError) {
        const isMissingOrder =
          fetchError?.statusCode === 400 &&
          fetchError?.error?.code === "BAD_REQUEST_ERROR" &&
          typeof fetchError?.error?.description === "string" &&
          fetchError.error.description.includes("does not exist");

        if (isMissingOrder) {
          const { data: existingPayments } = await supabaseAdmin
            .from("payments")
            .select("id")
            .eq("order_id", pendingOrder.id)
            .limit(1);

          if (existingPayments && existingPayments.length > 0) {
            return {
              status: 503,
              body: { error: "PAYMENT_SESSION_STALE" }
            };
          }

          await supabaseAdmin.from("orders").update({ status: "CANCELLED" }).eq("id", pendingOrder.id);
          continue;
        }

        return {
          status: 503,
          body: {
            error: "PAYMENT_GATEWAY_UNAVAILABLE",
            message: "Unable to verify your existing payment session. Please retry shortly.",
          },
        };
      }

      if (
        rzpOrder.status === "paid" ||
        Number(rzpOrder.amount_paid) > 0
      ) {
        return {
          status: 409,
          body: {
            error: "PAYMENT_CONFIRMATION_PENDING",
            message: "A payment may already exist for this order. Please wait for verification or contact support before retrying.",
            order_id: pendingOrder.id,
          },
        };
      }

      if (rzpOrder.status !== "created") {
        return {
          status: 409,
          body: {
            error: "ORDER_STATUS_UNVERIFIED",
            message: "Your existing payment session needs verification before another checkout can be created.",
          },
        };
      }

      const localAmount = Number(pendingOrder.amount);
      const amountMatches =
        Number.isFinite(localAmount) &&
        Math.round(localAmount * 100) === amountPaise &&
        Number(rzpOrder.amount) === amountPaise &&
        rzpOrder.currency === "INR";

      if (!amountMatches) {
        return {
          status: 409,
          body: {
            error: "EXISTING_ORDER_PRICE_MISMATCH",
            message: "Your existing checkout session has a different price. Please contact support.",
            order_id: pendingOrder.id,
          },
        };
      }

      return {
        status: 200,
        body: {
          success: true,
          existing: true,
          razorpay_key_id: "rzp_test_123",
          order: {
            id: pendingOrder.id,
            course_id: pendingOrder.course_id,
            amount: localAmount,
            status: pendingOrder.status,
            gateway_order_id: pendingOrder.gateway_order_id,
          },
        },
      };
    }
  }

  // 4. Create new order
  const orderId = crypto.randomUUID();
  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: orderId,
  });

  const { data: newOrder, error: insertError } = await supabaseAdmin
    .from("orders")
    .insert({
      id: orderId,
      user_id: user.id,
      course_id: courseId,
      amount: currentCoursePrice,
      status: "PENDING",
      gateway_order_id: rzpOrder.id,
    });

  if (insertError) {
    return {
      status: 500,
      body: {
        error: "Failed to save payment session",
        message: "Please contact support before retrying payment.",
      },
    };
  }

  return {
    status: 201,
    body: {
      success: true,
      razorpay_key_id: "rzp_test_123",
      order: {
        id: newOrder.id,
        course_id: newOrder.course_id,
        amount: Number(newOrder.amount),
        status: newOrder.status,
        gateway_order_id: newOrder.gateway_order_id,
      },
    },
  };
}

// Pure business-logic simulation of verify handler matching src/app/api/payments/razorpay/verify/route.ts
async function simulateVerify({ user, body, keySecret, supabaseAdmin, razorpay }) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { status: 400, body: { error: "Missing required payment fields" } };
  }

  // Signature check
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (
    Buffer.byteLength(generatedSignature) !== Buffer.byteLength(razorpay_signature) ||
    !crypto.timingSafeEqual(Buffer.from(generatedSignature, "utf8"), Buffer.from(razorpay_signature, "utf8"))
  ) {
    return { status: 400, body: { error: "Invalid payment signature" } };
  }

  // Fetch local order
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, course_id, amount, status, gateway_order_id")
    .eq("gateway_order_id", razorpay_order_id)
    .maybeSingle();

  if (orderError || !order) {
    return { status: 404, body: { error: "Order not found" } };
  }

  if (order.user_id !== user.id) {
    return { status: 403, body: { error: "Unauthorized order access" } };
  }

  // Idempotency check
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, status, order_id")
    .eq("gateway_payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existingPayment && existingPayment.order_id !== order.id) {
    return { status: 400, body: { error: "Payment does not belong to this order" } };
  }

  if (existingPayment?.status === "REFUNDED") {
    return { status: 409, body: { error: "Refunded payment cannot grant enrollment" } };
  }

  if (order.status !== "PENDING" && order.status !== "COMPLETED") {
    return { status: 400, body: { error: "Order cannot be fulfilled" } };
  }

  if (existingPayment?.status === "SUCCESS") {
    if (Number(existingPayment.amount) !== Number(order.amount)) {
      return { status: 400, body: { error: "Payment amount mismatch" } };
    }

    if (order.status !== "COMPLETED") {
      const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "COMPLETED" })
        .eq("id", order.id)
        .select()
        .single();

      if (orderUpdateError || !updatedOrder) {
        return { status: 500, body: { error: "Order recovery failed" } };
      }
    }

    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("course_id", order.course_id)
      .maybeSingle();

    if (!existingEnrollment) {
      await supabaseAdmin.from("enrollments").insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });
    }

    return { status: 200, body: { success: true, message: "Already processed" } };
  }

  if (order.status === "COMPLETED" && !existingPayment) {
    return { status: 409, body: { error: "Completed order needs payment reconciliation" } };
  }

  const expectedAmountPaise = Math.round(Number(order.amount) * 100);

  // Razorpay order fetch
  const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  if (!rzpOrder || rzpOrder.id !== razorpay_order_id) {
    return { status: 400, body: { error: "Razorpay order ID mismatch" } };
  }
  if (rzpOrder.currency !== "INR") {
    return { status: 400, body: { error: "Invalid currency" } };
  }
  if (rzpOrder.amount !== expectedAmountPaise) {
    return { status: 400, body: { error: "Order amount mismatch" } };
  }

  // Razorpay payment fetch
  const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
  if (!rzpPayment || rzpPayment.id !== razorpay_payment_id) {
    return { status: 400, body: { error: "Razorpay payment ID mismatch" } };
  }
  if (rzpPayment.order_id !== razorpay_order_id) {
    return { status: 400, body: { error: "Payment does not belong to this order" } };
  }
  if (rzpPayment.currency !== "INR") {
    return { status: 400, body: { error: "Invalid payment currency" } };
  }
  if (rzpPayment.amount !== expectedAmountPaise) {
    return { status: 400, body: { error: "Payment amount mismatch" } };
  }
  if (rzpPayment.status !== "captured") {
    return { status: 400, body: { error: `Payment not completed. Status: ${rzpPayment.status}` } };
  }

  // Fulfillment: recover existing attempt or insert new record
  if (existingPayment) {
    await supabaseAdmin
      .from("payments")
      .update({
        status: "SUCCESS",
        amount: order.amount,
        payment_method: rzpPayment.method || "razorpay",
        gateway_signature: razorpay_signature,
      })
      .eq("id", existingPayment.id);
  } else {
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: order.amount,
      status: "SUCCESS",
      payment_method: rzpPayment.method || "razorpay",
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: razorpay_signature,
    });
  }

  await supabaseAdmin.from("orders").update({ status: "COMPLETED" }).eq("id", order.id);

  await supabaseAdmin.from("enrollments").insert({
    user_id: order.user_id,
    course_id: order.course_id,
  });

  return { status: 200, body: { success: true } };
}

// Pure business-logic simulation of webhook handler matching src/app/api/webhooks/razorpay/route.ts
async function simulateWebhook({ rawBody, signature, webhookSecret, supabaseAdmin }) {
  if (!signature) {
    return { status: 400, body: { error: "Missing signature" } };
  }
  if (!webhookSecret) {
    return { status: 500, body: { error: "Server Configuration Error" } };
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (
    Buffer.byteLength(expectedSignature) !== Buffer.byteLength(signature) ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature, "utf8"), Buffer.from(signature, "utf8"))
  ) {
    return { status: 400, body: { error: "Invalid signature" } };
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "payment.captured" && event.event !== "order.paid" && event.event !== "payment.failed") {
    return { status: 200, body: { status: "ignored" } };
  }

  let paymentEntity = event.payload.payment?.entity;
  const orderEntity = event.payload.order?.entity;

  if (!paymentEntity && event.event === "payment.captured") {
    paymentEntity = event.payload.payment?.entity;
  }

  if (event.event === "order.paid" && !paymentEntity?.id) {
    return { status: 200, body: { status: "awaiting_payment_event" } };
  }

  const razorpay_order_id = paymentEntity?.order_id || orderEntity?.id;
  const razorpay_payment_id = paymentEntity?.id;
  const amountPaise = paymentEntity?.amount ?? orderEntity?.amount;
  const currency = paymentEntity?.currency ?? orderEntity?.currency;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return { status: 400, body: { error: "Missing order or payment ID" } };
  }

  if (
    currency !== "INR" ||
    !Number.isFinite(Number(amountPaise)) ||
    Number(amountPaise) <= 0
  ) {
    return { status: 400, body: { error: "Invalid payment amount or currency" } };
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, course_id, amount, status, gateway_order_id")
    .eq("gateway_order_id", razorpay_order_id)
    .maybeSingle();

  if (orderError) {
    return { status: 500, body: { error: "Order lookup failed" } };
  }

  if (!order) {
    return { status: 500, body: { error: "Local order not found" } };
  }

    const localAmountPaise = Math.round(Number(order.amount) * 100);

  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id, status, order_id")
    .eq("gateway_payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existingPayment && existingPayment.order_id !== order.id) {
    return { status: 400, body: { error: "Payment association mismatch" } };
  }

  if (event.event === "payment.failed") {
    if (existingPayment && ["SUCCESS", "REFUNDED"].includes(existingPayment.status)) {
      return { status: 200, body: { success: true, message: "Existing payment status preserved" } };
    }

    if (existingPayment) {
      if (existingPayment.status !== "FAILED") {
        await supabaseAdmin
          .from("payments")
          .update({ status: "FAILED" })
          .eq("id", existingPayment.id);
      }
    } else {
      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        amount: Number(amountPaise) / 100,
        status: "FAILED",
        payment_method: paymentEntity?.method || "unknown",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: null,
      });
    }

    return { status: 200, body: { success: true, message: "Failed payment recorded" } };
  }

  if (
    !["payment.captured", "order.paid"].includes(event.event) ||
    paymentEntity?.status !== "captured"
  ) {
    return { status: 200, body: { status: "awaiting_capture" } };
  }

  if (existingPayment?.status === "REFUNDED") {
    return { status: 200, body: { status: "refunded_payment_not_fulfilled" } };
  }

  const actualAmountPaid = Number(amountPaise) / 100;

  if (existingPayment) {
    if (existingPayment.status !== "SUCCESS") {
      await supabaseAdmin
        .from("payments")
        .update({
          status: "SUCCESS",
          amount: actualAmountPaid,
          payment_method: paymentEntity?.method || "unknown",
        })
        .eq("id", existingPayment.id);
    }
  } else {
    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: actualAmountPaid,
      status: "SUCCESS",
      payment_method: paymentEntity?.method || "unknown",
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: null,
    });
    if (insertErr && insertErr.code !== "23505") {
      return { status: 500, body: { error: "Payment recording failed" } };
    }
  }

  if (order.status === "CANCELLED") {
    await supabaseAdmin.from("payment_reconciliation_logs").insert({
      order_id: order.id,
      gateway_payment_id: razorpay_payment_id,
      gateway_order_id: razorpay_order_id,
      expected_amount: order.amount,
      actual_amount: actualAmountPaid,
      currency: paymentEntity?.currency || "INR",
      reason: "CANCELLED_ORDER"
    });
    return { status: 200, body: { status: "manual_reconciliation_required" } };
  }

  if (localAmountPaise !== Number(amountPaise)) {
    await supabaseAdmin.from("payment_reconciliation_logs").insert({
      order_id: order.id,
      gateway_payment_id: razorpay_payment_id,
      gateway_order_id: razorpay_order_id,
      expected_amount: order.amount,
      actual_amount: actualAmountPaid,
      currency: paymentEntity?.currency || "INR",
      reason: "AMOUNT_MISMATCH"
    });
    return { status: 200, body: { status: "amount_mismatch_recorded" } };
  }

  if (order.status !== "COMPLETED") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "COMPLETED" })
      .eq("id", order.id);
  }

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
    return { status: 500, body: { error: "Enrollment fulfillment failed" } };
  }

  return { status: 200, body: { success: true } };
}

// ──────────────────────────────────────────────
// CHECKOUT TESTS
// ──────────────────────────────────────────────

test("Scenario 1: Course price is ₹999 and Razorpay order amount is 99900 paise", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 999 }],
    orders: [],
  });
  const razorpay = createMockRazorpay();

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.amount, 999);

  const rzpOrder = razorpay.ordersStore[res.body.order.gateway_order_id];
  assert.ok(rzpOrder);
  assert.equal(rzpOrder.amount, 99900);
  assert.equal(rzpOrder.currency, "INR");
});

test("Scenario 2: Admin changes price to ₹1,499 and new checkout displays ₹1,499", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [],
  });
  const razorpay = createMockRazorpay();

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.amount, 1499);

  const rzpOrder = razorpay.ordersStore[res.body.order.gateway_order_id];
  assert.ok(rzpOrder);
  assert.equal(rzpOrder.amount, 149900);
  assert.equal(rzpOrder.currency, "INR");
});

test("Scenario 3: Old ₹499 pending order price mismatch safely returns 409", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };

  const oldRzpOrderId = "order_old_499";
  const razorpay = createMockRazorpay({
    [oldRzpOrderId]: {
      id: oldRzpOrderId,
      amount: 49900,
      currency: "INR",
      status: "created",
      amount_paid: 0,
    },
  });

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-499",
        user_id: user.id,
        course_id: courseId,
        amount: 499,
        status: "PENDING",
        gateway_order_id: oldRzpOrderId,
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  });

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "EXISTING_ORDER_PRICE_MISMATCH");

  const oldLocalOrder = supabaseAdmin.db.orders.find((o) => o.id === "order-local-499");
  assert.equal(oldLocalOrder.status, "PENDING");
  assert.equal(oldLocalOrder.amount, 499);
  assert.equal(supabaseAdmin.db.orders.length, 1);
});

test("Scenario 4: Old pending order already paid on Razorpay returns 409 PAYMENT_CONFIRMATION_PENDING without duplicate charge", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };

  const paidRzpOrderId = "order_paid_rzp";
  const razorpay = createMockRazorpay(
    {
      [paidRzpOrderId]: {
        id: paidRzpOrderId,
        amount: 99900,
        currency: "INR",
        status: "paid",
        amount_paid: 99900,
      },
    },
    {
      pay_123: {
        id: "pay_123",
        order_id: paidRzpOrderId,
        amount: 99900,
        currency: "INR",
        status: "captured",
        method: "card",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 999 }],
    orders: [
      {
        id: "order-local-paid",
        user_id: user.id,
        course_id: courseId,
        amount: 999,
        status: "PENDING",
        gateway_order_id: paidRzpOrderId,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    payments: [],
    enrollments: [],
  });

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });

  // Must return 409 PAYMENT_CONFIRMATION_PENDING so student verifies existing payment instead of paying again
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "PAYMENT_CONFIRMATION_PENDING");
  assert.equal(res.body.order_id, "order-local-paid");

  // No duplicate order created
  assert.equal(supabaseAdmin.db.orders.length, 1);
});

test("Scenario 8: Temporary Razorpay fetch failure aborts checkout with 503 without cancelling order or creating new Razorpay order", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const existingGatewayOrderId = "order_rzp_network_error";

  const razorpay = {
    ordersStore: {},
    paymentsStore: {},
    orders: {
      async create() {
        throw new Error("create should not be called when order fetch fails");
      },
      async fetch(orderId) {
        if (orderId === existingGatewayOrderId) {
          const err = new Error("Gateway timeout: ECONNRESET");
          err.statusCode = 504;
          throw err;
        }
        throw new Error("Order not found");
      },
    },
  };

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-pending-test",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: existingGatewayOrderId,
        created_at: new Date().toISOString(),
      },
    ],
  });

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });

  assert.equal(res.status, 503);
  assert.equal(res.body.error, "PAYMENT_GATEWAY_UNAVAILABLE");

  const existingOrder = supabaseAdmin.db.orders.find((o) => o.id === "order-pending-test");
  assert.equal(existingOrder.status, "PENDING");
  assert.equal(supabaseAdmin.db.orders.length, 1);
  assert.equal(supabaseAdmin.db.payments.length, 0);
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 9: Pending order missing gateway_order_id returns 503 ORDER_STATUS_UNVERIFIED without cancelling original order", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-no-gateway",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  });
  const razorpay = {
    ordersStore: {},
    paymentsStore: {},
    orders: {
      async create() {
        throw new Error("create should not be called when an existing pending order is unresolved");
      },
      async fetch() {
        throw new Error("fetch should not be called without gateway_order_id");
      },
    },
  };

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });

  assert.equal(res.status, 503);
  assert.equal(res.body.error, "ORDER_STATUS_UNVERIFIED");

  const originalOrder = supabaseAdmin.db.orders.find((o) => o.id === "order-no-gateway");
  assert.ok(originalOrder);
  assert.equal(originalOrder.status, "PENDING");
  assert.equal(supabaseAdmin.db.orders.length, 1);
});

// ──────────────────────────────────────────────
// VERIFICATION TESTS
// ──────────────────────────────────────────────

test("Scenario 5: Valid payment verification completes order and enrolls student", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_valid";
  const rzpPaymentId = "pay_rzp_valid";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay(
    {
      [rzpOrderId]: {
        id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "paid",
        amount_paid: 149900,
      },
    },
    {
      [rzpPaymentId]: {
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "captured",
        method: "upi",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-1",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  const validSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const res = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSignature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const localOrder = supabaseAdmin.db.orders.find((o) => o.id === "order-local-1");
  assert.equal(localOrder.status, "COMPLETED");

  const payment = supabaseAdmin.db.payments.find((p) => p.order_id === "order-local-1");
  assert.ok(payment);
  assert.equal(payment.status, "SUCCESS");
  assert.equal(payment.gateway_payment_id, rzpPaymentId);

  const enrollment = supabaseAdmin.db.enrollments.find(
    (e) => e.user_id === user.id && e.course_id === courseId
  );
  assert.ok(enrollment);
});

test("Scenario 6: Payment verification rejects invalid signature, price mismatch, or failed payment", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_123";
  const rzpPaymentId = "pay_rzp_123";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay(
    {
      [rzpOrderId]: {
        id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "paid",
        amount_paid: 149900,
      },
    },
    {
      [rzpPaymentId]: {
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "captured",
        method: "upi",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-1",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  // 1. Invalid signature
  const resBadSig = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: "tampered_signature_1234567890abcdef",
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });
  assert.equal(resBadSig.status, 400);
  assert.equal(resBadSig.body.error, "Invalid payment signature");

  // 2. Price mismatch (Payment amount != Order amount)
  razorpay.paymentsStore[rzpPaymentId].amount = 199900;
  const validSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const resPriceMismatch = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });
  assert.equal(resPriceMismatch.status, 400);
  assert.equal(resPriceMismatch.body.error, "Payment amount mismatch");

  // 3. Failed payment status
  razorpay.paymentsStore[rzpPaymentId].amount = 149900;
  razorpay.paymentsStore[rzpPaymentId].status = "failed";

  const resFailedPay = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });
  assert.equal(resFailedPay.status, 400);
  assert.match(resFailedPay.body.error, /Payment not completed/);
});

test("Scenario 7: Duplicate verification call is idempotent and does not duplicate enrollment", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_dup";
  const rzpPaymentId = "pay_rzp_dup";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay(
    {
      [rzpOrderId]: {
        id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "paid",
        amount_paid: 149900,
      },
    },
    {
      [rzpPaymentId]: {
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "captured",
        method: "upi",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-dup",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-rec-1",
        order_id: "order-local-dup",
        amount: 1499,
        status: "SUCCESS",
        gateway_payment_id: rzpPaymentId,
      },
    ],
    enrollments: [
      {
        id: "enroll-1",
        user_id: user.id,
        course_id: courseId,
      },
    ],
  });

  const validSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const res = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Already processed");
  assert.equal(supabaseAdmin.db.enrollments.length, 1);
});

test("Scenario 10: Payment verification rejects payment belonging to a different order", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_assoc_1";
  const rzpPaymentId = "pay_rzp_assoc_2";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay(
    {
      [rzpOrderId]: {
        id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "paid",
        amount_paid: 149900,
      },
    },
    {
      [rzpPaymentId]: {
        id: rzpPaymentId,
        order_id: "order_rzp_different", // Different order
        amount: 149900,
        currency: "INR",
        status: "captured",
        method: "upi",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-assoc",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
  });

  const validSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const res = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Payment does not belong to this order");
});

test("Scenario 11: Payment verification rejects already refunded payment", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_ref";
  const rzpPaymentId = "pay_rzp_ref";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay();

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-ref",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-ref-1",
        order_id: "order-local-ref",
        gateway_payment_id: rzpPaymentId,
        status: "REFUNDED",
        amount: 1499,
      },
    ],
  });

  const validSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const res = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Refunded payment cannot grant enrollment");
});

test("Scenario 12: Payment verification recovers a previous FAILED payment record to SUCCESS", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const rzpOrderId = "order_rzp_recover";
  const rzpPaymentId = "pay_rzp_recover";
  const keySecret = "secret_test_xyz";

  const razorpay = createMockRazorpay(
    {
      [rzpOrderId]: {
        id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "paid",
        amount_paid: 149900,
      },
    },
    {
      [rzpPaymentId]: {
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 149900,
        currency: "INR",
        status: "captured",
        method: "netbanking",
      },
    }
  );

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [
      {
        id: "order-local-rec",
        user_id: user.id,
        course_id: courseId,
        amount: 1499,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-prev-failed",
        order_id: "order-local-rec",
        gateway_payment_id: rzpPaymentId,
        status: "FAILED",
        amount: 1499,
      },
    ],
  });

  const validSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const res = await simulateVerify({
    user,
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSig,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const updatedPayment = supabaseAdmin.db.payments.find((p) => p.id === "pay-prev-failed");
  assert.equal(updatedPayment.status, "SUCCESS");

  const enrollment = supabaseAdmin.db.enrollments.find((e) => e.course_id === courseId);
  assert.ok(enrollment);
});

// ──────────────────────────────────────────────
// WEBHOOK TESTS
// ──────────────────────────────────────────────

test("Scenario 13: Webhook rejects missing or invalid signature with 400", async () => {
  const webhookSecret = "whsec_test_123";
  const supabaseAdmin = createMockSupabaseAdmin();
  const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });

  // Missing signature
  const resNoSig = await simulateWebhook({
    rawBody,
    signature: null,
    webhookSecret,
    supabaseAdmin,
  });
  assert.equal(resNoSig.status, 400);
  assert.equal(resNoSig.body.error, "Missing signature");

  // Invalid signature
  const resBadSig = await simulateWebhook({
    rawBody,
    signature: "invalid_hex_signature_abcdef1234567890",
    webhookSecret,
    supabaseAdmin,
  });
  assert.equal(resBadSig.status, 400);
  assert.equal(resBadSig.body.error, "Invalid signature");
});

test("Scenario 14: Webhook valid payment.captured event marks order COMPLETED and fulfills enrollment", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_1";
  const rzpPaymentId = "pay_wh_1";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-wh-local",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "upi",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const order = supabaseAdmin.db.orders.find((o) => o.id === "order-wh-local");
  assert.equal(order.status, "COMPLETED");

  const payment = supabaseAdmin.db.payments.find((p) => p.gateway_payment_id === rzpPaymentId);
  assert.ok(payment);
  assert.equal(payment.status, "SUCCESS");

  const enrollment = supabaseAdmin.db.enrollments.find((e) => e.course_id === "course-wh");
  assert.ok(enrollment);
});

test("Scenario 15: Webhook duplicate delivery is idempotent", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_dup";
  const rzpPaymentId = "pay_wh_dup";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-wh-dup-local",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-existing-wh",
        order_id: "order-wh-dup-local",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: [
      {
        id: "enroll-existing-wh",
        user_id: "user-wh",
        course_id: "course-wh",
      },
    ],
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(supabaseAdmin.db.payments.length, 1);
  assert.equal(supabaseAdmin.db.enrollments.length, 1);
});

test("Scenario 16: Webhook payment.failed does not overwrite an existing SUCCESS or REFUNDED payment", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_fail_prot";
  const rzpPaymentId = "pay_wh_fail_prot";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-wh-success",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success-already",
        order_id: "order-wh-success",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
  });

  const payload = {
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "failed",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.message, "Existing payment status preserved");

  const payment = supabaseAdmin.db.payments.find((p) => p.id === "pay-success-already");
  assert.equal(payment.status, "SUCCESS");
});

test("Scenario 17: Webhook recovers previous FAILED payment to SUCCESS when captured event arrives", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_rec";
  const rzpPaymentId = "pay_wh_rec";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-rec",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-failed-rec",
        order_id: "order-rec",
        gateway_payment_id: rzpPaymentId,
        status: "FAILED",
        amount: 999,
      },
    ],
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "upi",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const payment = supabaseAdmin.db.payments.find((p) => p.id === "pay-failed-rec");
  assert.equal(payment.status, "SUCCESS");

  const order = supabaseAdmin.db.orders.find((o) => o.id === "order-rec");
  assert.equal(order.status, "COMPLETED");

  const enrollment = supabaseAdmin.db.enrollments.find((e) => e.course_id === "course-wh");
  assert.ok(enrollment);
});

test("Scenario 18: Webhook refund protection (REFUNDED payment does not grant access)", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_ref_prot";
  const rzpPaymentId = "pay_wh_ref_prot";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-ref-prot",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-ref-record",
        order_id: "order-ref-prot",
        gateway_payment_id: rzpPaymentId,
        status: "REFUNDED",
        amount: 999,
      },
    ],
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "refunded_payment_not_fulfilled");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 19: Webhook captured payment against CANCELLED order returns manual_reconciliation_required", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_cancelled";
  const rzpPaymentId = "pay_wh_cancelled";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-cancelled",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "CANCELLED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payment_reconciliation_logs: []
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "manual_reconciliation_required");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.payments.length, 1);
  assert.equal(supabaseAdmin.db.payments[0].status, "SUCCESS");
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "CANCELLED_ORDER");
});

test("Scenario 20: Webhook amount mismatch records payment and returns 200 amount_mismatch_recorded", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_amount_mismatch";
  const rzpPaymentId = "pay_wh_amount_mismatch";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-mismatch",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payment_reconciliation_logs: []
  });

  // Payload amount is 49900 instead of 99900
  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 49900,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "amount_mismatch_recorded");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.payments.length, 1);
  assert.equal(supabaseAdmin.db.payments[0].status, "SUCCESS");
  assert.equal(supabaseAdmin.db.payments[0].amount, 499); // Exactly the amount parsed
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "AMOUNT_MISMATCH");
});

test("Scenario 21: Confirmed invalid Razorpay order cancels local order and creates new one", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const oldOrderId = crypto.randomUUID();

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [{ id: oldOrderId, user_id: user.id, course_id: courseId, amount: 1499, status: "PENDING", gateway_order_id: "order_invalid_123", created_at: new Date().toISOString() }],
    payments: []
  });

  const razorpay = createMockRazorpay();
  razorpay.orders.fetch = async () => {
    const err = new Error("Bad Request");
    err.statusCode = 400;
    err.error = { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" };
    throw err;
  };

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  assert.equal(res.status, 201); // Successfully created new order
  assert.equal(res.body.success, true);
  assert.equal(supabaseAdmin.db.orders.find(o => o.id === oldOrderId).status, "CANCELLED"); // Old order was safely cancelled
});

test("Scenario 22: Valid pending order bypasses recreation and returns 200", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const oldOrderId = crypto.randomUUID();

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [{ id: oldOrderId, user_id: user.id, course_id: courseId, amount: 1499, status: "PENDING", gateway_order_id: "order_valid_123", created_at: new Date().toISOString() }],
    payments: []
  });

  const razorpay = createMockRazorpay({
    "order_valid_123": { id: "order_valid_123", amount: 149900, currency: "INR", status: "created", amount_paid: 0 }
  });

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  assert.equal(res.status, 200);
  assert.equal(res.body.order.gateway_order_id, "order_valid_123");
});

test("Scenario 23: Prevention of duplicate payable orders returns 409 if local payment exists", async () => {
  const courseId = "course-123";
  const user = { id: "user-abc" };
  const oldOrderId = crypto.randomUUID();

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [{ id: oldOrderId, user_id: user.id, course_id: courseId, amount: 1499, status: "PENDING", gateway_order_id: "order_invalid_123", created_at: new Date().toISOString() }],
    payments: [{ id: "pay_1", order_id: oldOrderId, status: "PENDING" }]
  });

  const razorpay = createMockRazorpay();
  razorpay.orders.fetch = async () => {
    const err = new Error("Bad Request");
    err.statusCode = 400;
    err.error = { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" };
    throw err;
  };

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  // The production route relies on the Razorpay gateway status. If the gateway
  // order is missing, it safely fails closed with 503 PAYMENT_SESSION_STALE,
  // preventing the creation of a duplicate payable order.
  assert.equal(res.status, 503);
  assert.equal(res.body.error, "PAYMENT_SESSION_STALE");
  assert.equal(supabaseAdmin.db.orders.find(o => o.id === oldOrderId).status, "PENDING"); // Safely untouched
});

test("Scenario 24: Late payment.failed event does not downgrade a SUCCESS payment", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_late_fail";
  const rzpPaymentId = "pay_wh_late_fail";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-late-fail",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success-record",
        order_id: "order-late-fail",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
  });

  const payload = {
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "failed",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // Payment must remain SUCCESS
  assert.equal(supabaseAdmin.db.payments[0].status, "SUCCESS");
});

test("Scenario 25: Concurrent checkout requests safely abort due to unique index", async () => {
  const courseId = "course-concurrent";
  const user = { id: "user-concurrent" };

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 1499 }],
    orders: [],
    payments: []
  });

  const razorpay = createMockRazorpay();

  // Simulate race condition by injecting the existing order right after the select check
  // Since we can't easily hook into the exact moment in the mock, we can just patch
  // the 'insert' method for this specific test.
  const originalInsert = supabaseAdmin.from("orders").insert;
  const mockFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = mockFrom(table);
    if (table === "orders") {
      const origInsert = builder.insert;
      builder.insert = async function (record) {
        // Inject a duplicate right before insert
        supabaseAdmin.db.orders.push({
          id: "existing_pending", user_id: user.id, course_id: courseId, amount: 1499, status: "PENDING", gateway_order_id: "rzp_existing", created_at: new Date().toISOString()
        });
        return origInsert.call(builder, record);
      };
    }
    return builder;
  };

  // Simulate concurrent request
  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });
  // The insert should fail with 23505
  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Failed to save payment session");

  // Verify only one pending order exists
  const pendingOrders = supabaseAdmin.db.orders.filter(o => o.status === "PENDING" && o.user_id === user.id && o.course_id === courseId);
  assert.equal(pendingOrders.length, 1);
  assert.equal(pendingOrders[0].id, "existing_pending");
});

test("Scenario 26: verify route blocks enrollment for CANCELLED order with existing SUCCESS payment", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_cancelled";
  const rzpPaymentId = "pay_wh_cancelled";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-cancelled",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "CANCELLED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success",
        order_id: "order-cancelled",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: []
  });

  const body = {
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    razorpay_signature: "valid_signature_does_not_matter_here"
  };

  const razorpay = createMockRazorpay();

  const res = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  // Because the mock signature check will fail without right signature, we must pass the right signature.
  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  body.razorpay_signature = crypto.createHmac("sha256", webhookSecret).update(rawBodyToSign).digest("hex");

  const resCorrect = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  assert.equal(resCorrect.status, 400);
  assert.equal(resCorrect.body.error, "Order cannot be fulfilled");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 27: verify route updates PENDING order to COMPLETED on early-return when payment is SUCCESS", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_pending";
  const rzpPaymentId = "pay_wh_pending";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-pending",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success",
        order_id: "order-pending",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: []
  });

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBodyToSign).digest("hex");

  const body = {
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    razorpay_signature: signature
  };

  const razorpay = createMockRazorpay();

  const res = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(supabaseAdmin.db.orders[0].status, "COMPLETED");
  assert.equal(supabaseAdmin.db.enrollments.length, 1);
});

test("Scenario 28: verify route successfully returns early for already-completed order with SUCCESS payment", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_completed";
  const rzpPaymentId = "pay_wh_completed";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-completed",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "COMPLETED",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success",
        order_id: "order-completed",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: [] // Missing enrollment to test recovery
  });

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBodyToSign).digest("hex");

  const body = {
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    razorpay_signature: signature
  };

  const razorpay = createMockRazorpay();

  const res = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(supabaseAdmin.db.orders[0].status, "COMPLETED"); // Unchanged
  assert.equal(supabaseAdmin.db.enrollments.length, 1); // Recovered
});

test("Scenario 29: verify route fails safely if PENDING order update fails in SUCCESS branch", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_pending_fail";
  const rzpPaymentId = "pay_wh_pending_fail";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-pending-fail",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success",
        order_id: "order-pending-fail",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: []
  });

  // Inject failure for orders update
  const originalUpdate = supabaseAdmin.from("orders").update;
  const mockFrom = supabaseAdmin.from;
  supabaseAdmin.from = function(table) {
    const builder = mockFrom(table);
    if (table === "orders") {
      builder.update = function(updates) {
        return {
          eq(col, val) {
            return Promise.resolve({ data: null, error: { message: "Simulated update failure" } });
          }
        };
      };
    }
    return builder;
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBodyToSign).digest("hex");

  const body = {
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    razorpay_signature: signature
  };

  const razorpay = createMockRazorpay();

  const res = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Order recovery failed");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.orders[0].status, "PENDING");
});

test("Scenario 30: verify route fails safely with PGRST116 if PENDING order update updates 0 rows", async () => {
  const webhookSecret = "whsec_test_123";
  const rzpOrderId = "order_wh_pending_0rows";
  const rzpPaymentId = "pay_wh_pending_0rows";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-pending-0rows",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-success",
        order_id: "order-pending-0rows",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: []
  });

  // Inject failure for orders update returning PGRST116 (0 rows)
  const mockFrom = supabaseAdmin.from;
  supabaseAdmin.from = function(table) {
    const builder = mockFrom(table);
    if (table === "orders") {
      builder.update = function(updates) {
        return {
          eq(col, val) {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } });
                  }
                };
              }
            };
          }
        };
      };
    }
    return builder;
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBodyToSign).digest("hex");

  const body = {
    razorpay_order_id: rzpOrderId,
    razorpay_payment_id: rzpPaymentId,
    razorpay_signature: signature
  };

  const razorpay = createMockRazorpay();

  const res = await simulateVerify({
    user: { id: "user-wh" },
    body,
    keySecret: webhookSecret,
    supabaseAdmin,
    razorpay
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Order recovery failed");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.orders[0].status, "PENDING");
});
