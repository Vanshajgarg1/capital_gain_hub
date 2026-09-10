-- Create FAQs table
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER set_faqs_updated_at
BEFORE UPDATE ON faqs
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy (Public + Admin)
CREATE POLICY "Public can read published FAQs, admins read all"
ON faqs FOR SELECT
USING (is_published = true OR public.is_admin());

-- 2. INSERT Policy (Admin only)
CREATE POLICY "Admins can insert FAQs"
ON faqs FOR INSERT WITH CHECK (public.is_admin());

-- 3. UPDATE Policy (Admin only)
CREATE POLICY "Admins can update FAQs"
ON faqs FOR UPDATE USING (public.is_admin());

-- 4. DELETE Policy (Admin only)
CREATE POLICY "Admins can delete FAQs"
ON faqs FOR DELETE USING (public.is_admin());
