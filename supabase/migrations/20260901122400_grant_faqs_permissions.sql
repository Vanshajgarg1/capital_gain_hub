-- Grant table-level permissions to the authenticated role for full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

-- Grant table-level permission to the anon role for reading published FAQs
GRANT SELECT ON public.faqs TO anon;
