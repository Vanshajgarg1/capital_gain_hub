-- Enable RLS on all 8 tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Secure Admin Check Function
-- Bypasses RLS (SECURITY DEFINER) to avoid infinite recursion when querying profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  SELECT role = 'ADMIN' INTO is_admin_user FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke default public access and restrict to authenticated and service_role contexts
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 1. Profiles Policies
CREATE POLICY "Users can read own profile or admins can read all"
ON profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile safely"
ON profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (
  (auth.uid() = id AND public.is_admin() = false AND role = 'STUDENT') OR 
  (public.is_admin() = true)
);

-- 2. Courses Policies
CREATE POLICY "Students can read published non-archived courses, admins read all"
ON courses FOR SELECT
USING ((is_published = true AND is_archived = false) OR public.is_admin());

CREATE POLICY "Admins can insert courses"
ON courses FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update courses"
ON courses FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete courses"
ON courses FOR DELETE USING (public.is_admin());

-- 3. Modules Policies
CREATE POLICY "Students can read modules of published courses, admins read all"
ON modules FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = modules.course_id 
    AND courses.is_published = true 
    AND courses.is_archived = false
  )
);

CREATE POLICY "Admins can insert modules"
ON modules FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update modules"
ON modules FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete modules"
ON modules FOR DELETE USING (public.is_admin());

-- 4. Lessons Policies
CREATE POLICY "Students can read lessons of published courses, admins read all"
ON lessons FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM modules 
    JOIN courses ON courses.id = modules.course_id 
    WHERE modules.id = lessons.module_id 
    AND courses.is_published = true 
    AND courses.is_archived = false
  )
);

CREATE POLICY "Admins can insert lessons"
ON lessons FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update lessons"
ON lessons FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete lessons"
ON lessons FOR DELETE USING (public.is_admin());

-- 5. Enrollments Policies
CREATE POLICY "Students read own enrollments, admins read all"
ON enrollments FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage enrollments (insert)"
ON enrollments FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage enrollments (update)"
ON enrollments FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins manage enrollments (delete)"
ON enrollments FOR DELETE USING (public.is_admin());

-- 6. Lesson Progress Policies
CREATE POLICY "Students read own progress, admins read all"
ON lesson_progress FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students and admins can insert progress"
ON lesson_progress FOR INSERT
WITH CHECK (
  (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON m.course_id = e.course_id
      WHERE l.id = lesson_id 
      AND e.user_id = auth.uid()
    )
  ) OR public.is_admin()
);

CREATE POLICY "Students and admins can update progress"
ON lesson_progress FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (
  (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON m.course_id = e.course_id
      WHERE l.id = lesson_id 
      AND e.user_id = auth.uid()
    )
  ) OR public.is_admin()
);

CREATE POLICY "Admins can delete progress"
ON lesson_progress FOR DELETE USING (public.is_admin());

-- 7. Orders Policies
CREATE POLICY "Students read own orders, admins read all"
ON orders FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins manage orders (insert)"
ON orders FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage orders (update)"
ON orders FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins manage orders (delete)"
ON orders FOR DELETE USING (public.is_admin());

-- 8. Payments Policies
CREATE POLICY "Students read own payments via orders, admins read all"
ON payments FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = payments.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins manage payments (insert)"
ON payments FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage payments (update)"
ON payments FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins manage payments (delete)"
ON payments FOR DELETE USING (public.is_admin());
