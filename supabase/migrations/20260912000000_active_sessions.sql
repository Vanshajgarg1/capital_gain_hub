-- Migration: Active Sessions for Single Device Login

CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to see and manage their own sessions
CREATE POLICY "Users can manage their own active sessions"
ON active_sessions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RPC to securely claim an active session atomically
CREATE OR REPLACE FUNCTION claim_active_session(p_session_id UUID, p_timeout_minutes INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Always use auth.uid() for security boundary
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Remove any stale session for this user
  DELETE FROM active_sessions 
  WHERE user_id = v_user_id 
    AND last_seen < (NOW() - (p_timeout_minutes || ' minutes')::interval);

  -- 2. Attempt to upsert the new session_id
  -- This is atomic and safe against race conditions due to the UNIQUE(user_id) constraint.
  INSERT INTO active_sessions (user_id, session_id, last_seen, created_at)
  VALUES (v_user_id, p_session_id, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET last_seen = NOW()
  WHERE active_sessions.session_id = p_session_id;

  -- 3. Verify if we successfully claimed it (either we just inserted it, or we already owned it)
  IF EXISTS (SELECT 1 FROM active_sessions WHERE user_id = v_user_id AND session_id = p_session_id) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC to heartbeat / update last_seen securely
CREATE OR REPLACE FUNCTION update_active_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE active_sessions 
  SET last_seen = NOW() 
  WHERE user_id = v_user_id AND session_id = p_session_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC to explicitly clear active session upon logout
CREATE OR REPLACE FUNCTION clear_active_session(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM active_sessions 
    WHERE user_id = v_user_id AND session_id = p_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
