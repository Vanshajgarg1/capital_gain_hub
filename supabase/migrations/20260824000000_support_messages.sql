-- Migration: support_messages table

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_support_messages_updated_at
BEFORE UPDATE ON support_messages
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL PRIVILEGES ON public.support_messages TO service_role;

-- Policies
CREATE POLICY "Students read own messages, admins read all"
ON support_messages FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Students can insert own messages"
ON support_messages FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage messages"
ON support_messages FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete messages"
ON support_messages FOR DELETE
USING (public.is_admin());
