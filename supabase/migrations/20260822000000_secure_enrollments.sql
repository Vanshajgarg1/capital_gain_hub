-- Drop the insecure policy that allowed students to directly insert their own enrollments
-- Enrollment is now handled securely by the trusted server-side API endpoint (/api/enroll)
-- which bypasses RLS using the service role key.

DROP POLICY IF EXISTS "Students insert own enrollments" ON enrollments;
