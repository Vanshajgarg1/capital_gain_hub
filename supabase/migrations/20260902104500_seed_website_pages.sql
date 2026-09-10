-- Seed initial CMS pages as DRAFTs
INSERT INTO website_pages (slug, title, is_published)
VALUES 
  ('home', 'Capital Gain Hub Home', false),
  ('about', 'About Capital Gain Hub', false),
  ('terms', 'Terms of Service', false)
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  is_published = false;
