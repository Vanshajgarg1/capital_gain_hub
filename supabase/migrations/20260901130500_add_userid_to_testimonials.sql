-- 1. Add nullable user_id column
ALTER TABLE public.testimonials
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Grant table permissions (if not already granted, this ensures no permission denied errors)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT SELECT ON public.testimonials TO anon;

-- 3. RLS Policies for Students
-- Students can read their own testimonials (even if unpublished)
CREATE POLICY "Students can view their own testimonials"
ON public.testimonials FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Students can insert a testimonial as long as it belongs to them and is NOT published
CREATE POLICY "Students can insert their own unpublished testimonials"
ON public.testimonials FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND 
    is_published = false
);

-- Students can update their own unpublished testimonial, but cannot publish it
CREATE POLICY "Students can update their own unpublished testimonials"
ON public.testimonials FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() AND 
    is_published = false
)
WITH CHECK (
    user_id = auth.uid() AND 
    is_published = false
);
