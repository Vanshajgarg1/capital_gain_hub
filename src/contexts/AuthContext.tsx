"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { User as UserProfile } from "@/types";

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

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Use getUser() to ensure token is valid and headers are fully populated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          // If getUser fails (e.g., token expired), clear session
          setUser(null);
          setProfile(null);
          return;
        }
        
        setUser(user);
        
        if (user) {
          await fetchProfile(user.id);
        } else {
          setProfile(null);
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
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
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
        return;
      }
      
      setProfile(data as UserProfile);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
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
