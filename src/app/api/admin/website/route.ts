import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateCmsPageInput, CmsPageSlug } from "@/types/cms";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_SLUGS: CmsPageSlug[] = ["home", "about", "terms"];

function validateCreatePageInput(data: any): CreateCmsPageInput | null {
  if (!data || typeof data !== "object") return null;
  
  const { slug, title, seo_title, seo_description, is_published } = data;
  
  if (!slug || typeof slug !== "string" || !ALLOWED_SLUGS.includes(slug as CmsPageSlug)) return null;
  if (!title || typeof title !== "string" || title.trim() === "") return null;
  if (seo_title !== undefined && typeof seo_title !== "string") return null;
  if (seo_description !== undefined && typeof seo_description !== "string") return null;
  if (is_published !== undefined && typeof is_published !== "boolean") return null;

  return {
    slug: slug as CmsPageSlug,
    title: title.trim(),
    ...(seo_title !== undefined && { seo_title: seo_title.trim() }),
    ...(seo_description !== undefined && { seo_description: seo_description.trim() }),
    ...(is_published !== undefined && { is_published }),
  };
}

export async function GET(request: Request) {
  try {
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

    const { data, error } = await supabaseAdmin
      .from("website_pages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CMS API] Error fetching pages:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const validatedBody = validateCreatePageInput(rawBody);
    if (!validatedBody) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("website_pages")
      .insert([validatedBody])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return NextResponse.json({ error: "Resource conflict" }, { status: 409 });
      }
      console.error("[CMS API] Database error inserting page:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
