-- Idempotently drop the insecure policy that allowed authenticated users to bypass the
-- trusted server-side enrollment process by inserting directly into the database.
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.enrollments;

-- Revoke the INSERT permission from the authenticated role as a defense-in-depth measure.
-- Legitimate enrollments are handled by the server using the service_role key,
-- so authenticated users do not need direct table-level INSERT access.
REVOKE INSERT ON public.enrollments FROM authenticated;
