-- 1. Rename existing table and its trigger
ALTER TABLE public.support_messages RENAME TO support_tickets;
ALTER TRIGGER set_support_messages_updated_at ON public.support_tickets RENAME TO set_support_tickets_updated_at;

-- NOTE: The existing trigger `set_support_tickets_updated_at` fires BEFORE UPDATE
-- and uses `handle_updated_at()`, meaning ANY ticket status update will automatically 
-- update `updated_at` natively without extra code.

-- 2. Create the new support_messages table for conversational replies
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS and Grants on the new table
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL PRIVILEGES ON public.support_messages TO service_role;

-- 4. RLS Policies for the new table
CREATE POLICY "Students can read messages of their own tickets"
ON public.support_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = support_messages.ticket_id 
        AND st.user_id = auth.uid()
    )
    OR public.is_admin()
);

CREATE POLICY "Students can insert messages to their own tickets"
ON public.support_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_tickets st 
        WHERE st.id = support_messages.ticket_id 
        AND st.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
);

CREATE POLICY "Admins can insert any message"
ON public.support_messages FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage messages"
ON public.support_messages FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete messages"
ON public.support_messages FOR DELETE
USING (public.is_admin());

-- 5. Migrate existing message data from support_tickets into support_messages
-- This preserves the exact row count, original user_id (as sender_id), and original created_at.
INSERT INTO public.support_messages (ticket_id, sender_id, message, created_at)
SELECT id, user_id, message, created_at
FROM public.support_tickets;

-- 6. Drop the redundant message column from tickets now that it's moved
ALTER TABLE public.support_tickets DROP COLUMN message;

-- 7. Create secure timestamp trigger for ticket updates upon new replies
CREATE OR REPLACE FUNCTION update_ticket_timestamp_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.support_tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_support_tickets_on_new_message
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION update_ticket_timestamp_on_reply();
