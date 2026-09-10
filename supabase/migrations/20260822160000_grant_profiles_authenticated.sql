-- Fix for "permission denied for table profiles"
-- Grants minimum required privileges to authenticated users, avoiding anon access
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.profiles TO service_role;
