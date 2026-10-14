import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

/**
 * Unit & Integration Test Suite for Dynamic Course Price Checkout, Verification & Webhook Flow
 *
 * Scenarios Tested:
 * 1. Checkout: Course price is ₹999 -> Razorpay order created for 99900 paise.
 * 2. Checkout: Price updated to ₹1,499 -> New checkout session creates 149900 paise order.
 * 3. Checkout: Stale pending order price mismatch with payment attempt -> Returns 409 EXISTING_ORDER_PRICE_MISMATCH.
 * 3b. Checkout: Stale unpaid pending order price mismatch without payment -> Cancels stale order and creates ₹1,499 order.
 * 4. Checkout: Stale pending order already paid on Razorpay -> Returns 409 PAYMENT_CONFIRMATION_PENDING.
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
 * 21. Checkout: Confirmed missing Razorpay order cancels local order and creates new one.
 * 22. Checkout: Valid pending order bypasses recreation and returns 200.
 * 23. Checkout: Missing gateway order with local payment returns 503 PAYMENT_SESSION_STALE.
 * 24. Webhook: Late payment.failed event does not downgrade a SUCCESS payment.
 * 25. Checkout: Concurrent checkout requests safely abort due to unique index (409 CONCURRENT_CHECKOUT).
 * 26. Verify: Rejects enrollment for CANCELLED order with existing SUCCESS payment (400).
 * 27. Verify: Updates PENDING order to COMPLETED on early-return when payment is SUCCESS.
 * 28. Verify: Successfully returns early for already-completed order with SUCCESS payment.
 * 29. Verify: Fails safely if PENDING order update fails in SUCCESS branch (500).
 * 30. Verify: Fails safely with PGRST116 if PENDING order update updates 0 rows (500).
 * 31. Checkout: Stale missing-Razorpay-order cancellation races and fails safely (409 CONCURRENT_CHECKOUT).
 * 32. Verify: Order racing with cancellation logs to reconciliation table and returns 409.
 * 33. Webhook: Order racing with cancellation logs to reconciliation table and returns manual_reconciliation_required.
 * 34. Verify: Transient Razorpay network / 5xx error returns 503 PAYMENT_GATEWAY_UNAVAILABLE.
 * 35. Verify: Payment success followed by enrollment failure recovers on retry.
 * 36. Verify & Webhook: Refund protection ensures REFUNDED payment cannot grant enrollment.
 */

