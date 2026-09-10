import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
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

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .select("*, profiles:user_id(full_name)")
      .eq("id", ticketId)
      .single();

    if (ticketError) {
      return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from("support_messages")
      .select("*, profiles:sender_id(full_name, role)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Fetch user email
    let email = "unknown@example.com";
    try {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id);
      if (!authUserError && authUser?.user) {
        email = authUser.user.email || "unknown@example.com";
      }
    } catch (e) {
      console.error("[Admin Ticket API] Failed to fetch email for user", ticket.user_id);
    }

    const enrichedTicket = {
      ...ticket,
      profiles: {
        full_name: ticket.profiles?.full_name || "Unknown",
        email
      }
    };

    return NextResponse.json({ ticket: enrichedTicket, messages: messages || [] });
  } catch (error: any) {
    console.error("[Admin Ticket API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
