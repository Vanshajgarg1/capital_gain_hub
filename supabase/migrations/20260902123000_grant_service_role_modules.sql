-- Grant module management privileges to service_role (used by Admin API routes)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO service_role;