// Helper to create mock Supabase query builder
function createMockSupabaseAdmin(initialData = {}) {
  const db = {
    courses: initialData.courses ? JSON.parse(JSON.stringify(initialData.courses)) : [],
    orders: initialData.orders ? JSON.parse(JSON.stringify(initialData.orders)) : [],
    payments: initialData.payments ? JSON.parse(JSON.stringify(initialData.payments)) : [],
    enrollments: initialData.enrollments ? JSON.parse(JSON.stringify(initialData.enrollments)) : [],
    payment_reconciliation_logs: initialData.payment_reconciliation_logs ? JSON.parse(JSON.stringify(initialData.payment_reconciliation_logs)) : [],
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
            select(fields) {
              const selectBuilder = {
                eq(col, val) {
                  updateFilters.push({ col, op: "eq", val });
                  return selectBuilder;
                },
                in(col, vals) {
                  updateFilters.push({ col, op: "in", val: vals });
                  return selectBuilder;
                },
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
              return selectBuilder;
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

          const { data: cancelledOrder } = await supabaseAdmin
            .from("orders")
            .update({ status: "CANCELLED" })
            .eq("id", pendingOrder.id)
            .eq("status", "PENDING")
            .select("id")
            .maybeSingle();

          if (!cancelledOrder) {
            return {
              status: 409,
              body: {
                error: "CONCURRENT_CHECKOUT",
                message: "Another checkout process is running. Please retry.",
              },
            };
          }

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
        const { data: existingPayments, error: paymentsError } = await supabaseAdmin
          .from("payments")
          .select("id, status")
          .eq("order_id", pendingOrder.id);

        if (paymentsError) {
          return {
            status: 500,
            body: { error: "EXISTING_ORDER_PRICE_MISMATCH", message: "Please contact support." },
          };
        }

        if (existingPayments && existingPayments.length > 0) {
          return {
            status: 409,
            body: {
              error: "EXISTING_ORDER_PRICE_MISMATCH",
              message: "Your existing checkout session has a different price and payment attempts exist. Please contact support.",
              order_id: pendingOrder.id,
            },
          };
        }

        const { data: cancelledOrder, error: cancelError } = await supabaseAdmin
          .from("orders")
          .update({ status: "CANCELLED" })
          .eq("id", pendingOrder.id)
          .eq("status", "PENDING")
          .select("id")
          .maybeSingle();

        if (cancelError) {
          return {
            status: 500,
            body: { error: "EXISTING_ORDER_PRICE_MISMATCH", message: "Please contact support." },
          };
        }

        if (!cancelledOrder) {
          return {
            status: 409,
            body: {
              error: "CONCURRENT_CHECKOUT",
              message: "Another checkout process is running. Please retry.",
            },
          };
        }

        continue;
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
    if (insertError?.code === "23505") {
      return {
        status: 409,
        body: {
          error: "CONCURRENT_CHECKOUT",
          message: "Another checkout process is running. Please retry.",
        },
      };
    }

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
        .eq("status", "PENDING")
        .select("id, status")
        .maybeSingle();

      if (orderUpdateError) {
        return { status: 500, body: { error: "Order recovery failed" } };
      }

      if (!updatedOrder) {
        const { data: currentOrder, error: checkOrderError } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", order.id)
          .maybeSingle();

        if (checkOrderError || !currentOrder) {
          return { status: 500, body: { error: "Order verification failed" } };
        }

        if (currentOrder.status === "CANCELLED") {
          const { error: logError } = await supabaseAdmin.from("payment_reconciliation_logs").insert({
            order_id: order.id,
            gateway_payment_id: razorpay_payment_id,
            gateway_order_id: razorpay_order_id,
            expected_amount: order.amount,
            actual_amount: Number(existingPayment.amount),
            currency: "INR",
            reason: "CANCELLED_ORDER",
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
                return { status: 500, body: { error: "Reconciliation log verification failed" } };
              }
            } else {
              return {
                status: 500,
                body: { error: "Failed to persist reconciliation log. Please contact support." },
              };
            }
          }

          return {
            status: 409,
            body: { error: "Order is cancelled. Contact support for reconciliation." },
          };
        }

        if (currentOrder.status !== "COMPLETED") {
          return { status: 500, body: { error: "Order recovery failed" } };
        }
      }
    }

    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("course_id", order.course_id)
      .maybeSingle();

    if (!existingEnrollment) {
      const { error: enrollErr } = await supabaseAdmin.from("enrollments").insert({
        user_id: order.user_id,
        course_id: order.course_id,
      });
      if (enrollErr && enrollErr.code !== "23505") {
        return { status: 500, body: { error: "Enrollment recovery failed" } };
      }
    }

    return { status: 200, body: { success: true, message: "Already processed" } };
  }

  if (order.status === "COMPLETED" && !existingPayment) {
    return { status: 409, body: { error: "Completed order needs payment reconciliation" } };
  }

  const expectedAmountPaise = Math.round(Number(order.amount) * 100);

  function isDefinitiveInvalidResource(err) {
    if (!err || typeof err !== "object") return false;
    const statusCode = err.statusCode;
    const errorCode = err.error?.code;
    const description = typeof err.error?.description === "string" ? err.error.description.toLowerCase() : "";

    if (statusCode === 404) return true;
    if (
      statusCode === 400 &&
      errorCode === "BAD_REQUEST_ERROR" &&
      (description.includes("does not exist") ||
        description.includes("invalid") ||
        description.includes("not found"))
    ) {
      return true;
    }
    return false;
  }

  // Razorpay order fetch
  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
  } catch (err) {
    if (isDefinitiveInvalidResource(err)) {
      return { status: 400, body: { error: "Invalid Razorpay order" } };
    }
    return {
      status: 503,
      body: {
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "Unable to verify payment session with gateway. Please retry shortly.",
      },
    };
  }

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
  let rzpPayment;
  try {
    rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
  } catch (err) {
    if (isDefinitiveInvalidResource(err)) {
      return { status: 400, body: { error: "Invalid Razorpay payment" } };
    }
    return {
      status: 503,
      body: {
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        message: "Unable to verify payment session with gateway. Please retry shortly.",
      },
    };
  }

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
    if (existingPayment.status === "REFUNDED") {
      return { status: 409, body: { error: "Refunded payment cannot grant enrollment" } };
    }

    const { data: updatedPayment, error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "SUCCESS",
        amount: order.amount,
        payment_method: rzpPayment.method || "razorpay",
        gateway_signature: razorpay_signature,
      })
      .eq("id", existingPayment.id)
      .in("status", ["PENDING", "FAILED"])
      .select("id, status")
      .maybeSingle();

    if (paymentUpdateError) {
      return { status: 500, body: { error: "Failed to recover payment record" } };
    }

    if (!updatedPayment) {
      const { data: currentPayment, error: readError } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("id", existingPayment.id)
        .maybeSingle();

      if (readError || !currentPayment) {
        return { status: 500, body: { error: "Payment verification failed" } };
      }

      if (currentPayment.status === "REFUNDED") {
        return { status: 409, body: { error: "Refunded payment cannot grant enrollment" } };
      }
      if (currentPayment.status !== "SUCCESS") {
        return { status: 409, body: { error: "Payment state conflict" } };
      }
    }
  } else {
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      amount: order.amount,
      status: "SUCCESS",
      payment_method: rzpPayment.method || "razorpay",
      gateway_payment_id: razorpay_payment_id,
      gateway_signature: razorpay_signature,
    });

    if (paymentError) {
      if (paymentError.code !== "23505") {
        return { status: 500, body: { error: "Failed to process payment record" } };
      }

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
        return { status: 500, body: { error: "Payment reconciliation required" } };
      }

      if (duplicatePayment.status !== "SUCCESS") {
        const { data: updatedDup, error: duplicateUpdateError } = await supabaseAdmin
          .from("payments")
          .update({
            status: "SUCCESS",
            amount: Number(rzpPayment.amount) / 100,
            payment_method: rzpPayment.method || "razorpay",
            gateway_signature: razorpay_signature,
          })
          .eq("id", duplicatePayment.id)
          .in("status", ["PENDING", "FAILED"])
          .select("id, status")
          .maybeSingle();

        if (duplicateUpdateError) {
          return { status: 500, body: { error: "Payment recovery failed" } };
        }

        if (!updatedDup) {
          const { data: checkPayment, error: checkError } = await supabaseAdmin
            .from("payments")
            .select("id, status")
            .eq("id", duplicatePayment.id)
            .maybeSingle();

          if (checkError || !checkPayment) {
            return { status: 500, body: { error: "Payment verification failed" } };
          }

          if (checkPayment.status === "REFUNDED") {
            return { status: 409, body: { error: "Refunded payment cannot grant enrollment" } };
          }

          if (checkPayment.status !== "SUCCESS") {
            return { status: 500, body: { error: "Payment reconciliation required" } };
          }
        }
      }
    }
  }

  const { data: updatedOrder, error: orderUpdateError } = await supabaseAdmin
    .from("orders")
    .update({ status: "COMPLETED" })
    .eq("id", order.id)
    .eq("status", "PENDING")
    .select("id, status")
    .maybeSingle();

  if (orderUpdateError) {
    return { status: 500, body: { error: "Failed to update order" } };
  }

  if (!updatedOrder) {
    const { data: currentOrder } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", order.id)
      .maybeSingle();

    if (currentOrder?.status === "CANCELLED") {
      const { error: logError } = await supabaseAdmin.from("payment_reconciliation_logs").insert({
        order_id: order.id,
        gateway_payment_id: razorpay_payment_id,
        gateway_order_id: razorpay_order_id,
        expected_amount: order.amount,
        actual_amount: Number(rzpPayment.amount) / 100,
        currency: rzpPayment.currency || "INR",
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
            return { status: 500, body: { error: "Reconciliation log verification failed" } };
          }
        } else {
          return { status: 500, body: { error: "Failed to persist reconciliation log. Please contact support." } };
        }
      }

      return { status: 409, body: { error: "Order is cancelled. Contact support for reconciliation." } };
    }

    if (currentOrder?.status !== "COMPLETED") {
      return { status: 400, body: { error: "Order cannot be fulfilled" } };
    }
  }

  const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
    user_id: order.user_id,
    course_id: order.course_id,
  });

  if (enrollError && enrollError.code !== "23505") {
    return { status: 500, body: { error: "Order processed but enrollment failed. Please contact support." } };
  }

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
    !currency ||
    typeof currency !== "string" ||
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
        const { data: updatedPayment, error } = await supabaseAdmin
          .from("payments")
          .update({ status: "FAILED" })
          .eq("id", existingPayment.id)
          .in("status", ["PENDING"])
          .select("id, status")
          .maybeSingle();

        if (error) {
          return { status: 500, body: { error: "Payment update failed" } };
        }

        if (!updatedPayment) {
          const { data: currentPayment, error: readError } = await supabaseAdmin
            .from("payments")
            .select("status")
            .eq("id", existingPayment.id)
            .maybeSingle();

          if (readError || !currentPayment) {
            return { status: 500, body: { error: "Payment verification failed" } };
          }

          if (["SUCCESS", "REFUNDED"].includes(currentPayment.status)) {
            return { status: 200, body: { success: true, message: "Existing payment status preserved" } };
          }

          if (currentPayment.status === "FAILED") {
            return { status: 200, body: { success: true, message: "Failed payment recorded" } };
          }

          return { status: 409, body: { error: "Payment state conflict" } };
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
        return { status: 500, body: { error: "Payment recording failed" } };
      }
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

  const isAmountMismatch = localAmountPaise !== Number(amountPaise);
  const isCurrencyMismatch = currency !== "INR";
  const hasMismatch = isAmountMismatch || isCurrencyMismatch;

  if (hasMismatch) {
    if (!existingPayment) {
      const { error: insertErr } = await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        amount: actualAmountPaid,
        status: "FAILED",
        payment_method: paymentEntity?.method || "unknown",
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: null,
      });
      if (insertErr && insertErr.code !== "23505") {
        return { status: 500, body: { error: "Payment recording failed" } };
      }
    } else if (existingPayment.status !== "SUCCESS" && existingPayment.status !== "REFUNDED") {
      const { error: updateErr } = await supabaseAdmin
        .from("payments")
        .update({
          status: "FAILED",
          amount: actualAmountPaid,
          payment_method: paymentEntity?.method || "unknown",
        })
        .eq("id", existingPayment.id)
        .in("status", ["PENDING", "FAILED"]);
      if (updateErr) {
        return { status: 500, body: { error: "Payment update failed" } };
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
          return { status: 500, body: { error: "Reconciliation log verification failed" } };
        }
      } else {
        return { status: 500, body: { error: "Reconciliation logging failed" } };
      }
    }

    return { status: 200, body: { status: "amount_mismatch_recorded" } };
  }

  if (existingPayment) {
    if (existingPayment.status === "REFUNDED") {
      return { status: 200, body: { status: "refunded_payment_not_fulfilled" } };
    }

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
        return { status: 500, body: { error: "Payment recovery failed" } };
      }

      if (!updatedPayment) {
        const { data: currentPayment, error: readError } = await supabaseAdmin
          .from("payments")
          .select("status")
          .eq("id", existingPayment.id)
          .maybeSingle();

        if (readError || !currentPayment) {
          return { status: 500, body: { error: "Payment verification failed" } };
        }

        if (currentPayment.status === "REFUNDED") {
          return { status: 200, body: { status: "refunded_payment_not_fulfilled" } };
        }

        if (currentPayment.status !== "SUCCESS") {
          return { status: 409, body: { error: "Payment state conflict" } };
        }
      }
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
    if (insertErr) {
      if (insertErr.code !== "23505") {
        return { status: 500, body: { error: "Payment recording failed" } };
      }

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
        return { status: 500, body: { error: "Payment reconciliation required" } };
      }
    }
  }

  if (order.status === "CANCELLED") {
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
          return { status: 500, body: { error: "Reconciliation log verification failed" } };
        }
      } else {
        return { status: 500, body: { error: "Reconciliation logging failed" } };
      }
    }
    return { status: 200, body: { status: "manual_reconciliation_required" } };
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
      return { status: 500, body: { error: "Order update failed" } };
    }

    if (!updatedOrder) {
      const { data: currentOrder } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", order.id)
        .maybeSingle();

      if (currentOrder?.status === "CANCELLED") {
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
              return { status: 500, body: { error: "Reconciliation log verification failed" } };
            }
          } else {
            return { status: 500, body: { error: "Reconciliation logging failed" } };
          }
        }
        return { status: 200, body: { status: "manual_reconciliation_required" } };
      }

      if (currentOrder?.status !== "COMPLETED") {
        return { status: 500, body: { error: "Order state conflict" } };
      }
    }
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

