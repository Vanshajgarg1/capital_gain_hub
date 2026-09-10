export type CmsPageSlug = "home" | "about" | "terms";

export interface CmsSection {
  id: string;
  page_id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  slug: CmsPageSlug;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  sections?: CmsSection[];
}

export interface CreateCmsPageInput {
  slug: CmsPageSlug;
  title: string;
  seo_title?: string;
  seo_description?: string;
  is_published?: boolean;
}

export type UpdateCmsPageInput = Partial<CreateCmsPageInput>;

export interface CreateCmsSectionInput {
  page_id: string;
  section_type: string;
  content: Record<string, any>;
  order_index?: number;
  is_visible?: boolean;
}

export type UpdateCmsSectionInput = Partial<Omit<CreateCmsSectionInput, "page_id">>;
