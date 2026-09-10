-- Allow authenticated users to insert an enrollment for themselves
CREATE POLICY "Students can enroll themselves"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