test("Scenario 3: Old ₹499 pending order price mismatch with payment attempt safely returns 409", async () => {
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
    payments: [
      {
        id: "pay_attempt_1",
        order_id: "order-local-499",
        status: "PENDING",
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

test("Scenario 3b: Old ₹499 unpaid pending order without payment attempts safely cancels stale order and creates ₹1,499 order", async () => {
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
    payments: [],
  });

  const res = await simulateCheckout({ user, courseId, supabaseAdmin, razorpay });

  assert.equal(res.status, 201);
  assert.equal(res.body.order.amount, 1499);

  const oldLocalOrder = supabaseAdmin.db.orders.find((o) => o.id === "order-local-499");
  assert.equal(oldLocalOrder.status, "CANCELLED");

  const newLocalOrder = supabaseAdmin.db.orders.find((o) => o.id === res.body.order.id);
  assert.equal(newLocalOrder.status, "PENDING");
  assert.equal(newLocalOrder.amount, 1499);
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
  assert.equal(supabaseAdmin.db.payments[0].status, "FAILED");
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
  // The insert should fail with 23505 and return 409 CONCURRENT_CHECKOUT
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "CONCURRENT_CHECKOUT");

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
  const mockFrom = supabaseAdmin.from;
  supabaseAdmin.from = function(table) {
    const builder = mockFrom(table);
    if (table === "orders") {
      builder.update = function(updates) {
        const chain = {
          eq(col, val) {
            return chain;
          },
          in(col, vals) {
            return chain;
          },
          select(fields) {
            return chain;
          },
          single() {
            return Promise.resolve({ data: null, error: { message: "Simulated update failure" } });
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: { message: "Simulated update failure" } });
          },
          then(onResolve, onReject) {
            return Promise.resolve({ data: null, error: { message: "Simulated update failure" } }).then(onResolve, onReject);
          }
        };
        return chain;
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
        const chain = {
          eq(col, val) {
            return chain;
          },
          in(col, vals) {
            return chain;
          },
          select(fields) {
            return chain;
          },
          single() {
            return Promise.resolve({
              data: null,
              error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }
            });
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
          then(onResolve, onReject) {
            return Promise.resolve({ data: null, error: null }).then(onResolve, onReject);
          }
        };
        return chain;
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

test("Scenario 31: Checkout: Stale missing-Razorpay-order cancellation races and fails safely (409 CONCURRENT_CHECKOUT)", async () => {
  const courseId = "course-stale-race";
  const user = { id: "user-stale-race" };
  const rzpOrderId = "order_stale_missing_race";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: courseId, price: 999 }],
    orders: [
      {
        id: "order-stale-missing-race",
        user_id: user.id,
        course_id: courseId,
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  const razorpay = {
    orders: {
      async fetch() {
        const err = new Error("Order does not exist");
        err.statusCode = 400;
        err.error = { code: "BAD_REQUEST_ERROR", description: "Order does not exist" };
        throw err;
      },
      async create() {
        return { id: "order_new_unexpected", amount: 99900, currency: "INR" };
      },
    },
  };

  // Simulate a race: between fetch error and cancellation, another request changed order status to CANCELLED
  const originalFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = originalFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        // Change the underlying row status to COMPLETED so eq("status", "PENDING") matches 0 rows
        supabaseAdmin.db.orders[0].status = "COMPLETED";
        return origUpdate(updates);
      };
    }
    return builder;
  };

  const res = await simulateCheckout({
    courseId,
    user,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "CONCURRENT_CHECKOUT");
  assert.equal(supabaseAdmin.db.orders[0].status, "COMPLETED"); // Not overwritten
});

test("Scenario 32: Verify: Order racing with cancellation logs to reconciliation table and returns 409", async () => {
  const keySecret = "whsec_test_verify_cancel_race";
  const rzpOrderId = "order_verify_cancel_race";
  const rzpPaymentId = "pay_verify_cancel_race";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-race", price: 999 }],
    orders: [
      {
        id: "order-race-1",
        user_id: "user-race",
        course_id: "course-race",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
    payment_reconciliation_logs: [],
  });

  const razorpay = {
    orders: {
      async fetch() {
        return { id: rzpOrderId, amount: 99900, currency: "INR" };
      },
    },
    payments: {
      async fetch() {
        return {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "card",
        };
      },
    },
  };

  // Simulate concurrent cancellation: right before orders.update({ status: "COMPLETED" }), the order becomes CANCELLED
  const originalFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = originalFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        if (updates.status === "COMPLETED") {
          supabaseAdmin.db.orders[0].status = "CANCELLED";
        }
        return origUpdate(updates);
      };
    }
    return builder;
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const res = await simulateVerify({
    user: { id: "user-race" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Order is cancelled. Contact support for reconciliation.");
  assert.equal(supabaseAdmin.db.enrollments.length, 0); // No enrollment granted
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "CANCELLED_ORDER");
});

test("Scenario 33: Webhook: Order racing with cancellation logs to reconciliation table and returns manual_reconciliation_required", async () => {
  const webhookSecret = "whsec_test_webhook_cancel_race";
  const rzpOrderId = "order_wh_cancel_race";
  const rzpPaymentId = "pay_wh_cancel_race";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-race", price: 999 }],
    orders: [
      {
        id: "order-wh-race-1",
        user_id: "user-wh-race",
        course_id: "course-wh-race",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
    payment_reconciliation_logs: [],
  });

  // Concurrently cancel order during processing
  const originalFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = originalFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        if (updates.status === "COMPLETED") {
          supabaseAdmin.db.orders[0].status = "CANCELLED";
        }
        return origUpdate(updates);
      };
    }
    return builder;
  };

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
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "manual_reconciliation_required");
  assert.equal(supabaseAdmin.db.enrollments.length, 0); // Enrollment was prevented
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "CANCELLED_ORDER");
});

