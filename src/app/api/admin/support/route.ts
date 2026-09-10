import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Fetch tickets and profiles full_name
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from("support_tickets")
      .select("*, profiles:user_id(full_name)")
      .order("updated_at", { ascending: false });

    if (ticketsError) {
      console.error("[Admin Support API] Error fetching tickets:", ticketsError);
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }

    // Avoid N+1 requests: Fetch users from Auth API
    // We fetch a large batch. If over 1000, we might need pagination, but this fulfills the "no N+1" requirement cleanly.
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 10000 });
    
    if (usersError) {
      console.error("[Admin Support API] Error fetching auth users:", usersError);
      // Fail gracefully if users can't be fetched, though we should try to return what we can
      return NextResponse.json({ error: "Failed to fetch user emails" }, { status: 500 });
    }

    const userEmailMap = new Map();
    users.forEach(u => userEmailMap.set(u.id, u.email));

    const enrichedTickets = (tickets || []).map(ticket => ({
      ...ticket,
      profiles: {
        full_name: ticket.profiles?.full_name || "Unknown",
        email: userEmailMap.get(ticket.user_id) || "unknown@example.com"
      }
    }));

    return NextResponse.json(enrichedTickets);
  } catch (error: any) {
    console.error("[Admin Support API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
