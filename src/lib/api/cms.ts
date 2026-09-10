import { supabase } from "@/lib/supabase";
import { CmsPage, CmsPageSlug } from "@/types/cms";

/**
 * Fetches a published CMS page by its slug.
 * Due to Row Level Security, this will ONLY return data if:
 * 1. The page exists and is_published = true.
 * 2. Only sections where is_visible = true will be returned.
 */
export async function getPublishedPage(slug: CmsPageSlug): Promise<CmsPage | null> {
  const { data, error } = await supabase
    .from("website_pages")
    .select(`
      *,
      website_sections (*)
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // PGRST116 is the "row not found" error
      console.error("Error fetching CMS page:", error);
    }
    return null;
  }

  // Sort sections by order_index
  if (data.website_sections) {
    data.website_sections.sort((a: any, b: any) => a.order_index - b.order_index);
  }

  return data as CmsPage;
}
