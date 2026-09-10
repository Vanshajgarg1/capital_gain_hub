-- Grant public SELECT privileges for anon (enforced by RLS)
GRANT SELECT ON TABLE public.website_pages TO anon;
GRANT SELECT ON TABLE public.website_sections TO anon;

-- Grant admin mutation privileges to service_role (used by API routes)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.website_pages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.website_sections TO service_role;
