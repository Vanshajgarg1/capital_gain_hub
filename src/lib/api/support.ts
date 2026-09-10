import { supabase } from "@/lib/supabase";
import { SupportTicket, SupportMessage } from "@/types";

export async function createSupportTicket(subject: string, message: string): Promise<SupportTicket> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Create Ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert([{ user_id: user.id, subject, status: "OPEN" }])
    .select()
    .single();

  if (ticketError) throw ticketError;

  // 2. Insert first message
  const { error: msgError } = await supabase
    .from("support_messages")
    .insert([{ ticket_id: ticket.id, sender_id: user.id, message }]);

  if (msgError) throw msgError;

  return ticket as SupportTicket;
}

export async function getMySupportTickets(): Promise<SupportTicket[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch support tickets:", error);
    return [];
  }

  return data as SupportTicket[];
}

export async function getSupportTicketDetails(ticketId: string): Promise<{ ticket: SupportTicket & { profiles?: { full_name: string; email: string } }; messages: SupportMessage[] }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error("Not authenticated");

  // If the user is an admin, they should use the API route to get full details including email
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  
  if (profile?.role === "ADMIN") {
    const response = await fetch(`/api/admin/support/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch ticket details");
    }

    return response.json();
  }

  // Student flow (fallback, using RLS)
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (ticketError) throw ticketError;

  const { data: messages, error: msgError } = await supabase
    .from("support_messages")
    .select("*, profiles:sender_id(full_name, role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (msgError) throw msgError;

  return { ticket: ticket as SupportTicket, messages: messages as unknown as SupportMessage[] };
}

export async function replyToTicket(ticketId: string, message: string): Promise<SupportMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("support_messages")
    .insert([{ ticket_id: ticketId, sender_id: user.id, message }])
    .select()
    .single();

  if (error) throw error;
  return data as SupportMessage;
}

// ADMIN FUNCTIONS
export async function getAllSupportTickets(): Promise<(SupportTicket & { profiles: { full_name: string; email: string } })[]> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error("Not authenticated");

  const response = await fetch("/api/admin/support", {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch tickets");
  }

  return response.json();
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket> {
  const { data, error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;
  return data as SupportTicket;
}
