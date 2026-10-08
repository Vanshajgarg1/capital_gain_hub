# Checkout Regression Audit Report

## 1. Investigation of EXISTING_ORDER_PRICE_MISMATCH

**Location:** `src/app/api/checkout/route.ts` around line 318.

When a user initiates checkout, the route fetches all existing `PENDING` orders for that user and course. Inside the loop, it fetches the Razorpay gateway order. After verifying the gateway order is unpaid (`rzpOrder.status === 'created'`), it checks if the local order amount and gateway order amount match the *current* course price:

```typescript
const amountMatches =
  Number.isFinite(localAmount) &&
  Math.round(localAmount * 100) === amountPaise &&
  Number(rzpOrder.amount) === amountPaise &&
  rzpOrder.currency === "INR";

if (!amountMatches) {
  // Returns 409 EXISTING_ORDER_PRICE_MISMATCH
}
```

## 2. Root Cause Analysis

*   **What existing order was found:** An older `PENDING` order created by the same user for the same course before the price change.
*   **What amount the existing order contains:** The old price (e.g., ₹999).
*   **What current course price is:** The new expected price (e.g., ₹1499).
*   **Why the route now blocks checkout:** The recent security hardening tests forced the route to aggressively "fail closed" on any discrepancy. Because `999 != 1499`, it returns a `409` error instead of discarding the stale pending order. The user is now permanently blocked because this old `PENDING` order is never cleared, and the unique constraint `idx_unique_pending_order` prevents a new one from being created alongside it.
*   **Which change introduced this:** The behavior was introduced during the payment-security test expansion when tests were written to expect a `409` conflict to prevent "unauthorized undercharge", instead of the previously working behavior (which likely just cancelled or ignored the stale order and created a new one).

## 3. Checkout Behaviors Changed Recently

1.  **EXISTING_ORDER_PRICE_MISMATCH:** Started returning a terminal 409 on price mismatch, blocking users permanently.
2.  **PAYMENT_SESSION_STALE:** Added strict tracking for Razorpay orders that were deleted/missing (400 Bad Request).
3.  **PAYMENT_GATEWAY_UNAVAILABLE:** Began failing closed (503) on transient Razorpay API errors rather than ignoring them.
4.  **Stale order cancellation:** Just added logic to auto-cancel local orders if the gateway order explicitly returns "does not exist".
5.  **Unique pending order logic:** Added `idx_unique_pending_order` to strictly enforce 1 pending order per course/user to prevent race conditions.

## 4. How the Pending Order Should Be Handled

**Option B: Replaced Safely.**

Since the route already checks `rzpOrder.status === "paid"` and `rzpOrder.status !== "created"` *before* it reaches the amount mismatch check, we have cryptographic certainty from Razorpay that the existing order is **unpaid**.

Therefore, if the price mismatches an unpaid order, there is no risk of losing money or double-charging. The safest and most user-friendly approach is to **cancel the stale local order** and move on to create a new one with the correct price.

## 5. Recommended Minimal Code Change

To restore the working browser checkout while maintaining all security properties, we simply need to update the `!amountMatches` block to update the old order status to `CANCELLED` and `continue`, which allows the route to fall through and safely create a new `201` order.

```typescript
      if (!amountMatches) {
        console.error(`[Checkout:${reqId}] Existing order price mismatch. Cancelling stale order.`, {
          courseId: course_id,
          localOrderId: pendingOrder.id,
          localAmount,
          expectedAmountPaise: amountPaise,
          gatewayAmount: rzpOrder.amount,
        });

        // The order is unpaid (status === 'created'), so it is safe to cancel and replace.
        const { error: cancelError } = await supabaseAdmin
          .from("orders")
          .update({ status: "CANCELLED" })
          .eq("id", pendingOrder.id);

        if (cancelError) {
          console.error(`[Checkout:${reqId}] Failed to cancel mismatched order`, cancelError);
          return NextResponse.json(
            { error: "EXISTING_ORDER_PRICE_MISMATCH", message: "Please contact support." },
            { status: 500 }
          );
        }

        // Move to the next pending order, or fall through to create a new one.
        continue;
      }
```
