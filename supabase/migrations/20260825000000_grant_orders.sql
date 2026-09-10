-- Fix for "permission denied for table orders/payments"
-- Grants the minimum required privileges to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL PRIVILEGES ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL PRIVILEGES ON public.payments TO service_role;
