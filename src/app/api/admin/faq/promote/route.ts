import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { question, answer, category } = rawBody;

    if (!question || typeof question !== "string" || !answer || typeof answer !== "string") {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
    }

    const normalizedQuestion = question.trim().replace(/\s+/g, ' ');

    // Check for duplicate
    const { data: existing, error: searchError } = await supabaseAdmin
      .from("faqs")
      .select("id")
      .ilike("question", normalizedQuestion)
      .limit(1);

    if (searchError) {
      console.error("[FAQ Promote API] Search error:", searchError);
      return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "This question already exists in the Knowledge Base." }, { status: 409 });
    }

    // Get max order_index
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from("faqs")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderError) {
      console.error("[FAQ Promote API] Max order error:", maxOrderError);
      return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
    }

    const nextOrderIndex = maxOrderData && typeof maxOrderData.order_index === "number" 
      ? maxOrderData.order_index + 1 
      : 0;

    const { data, error } = await supabaseAdmin
      .from("faqs")
      .insert({
        question: normalizedQuestion,
        answer: answer.trim(),
        category: category ? category.trim() : null,
        order_index: nextOrderIndex,
        is_published: true
      })
      .select()
      .single();

    if (error) {
      console.error("[FAQ Promote API] Insert error:", error);
      return NextResponse.json({ error: "Failed to add to Knowledge Base" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[FAQ Promote API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
