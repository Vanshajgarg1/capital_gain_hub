-- Fix for "Failed to fetch lesson progress (RLS/42501)"
-- Grants the minimum required privileges to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL PRIVILEGES ON public.lesson_progress TO service_role;
