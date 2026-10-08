-- Idempotently create a unique index to prevent a user from accumulating multiple PENDING
-- orders for the same course (which leads to duplicate checkouts).
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_order
ON public.orders (user_id, course_id)
WHERE status = 'PENDING';
