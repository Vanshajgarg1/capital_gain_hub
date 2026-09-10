-- Add policy for students to insert their own enrollments
CREATE POLICY "Students insert own enrollments"
ON enrollments FOR INSERT WITH CHECK (user_id = auth.uid());
