import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateCmsPageInput } from "@/types/cms";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function validateUpdatePageInput(data: any): UpdateCmsPageInput | null {
  if (!data || typeof data !== "object") return null;
  
  const { title, seo_title, seo_description, is_published } = data;
  
  // If no fields are provided, it's invalid for an update
  if (title === undefined && seo_title === undefined && seo_description === undefined && is_published === undefined) {
    return null;
  }

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) return null;
  if (seo_title !== undefined && typeof seo_title !== "string" && seo_title !== null) return null;
  if (seo_description !== undefined && typeof seo_description !== "string" && seo_description !== null) return null;
  if (is_published !== undefined && typeof is_published !== "boolean") return null;

  return {
    ...(title !== undefined && { title: title.trim() }),
    ...(seo_title !== undefined && { seo_title: seo_title === null ? null : seo_title.trim() }),
    ...(seo_description !== undefined && { seo_description: seo_description === null ? null : seo_description.trim() }),
    ...(is_published !== undefined && { is_published }),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from("website_pages")
      .select("*")
      .eq("slug", slug)
      .single();

    if (pageError) {
      if (pageError.code === 'PGRST116') {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      console.error(`[CMS GET] slug: ${slug} step: website_pages error_code: ${pageError.code} error_message: ${pageError.message}`);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from("website_sections")
      .select("*")
      .eq("page_id", page.id)
      .order("order_index", { ascending: true });

    if (sectionsError) {
      console.error(`[CMS GET] slug: ${slug} step: website_sections error_code: ${sectionsError.code} error_message: ${sectionsError.message}`);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    
    return NextResponse.json({ ...page, sections: sections || [] });
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const validatedBody = validateUpdatePageInput(rawBody);
    if (!validatedBody) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("website_pages")
      .update(validatedBody)
      .eq("slug", slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      console.error("[CMS API] Database error updating page:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
