import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateCmsSectionInput, UpdateCmsSectionInput } from "@/types/cms";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function validateCreateSectionInput(data: any): Omit<CreateCmsSectionInput, "page_id"> | null {
  if (!data || typeof data !== "object") return null;
  
  const { section_type, content, order_index, is_visible } = data;
  
  if (!section_type || typeof section_type !== "string" || section_type.trim() === "") return null;
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  if (order_index !== undefined && !Number.isInteger(order_index)) return null;
  if (is_visible !== undefined && typeof is_visible !== "boolean") return null;

  return {
    section_type: section_type.trim(),
    content,
    ...(order_index !== undefined && { order_index }),
    ...(is_visible !== undefined && { is_visible }),
  };
}

function validateBulkUpdateSectionsInput(data: any): (UpdateCmsSectionInput & { id?: string })[] | null {
  if (!Array.isArray(data)) return null;
  
  const validated: (UpdateCmsSectionInput & { id?: string })[] = [];
  
  for (const item of data) {
    if (!item || typeof item !== "object") return null;
    
    const { id, section_type, content, order_index, is_visible } = item;
    
    if (id !== undefined && (typeof id !== "string" || id.trim() === "")) return null;
    if (section_type !== undefined && (typeof section_type !== "string" || section_type.trim() === "")) return null;
    if (content !== undefined && (typeof content !== "object" || Array.isArray(content))) return null;
    if (order_index !== undefined && !Number.isInteger(order_index)) return null;
    if (is_visible !== undefined && typeof is_visible !== "boolean") return null;
    
    validated.push({
      ...(id !== undefined && { id: id.trim() }),
      ...(section_type !== undefined && { section_type: section_type.trim() }),
      ...(content !== undefined && { content }),
      ...(order_index !== undefined && { order_index }),
      ...(is_visible !== undefined && { is_visible }),
    });
  }
  
  return validated;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
      .select("id")
      .eq("slug", slug)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const validatedBody = validateCreateSectionInput(rawBody);
    if (!validatedBody) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const insertPayload: CreateCmsSectionInput = {
      ...validatedBody,
      page_id: page.id
    };

    const { data, error } = await supabaseAdmin
      .from("website_sections")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("[CMS API] Database error inserting section:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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

    const { data: page, error: pageError } = await supabaseAdmin
      .from("website_pages")
      .select("id")
      .eq("slug", slug)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const sections = validateBulkUpdateSectionsInput(rawBody);
    if (!sections) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const sectionsWithPageId = sections.map(s => ({ ...s, page_id: page.id }));

    const { data, error } = await supabaseAdmin
      .from("website_sections")
      .upsert(sectionsWithPageId)
      .select();

    if (error) {
      console.error("[CMS API] Database error upserting sections:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[CMS API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
