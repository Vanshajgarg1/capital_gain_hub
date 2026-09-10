-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    certificate_url TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own certificates
CREATE POLICY "Users can view their own certificates" 
ON public.certificates 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificates', 'certificates', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can view their own certificates in storage
CREATE POLICY "Users can view their own certificates in storage"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'certificates' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
