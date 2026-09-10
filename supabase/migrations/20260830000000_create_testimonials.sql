-- Create Testimonials Table
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    review_text TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to testimonials"
    ON public.testimonials
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Everyone can read published testimonials
CREATE POLICY "Anyone can view published testimonials"
    ON public.testimonials
    FOR SELECT
    USING (is_published = true);

-- Add index for performance on reading published
CREATE INDEX idx_testimonials_published ON public.testimonials(is_published);
-- Add index for course relation
CREATE INDEX idx_testimonials_course ON public.testimonials(course_id);
