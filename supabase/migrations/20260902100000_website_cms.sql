-- 1. Create website_pages table
CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('home', 'about', 'terms')),
  title TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for website_pages
CREATE TRIGGER set_website_pages_updated_at
BEFORE UPDATE ON website_pages
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- 2. Create website_sections table
CREATE TABLE website_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for website_sections
CREATE TRIGGER set_website_sections_updated_at
BEFORE UPDATE ON website_sections
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- 3. Indexes
CREATE INDEX idx_website_pages_slug ON website_pages(slug);
CREATE INDEX idx_website_sections_page_id ON website_sections(page_id);
CREATE INDEX idx_website_sections_order_index ON website_sections(order_index);

-- 4. Enable RLS
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Public can read published pages
CREATE POLICY "Public can read published pages" 
ON website_pages FOR SELECT 
USING (is_published = true);

-- Public can read visible sections belonging to published pages
CREATE POLICY "Public can read visible sections of published pages" 
ON website_sections FOR SELECT 
USING (
  is_visible = true 
  AND EXISTS (
    SELECT 1 FROM website_pages 
    WHERE website_pages.id = website_sections.page_id 
    AND website_pages.is_published = true
  )
);
