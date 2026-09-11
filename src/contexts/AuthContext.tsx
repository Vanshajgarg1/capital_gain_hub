"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { User as UserProfile } from "@/types";

const ACTIVE_SESSION_TIMEOUT_MINUTES = 30;
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileIdRef = React.useRef<string | null>(null);

  const forceSignOut = async (redirectUrl: string) => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setProfile(null);
    profileIdRef.current = null;
    localStorage.removeItem("app_session_id");
    window.location.href = redirectUrl;
  };

  const validateAndClaimSession = async (): Promise<boolean> => {
    let appSessionId = localStorage.getItem("app_session_id");
    if (!appSessionId) {
      appSessionId = crypto.randomUUID();
      localStorage.setItem("app_session_id", appSessionId);
    }

    try {
      const { data: isClaimed, error } = await supabase.rpc("claim_active_session", {
        p_session_id: appSessionId,
        p_timeout_minutes: ACTIVE_SESSION_TIMEOUT_MINUTES
      });

      if (error) {
        console.error("Error claiming active session:", error);
        await forceSignOut("/login?error=session_ended");
        return false;
      }

      if (!isClaimed) {
        // Blocked because another device is active
        await forceSignOut("/login?error=device_active");
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Exception validating active session:", err);
      await forceSignOut("/login?error=session_ended");
      return false;
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Use getUser() to ensure token is valid and headers are fully populated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // If getUser fails, only clear session for confirmed auth errors, not network failures
          const isAuthError = error.name === 'AuthApiError' || error.status === 401 || error.status === 403 || error.status === 400 || error.message.toLowerCase().includes('token');

          if (isAuthError) {
            setUser(null);
            setProfile(null);
            profileIdRef.current = null;
          } else {
            console.warn("Network or temporary error fetching user, keeping local session:", error);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setUser(session.user);
              if (profileIdRef.current !== session.user.id) {
                await fetchProfile(session.user.id);
              }
            }
          }
          return;
        }
        
        setUser(user);
        
        if (user) {
          let currentProfile = profile;
          if (profileIdRef.current !== user.id) {
            currentProfile = await fetchProfile(user.id);
          }
          
          if (currentProfile?.role === "STUDENT") {
            const isValid = await validateAndClaimSession();
            if (!isValid) return; // handles signout and redirect internally
          }
        } else {
          setProfile(null);
          profileIdRef.current = null;
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore INITIAL_SESSION to avoid race condition where the internal Supabase 
        // client headers haven't been updated with the JWT yet, causing an 'anon' request.
        // The initial load is handled securely by fetchSession() above.
        if (event === 'INITIAL_SESSION') return;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          let currentProfile = profile;
          if (profileIdRef.current !== session.user.id) {
            currentProfile = await fetchProfile(session.user.id);
          }
          
          if (currentProfile?.role === "STUDENT") {
            const isValid = await validateAndClaimSession();
            if (!isValid) return;
          }
        } else {
          setProfile(null);
          profileIdRef.current = null;
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      setProfile(data as UserProfile);
      profileIdRef.current = userId;
      return data as UserProfile;
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      return null;
    }
  };

  // Heartbeat effect
  useEffect(() => {
    if (!user || profile?.role !== "STUDENT") return;

    let appSessionId = localStorage.getItem("app_session_id");
    if (!appSessionId) return;

    const performHeartbeat = async () => {
      try {
        const { data: isActive, error } = await supabase.rpc("update_active_session", {
          p_session_id: appSessionId
        });

        if (error || !isActive) {
          // Session is no longer valid
          await forceSignOut("/login?error=session_ended");
        }
      } catch (err) {
        console.error("Heartbeat failed", err);
      }
    };

    const intervalId = setInterval(performHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user, profile]);

  const signOut = async () => {
    try {
      setIsLoading(true);
      const appSessionId = localStorage.getItem("app_session_id");
      if (appSessionId && profile?.role === "STUDENT") {
        await supabase.rpc("clear_active_session", { p_session_id: appSessionId });
      }
      localStorage.removeItem("app_session_id");
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      profileIdRef.current = null;
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