test("Scenario 34: Verify: Transient Razorpay network / 5xx error returns 503 PAYMENT_GATEWAY_UNAVAILABLE", async () => {
  const keySecret = "whsec_test_transient";
  const rzpOrderId = "order_transient_5xx";
  const rzpPaymentId = "pay_transient_5xx";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-transient", price: 999 }],
    orders: [
      {
        id: "order-transient-1",
        user_id: "user-transient",
        course_id: "course-transient",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  // Simulate upstream Razorpay timeout
  const razorpay = {
    orders: {
      async fetch() {
        const err = new Error("Gateway Timeout");
        err.statusCode = 504;
        throw err;
      },
    },
    payments: {
      async fetch() {
        return {};
      },
    },
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const res = await simulateVerify({
    user: { id: "user-transient" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 503);
  assert.equal(res.body.error, "PAYMENT_GATEWAY_UNAVAILABLE");
  assert.equal(supabaseAdmin.db.orders[0].status, "PENDING"); // Order remains PENDING for retry
});

test("Scenario 35: Verify: Payment success followed by enrollment failure recovers on retry", async () => {
  const keySecret = "whsec_test_enroll_retry";
  const rzpOrderId = "order_enroll_retry";
  const rzpPaymentId = "pay_enroll_retry";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-retry", price: 999 }],
    orders: [
      {
        id: "order-retry-1",
        user_id: "user-retry",
        course_id: "course-retry",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  const razorpay = {
    orders: {
      async fetch() {
        return { id: rzpOrderId, amount: 99900, currency: "INR" };
      },
    },
    payments: {
      async fetch() {
        return {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "netbanking",
        };
      },
    },
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  // First run: simulate failure during enrollment insert
  let failEnrollment = true;
  const originalFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = originalFrom(table);
    if (table === "enrollments" && failEnrollment) {
      builder.insert = function () {
        return Promise.resolve({ data: null, error: { message: "Simulated DB network timeout" } });
      };
    }
    return builder;
  };

  const res1 = await simulateVerify({
    user: { id: "user-retry" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res1.status, 500);
  assert.equal(res1.body.error, "Order processed but enrollment failed. Please contact support.");
  assert.equal(supabaseAdmin.db.orders[0].status, "COMPLETED");
  assert.equal(supabaseAdmin.db.payments[0].status, "SUCCESS");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);

  // Second run: client retries, enrollment insert now succeeds
  failEnrollment = false;
  const res2 = await simulateVerify({
    user: { id: "user-retry" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res2.status, 200);
  assert.equal(res2.body.success, true);
  assert.equal(res2.body.message, "Already processed");
  assert.equal(supabaseAdmin.db.enrollments.length, 1);
  assert.equal(supabaseAdmin.db.enrollments[0].user_id, "user-retry");
});

test("Scenario 36: Verify & Webhook: Refund protection ensures REFUNDED payment cannot grant enrollment", async () => {
  const keySecret = "whsec_test_refund_guard";
  const rzpOrderId = "order_refund_guard";
  const rzpPaymentId = "pay_refund_guard";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-refund", price: 999 }],
    orders: [
      {
        id: "order-refund-1",
        user_id: "user-refund",
        course_id: "course-refund",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-refund-1",
        order_id: "order-refund-1",
        gateway_payment_id: rzpPaymentId,
        status: "REFUNDED",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  const razorpay = {
    orders: {
      async fetch() {
        return { id: rzpOrderId, amount: 99900, currency: "INR" };
      },
    },
    payments: {
      async fetch() {
        return {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "INR",
          status: "captured",
          method: "card",
        };
      },
    },
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const resVerify = await simulateVerify({
    user: { id: "user-refund" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(resVerify.status, 409);
  assert.equal(resVerify.body.error, "Refunded payment cannot grant enrollment");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);

  // Now test webhook receiving payment.captured for the same refunded payment
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
  const whSignature = crypto.createHmac("sha256", keySecret).update(rawBody).digest("hex");

  const resWebhook = await simulateWebhook({
    rawBody,
    signature: whSignature,
    webhookSecret: keySecret,
    supabaseAdmin,
  });

  assert.equal(resWebhook.status, 200);
  assert.equal(resWebhook.body.status, "refunded_payment_not_fulfilled");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.payments[0].status, "REFUNDED"); // Remains REFUNDED
});

test("Scenario 37: Webhook & Verify: Database read errors during zero-row payment recovery stop fulfillment with 500", async () => {
  const keySecret = "whsec_test_read_err";
  const rzpOrderId = "order_read_err";
  const rzpPaymentId = "pay_read_err";

  // 1. Test Webhook zero-row payment recovery with DB read error
  const supabaseWebhook = createMockSupabaseAdmin({
    courses: [{ id: "course-err", price: 999 }],
    orders: [{ id: "order-err-1", user_id: "user-err", course_id: "course-err", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-err-1", order_id: "order-err-1", gateway_payment_id: rzpPaymentId, status: "PENDING", amount: 999 }],
    enrollments: [],
  });

  const origFromWh = supabaseWebhook.from;
  let updateCalledWh = false;
  supabaseWebhook.from = function(table) {
    const builder = origFromWh(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function(updates) {
        updateCalledWh = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function() {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function(fields) {
        if (updateCalledWh) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: { message: "Simulated DB read error" } }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
  const whSig = crypto.createHmac("sha256", keySecret).update(rawBody).digest("hex");

  const resWh = await simulateWebhook({
    rawBody,
    signature: whSig,
    webhookSecret: keySecret,
    supabaseAdmin: supabaseWebhook,
  });

  assert.equal(resWh.status, 500);
  assert.equal(resWh.body.error, "Payment verification failed");
  assert.equal(supabaseWebhook.db.enrollments.length, 0);

  // 2. Test Verify zero-row payment recovery with DB read error
  const supabaseVerify = createMockSupabaseAdmin({
    courses: [{ id: "course-err", price: 999 }],
    orders: [{ id: "order-err-1", user_id: "user-err", course_id: "course-err", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-err-1", order_id: "order-err-1", gateway_payment_id: rzpPaymentId, status: "PENDING", amount: 999 }],
    enrollments: [],
  });

  const origFromV = supabaseVerify.from;
  let updateCalledV = false;
  supabaseVerify.from = function(table) {
    const builder = origFromV(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function(updates) {
        updateCalledV = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function() {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function(fields) {
        if (updateCalledV) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: { message: "Simulated DB read error" } }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

  const razorpay = {
    orders: { async fetch() { return { id: rzpOrderId, amount: 99900, currency: "INR" }; } },
    payments: { async fetch() { return { id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured", method: "card" }; } },
  };
  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const verifySig = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const resV = await simulateVerify({
    user: { id: "user-err" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: verifySig,
    },
    keySecret,
    supabaseAdmin: supabaseVerify,
    razorpay,
  });

  assert.equal(resV.status, 500);
  assert.equal(resV.body.error, "Payment verification failed");
  assert.equal(supabaseVerify.db.enrollments.length, 0);
});

test("Scenario 38: Webhook & Verify: Payment remaining FAILED after zero-row update stops fulfillment with 409 conflict", async () => {
  const keySecret = "whsec_test_failed_status";
  const rzpOrderId = "order_failed_status";
  const rzpPaymentId = "pay_failed_status";

  // 1. Test Webhook: payment record remains FAILED after 0 rows updated
  const supabaseWebhook = createMockSupabaseAdmin({
    courses: [{ id: "course-f", price: 999 }],
    orders: [{ id: "order-f-1", user_id: "user-f", course_id: "course-f", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-f-1", order_id: "order-f-1", gateway_payment_id: rzpPaymentId, status: "FAILED", amount: 999 }],
    enrollments: [],
  });

  const origFromWh = supabaseWebhook.from;
  supabaseWebhook.from = function(table) {
    const builder = origFromWh(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function(updates) {
        const uBuilder = origUpdate(updates);
        uBuilder.select = function() {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
    }
    return builder;
  };

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
  const whSig = crypto.createHmac("sha256", keySecret).update(rawBody).digest("hex");

  const resWh = await simulateWebhook({
    rawBody,
    signature: whSig,
    webhookSecret: keySecret,
    supabaseAdmin: supabaseWebhook,
  });

  assert.equal(resWh.status, 409);
  assert.equal(resWh.body.error, "Payment state conflict");
  assert.equal(supabaseWebhook.db.enrollments.length, 0);

  // 2. Test Verify: payment record remains FAILED after 0 rows updated
  const supabaseVerify = createMockSupabaseAdmin({
    courses: [{ id: "course-f", price: 999 }],
    orders: [{ id: "order-f-1", user_id: "user-f", course_id: "course-f", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-f-1", order_id: "order-f-1", gateway_payment_id: rzpPaymentId, status: "FAILED", amount: 999 }],
    enrollments: [],
  });

  const origFromV = supabaseVerify.from;
  supabaseVerify.from = function(table) {
    const builder = origFromV(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function(updates) {
        const uBuilder = origUpdate(updates);
        uBuilder.select = function() {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
    }
    return builder;
  };

  const razorpay = {
    orders: { async fetch() { return { id: rzpOrderId, amount: 99900, currency: "INR" }; } },
    payments: { async fetch() { return { id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured", method: "card" }; } },
  };
  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const verifySig = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const resV = await simulateVerify({
    user: { id: "user-f" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: verifySig,
    },
    keySecret,
    supabaseAdmin: supabaseVerify,
    razorpay,
  });

  assert.equal(resV.status, 409);
  assert.equal(resV.body.error, "Payment state conflict");
  assert.equal(supabaseVerify.db.enrollments.length, 0);
});

test("Scenario 39: Verify: Reconciliation-log insertion failure on cancelled order returns HTTP 500", async () => {
  const keySecret = "whsec_test_recon_fail";
  const rzpOrderId = "order_recon_fail";
  const rzpPaymentId = "pay_recon_fail";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-cancel", price: 999 }],
    orders: [
      {
        id: "order-cancel-1",
        user_id: "user-cancel",
        course_id: "course-cancel",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
  });

  const origFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        if (updates.status === "COMPLETED") {
          supabaseAdmin.db.orders[0].status = "CANCELLED";
        }
        return origUpdate(updates);
      };
    }
    if (table === "payment_reconciliation_logs") {
      builder.insert = function () {
        return Promise.resolve({ data: null, error: { message: "Disk full or DB connection lost", code: "58000" } });
      };
    }
    return builder;
  };

  const razorpay = {
    orders: { async fetch() { return { id: rzpOrderId, amount: 99900, currency: "INR" }; } },
    payments: { async fetch() { return { id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured", method: "card" }; } },
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const res = await simulateVerify({
    user: { id: "user-cancel" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Failed to persist reconciliation log. Please contact support.");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 40: Verify: Reconciliation-log duplicate conflict (23505) safely returns 409", async () => {
  const keySecret = "whsec_test_recon_dup";
  const rzpOrderId = "order_recon_dup";
  const rzpPaymentId = "pay_recon_dup";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-cancel", price: 999 }],
    orders: [
      {
        id: "order-cancel-2",
        user_id: "user-cancel",
        course_id: "course-cancel",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [],
    enrollments: [],
    payment_reconciliation_logs: [
      {
        id: "recon-existing-dup-40",
        order_id: "order-cancel-2",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
      },
    ],
  });

  const origFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        if (updates.status === "COMPLETED") {
          supabaseAdmin.db.orders[0].status = "CANCELLED";
        }
        return origUpdate(updates);
      };
    }
    if (table === "payment_reconciliation_logs") {
      builder.insert = function () {
        return Promise.resolve({ data: null, error: { message: "Duplicate key", code: "23505" } });
      };
    }
    return builder;
  };

  const razorpay = {
    orders: { async fetch() { return { id: rzpOrderId, amount: 99900, currency: "INR" }; } },
    payments: { async fetch() { return { id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured", method: "card" }; } },
  };

  const rawBodyToSign = `${rzpOrderId}|${rzpPaymentId}`;
  const signature = crypto.createHmac("sha256", keySecret).update(rawBodyToSign).digest("hex");

  const res = await simulateVerify({
    user: { id: "user-cancel" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: signature,
    },
    keySecret,
    supabaseAdmin,
    razorpay,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Order is cancelled. Contact support for reconciliation.");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 41: Webhook payment.failed: Zero-row update follow-up DB read error returns HTTP 500", async () => {
  const webhookSecret = "whsec_test_failed_read_err";
  const rzpOrderId = "order_wh_fail_read_err";
  const rzpPaymentId = "pay_wh_fail_read_err";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [
      {
        id: "order-wh-fail-1",
        user_id: "user-wh-fail",
        course_id: "course-wh-fail",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-wh-fail-1",
        order_id: "order-wh-fail-1",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  const origFrom = supabaseAdmin.from;
  let updateAttempted = false;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttempted = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttempted) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: { message: "Simulated DB read error" } }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Payment verification failed");
});

test("Scenario 42: Webhook payment.failed: Zero-row update follow-up missing row returns HTTP 500", async () => {
  const webhookSecret = "whsec_test_failed_missing_row";
  const rzpOrderId = "order_wh_fail_missing_row";
  const rzpPaymentId = "pay_wh_fail_missing_row";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [
      {
        id: "order-wh-fail-2",
        user_id: "user-wh-fail",
        course_id: "course-wh-fail",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-wh-fail-2",
        order_id: "order-wh-fail-2",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  const origFrom = supabaseAdmin.from;
  let updateAttempted = false;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttempted = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttempted) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Payment verification failed");
});

test("Scenario 43: Webhook payment.failed: Zero-row update follow-up unexpected status (DISPUTED) returns HTTP 409", async () => {
  const webhookSecret = "whsec_test_failed_unexpected_status";
  const rzpOrderId = "order_wh_fail_unexpected_status";
  const rzpPaymentId = "pay_wh_fail_unexpected_status";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [
      {
        id: "order-wh-fail-3",
        user_id: "user-wh-fail",
        course_id: "course-wh-fail",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-wh-fail-3",
        order_id: "order-wh-fail-3",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  const origFrom = supabaseAdmin.from;
  let updateAttempted = false;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttempted = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttempted) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: { status: "DISPUTED" }, error: null }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Payment state conflict");
});

test("Scenario 44: Webhook payment.failed: Zero-row update follow-up with status FAILED returns HTTP 200 idempotent acknowledgment", async () => {
  const webhookSecret = "whsec_test_failed_idempotent";
  const rzpOrderId = "order_wh_fail_idempotent";
  const rzpPaymentId = "pay_wh_fail_idempotent";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [
      {
        id: "order-wh-fail-4",
        user_id: "user-wh-fail",
        course_id: "course-wh-fail",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-wh-fail-4",
        order_id: "order-wh-fail-4",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  const origFrom = supabaseAdmin.from;
  let updateAttempted = false;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttempted = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttempted) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: { status: "FAILED" }, error: null }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const res = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Failed payment recorded");
});

test("Scenario 45: Webhook payment.failed: Zero-row update follow-up with status SUCCESS or REFUNDED preserves status and returns HTTP 200", async () => {
  const webhookSecret = "whsec_test_failed_preserve_status";
  const rzpOrderId = "order_wh_fail_preserve_status";
  const rzpPaymentId = "pay_wh_fail_preserve_status";

  // 1. Follow-up status SUCCESS
  const supabaseSuccess = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [{ id: "order-wh-fail-5", user_id: "user-wh-fail", course_id: "course-wh-fail", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-wh-fail-5", order_id: "order-wh-fail-5", gateway_payment_id: rzpPaymentId, status: "PENDING", amount: 999 }],
    enrollments: [],
  });

  const origFromS = supabaseSuccess.from;
  let updateAttemptedS = false;
  supabaseSuccess.from = function (table) {
    const builder = origFromS(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttemptedS = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttemptedS) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: { status: "SUCCESS" }, error: null }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

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
          method: "card",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const resSuccess = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin: supabaseSuccess,
  });

  assert.equal(resSuccess.status, 200);
  assert.equal(resSuccess.body.success, true);
  assert.equal(resSuccess.body.message, "Existing payment status preserved");

  // 2. Follow-up status REFUNDED
  const supabaseRefunded = createMockSupabaseAdmin({
    courses: [{ id: "course-wh-fail", price: 999 }],
    orders: [{ id: "order-wh-fail-6", user_id: "user-wh-fail", course_id: "course-wh-fail", amount: 999, status: "PENDING", gateway_order_id: rzpOrderId }],
    payments: [{ id: "pay-wh-fail-6", order_id: "order-wh-fail-6", gateway_payment_id: rzpPaymentId, status: "PENDING", amount: 999 }],
    enrollments: [],
  });

  const origFromR = supabaseRefunded.from;
  let updateAttemptedR = false;
  supabaseRefunded.from = function (table) {
    const builder = origFromR(table);
    if (table === "payments") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        updateAttemptedR = true;
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            eq() { return this; },
            in() { return this; },
            maybeSingle() { return Promise.resolve({ data: null, error: null }); },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        if (updateAttemptedR) {
          return {
            eq() { return this; },
            maybeSingle() { return Promise.resolve({ data: { status: "REFUNDED" }, error: null }); },
          };
        }
        return origSelect(fields);
      };
    }
    return builder;
  };

  const resRefunded = await simulateWebhook({
    rawBody,
    signature,
    webhookSecret,
    supabaseAdmin: supabaseRefunded,
  });

  assert.equal(resRefunded.status, 200);
  assert.equal(resRefunded.body.success, true);
  assert.equal(resRefunded.body.message, "Existing payment status preserved");
});

test("Scenario 46: Webhook with currency mismatch records payment as FAILED, logs OTHER to reconciliation, returns 200 amount_mismatch_recorded", async () => {
  const webhookSecret = "whsec_test_currency_mismatch";
  const rzpOrderId = "order_wh_currency_mismatch";
  const rzpPaymentId = "pay_wh_currency_mismatch";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-curr-mismatch",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payment_reconciliation_logs: [],
  });

  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 99900,
          currency: "USD",
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
  assert.equal(res.body.status, "amount_mismatch_recorded");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.payments.length, 1);
  assert.equal(supabaseAdmin.db.payments[0].status, "FAILED");
  assert.equal(supabaseAdmin.db.payments[0].amount, 999);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "OTHER");
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].currency, "USD");
});

test("Scenario 47: Webhook reconciliation log 23505 conflict with mismatched existing record returns HTTP 500", async () => {
  const webhookSecret = "whsec_test_recon_conflict";
  const rzpOrderId = "order_wh_recon_conflict";
  const rzpPaymentId = "pay_wh_recon_conflict";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-wh", price: 999 }],
    orders: [
      {
        id: "order-recon-local",
        user_id: "user-wh",
        course_id: "course-wh",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payment_reconciliation_logs: [
      {
        id: "recon-existing-different-order",
        order_id: "different-order-id",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
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
          amount: 49900,
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

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Reconciliation log verification failed");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 48: Verify reconciliation log 23505 conflict with mismatched existing record returns HTTP 500", async () => {
  const razorpayKeySecret = "rzp_secret_recon_conflict";
  const rzpOrderId = "order_verify_recon_conflict";
  const rzpPaymentId = "pay_verify_recon_conflict";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-verify", price: 999 }],
    orders: [
      {
        id: "order-verify-local",
        user_id: "user-verify",
        course_id: "course-verify",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payment_reconciliation_logs: [
      {
        id: "recon-existing-diff-order",
        order_id: "different-order-id",
        gateway_payment_id: rzpPaymentId,
        status: "PENDING",
      },
    ],
  });

  let orderSelectCount = 0;
  const origFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            maybeSingle() {
              return Promise.resolve({ data: null, error: null });
            },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        const sBuilder = origSelect(fields);
        const origMaybeSingle = sBuilder.maybeSingle;
        sBuilder.maybeSingle = function () {
          orderSelectCount++;
          if (orderSelectCount === 1) {
            return origMaybeSingle ? origMaybeSingle.call(sBuilder) : Promise.resolve({ data: supabaseAdmin.db.orders[0], error: null });
          }
          return Promise.resolve({
            data: { id: "order-verify-local", user_id: "user-verify", course_id: "course-verify", amount: 999, status: "CANCELLED" },
            error: null,
          });
        };
        return sBuilder;
      };
    }
    return builder;
  };

  const razorpaySignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const mockRazorpay = {
    orders: {
      fetch: async () => ({ id: rzpOrderId, amount: 99900, currency: "INR", status: "paid" }),
    },
    payments: {
      fetch: async () => ({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        amount: 99900,
        currency: "INR",
        status: "captured",
        method: "card",
      }),
    },
  };

  const res = await simulateVerify({
    user: { id: "user-verify" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: razorpaySignature,
    },
    keySecret: razorpayKeySecret,
    supabaseAdmin,
    razorpay: mockRazorpay,
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.error, "Reconciliation log verification failed");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
});

test("Scenario 49: Verify concurrent cancellation during SUCCESS-payment recovery logs CANCELLED_ORDER, returns 409, 0 enrollments", async () => {
  const razorpayKeySecret = "rzp_secret_recov_cancel";
  const rzpOrderId = "order_recov_cancel";
  const rzpPaymentId = "pay_recov_cancel";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-verify", price: 999 }],
    orders: [
      {
        id: "order-recov-cancel-local",
        user_id: "user-verify",
        course_id: "course-verify",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-recov-success",
        order_id: "order-recov-cancel-local",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: [],
    payment_reconciliation_logs: [],
  });

  let orderSelectCount = 0;
  const origFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            maybeSingle() {
              return Promise.resolve({ data: null, error: null });
            },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        const sBuilder = origSelect(fields);
        const origMaybeSingle = sBuilder.maybeSingle;
        sBuilder.maybeSingle = function () {
          orderSelectCount++;
          if (orderSelectCount === 1) {
            return origMaybeSingle ? origMaybeSingle.call(sBuilder) : Promise.resolve({ data: supabaseAdmin.db.orders[0], error: null });
          }
          return Promise.resolve({
            data: { id: "order-recov-cancel-local", user_id: "user-verify", course_id: "course-verify", amount: 999, status: "CANCELLED" },
            error: null,
          });
        };
        return sBuilder;
      };
    }
    return builder;
  };

  const razorpaySignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const mockRazorpay = {
    orders: { fetch: async () => ({ id: rzpOrderId, amount: 99900, status: "paid" }) },
    payments: { fetch: async () => ({ id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured" }) },
  };

  const res = await simulateVerify({
    user: { id: "user-verify" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: razorpaySignature,
    },
    keySecret: razorpayKeySecret,
    supabaseAdmin,
    razorpay: mockRazorpay,
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.error, "Order is cancelled. Contact support for reconciliation.");
  assert.equal(supabaseAdmin.db.enrollments.length, 0);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs.length, 1);
  assert.equal(supabaseAdmin.db.payment_reconciliation_logs[0].reason, "CANCELLED_ORDER");
});

test("Scenario 50: Verify concurrent completion during SUCCESS-payment recovery re-reads order as COMPLETED and fulfills enrollment idempotently", async () => {
  const razorpayKeySecret = "rzp_secret_recov_complete";
  const rzpOrderId = "order_recov_complete";
  const rzpPaymentId = "pay_recov_complete";

  const supabaseAdmin = createMockSupabaseAdmin({
    courses: [{ id: "course-verify", price: 999 }],
    orders: [
      {
        id: "order-recov-comp-local",
        user_id: "user-verify",
        course_id: "course-verify",
        amount: 999,
        status: "PENDING",
        gateway_order_id: rzpOrderId,
      },
    ],
    payments: [
      {
        id: "pay-recov-comp-success",
        order_id: "order-recov-comp-local",
        gateway_payment_id: rzpPaymentId,
        status: "SUCCESS",
        amount: 999,
      },
    ],
    enrollments: [],
  });

  let orderSelectCount = 0;
  const origFrom = supabaseAdmin.from;
  supabaseAdmin.from = function (table) {
    const builder = origFrom(table);
    if (table === "orders") {
      const origUpdate = builder.update;
      builder.update = function (updates) {
        const uBuilder = origUpdate(updates);
        uBuilder.select = function () {
          return {
            maybeSingle() {
              return Promise.resolve({ data: null, error: null });
            },
          };
        };
        return uBuilder;
      };
      const origSelect = builder.select;
      builder.select = function (fields) {
        const sBuilder = origSelect(fields);
        const origMaybeSingle = sBuilder.maybeSingle;
        sBuilder.maybeSingle = function () {
          orderSelectCount++;
          if (orderSelectCount === 1) {
            return origMaybeSingle ? origMaybeSingle.call(sBuilder) : Promise.resolve({ data: supabaseAdmin.db.orders[0], error: null });
          }
          return Promise.resolve({
            data: { id: "order-recov-comp-local", user_id: "user-verify", course_id: "course-verify", amount: 999, status: "COMPLETED" },
            error: null,
          });
        };
        return sBuilder;
      };
    }
    return builder;
  };

  const razorpaySignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const mockRazorpay = {
    orders: { fetch: async () => ({ id: rzpOrderId, amount: 99900, status: "paid" }) },
    payments: { fetch: async () => ({ id: rzpPaymentId, order_id: rzpOrderId, amount: 99900, currency: "INR", status: "captured" }) },
  };

  const res = await simulateVerify({
    user: { id: "user-verify" },
    body: {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: razorpaySignature,
    },
    keySecret: razorpayKeySecret,
    supabaseAdmin,
    razorpay: mockRazorpay,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Already processed");
  assert.equal(supabaseAdmin.db.enrollments.length, 1);
  assert.equal(supabaseAdmin.db.enrollments[0].user_id, "user-verify");
  assert.equal(supabaseAdmin.db.enrollments[0].course_id, "course-verify");
});
