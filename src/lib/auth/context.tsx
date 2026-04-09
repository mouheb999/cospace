'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string; role: 'client' | 'admin'; referral_code?: string }) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    console.log('[Auth] Fetching profile for:', userId);
    const { data, error, status } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1);

    console.log('[Auth] Profile fetch status:', status, 'Data:', data?.length ?? 'null', 'Error:', error);

    if (error) {
      console.error('[Auth] Error fetching profile:', JSON.stringify(error, null, 2));
      return null;
    }

    return (data?.[0] as Profile) ?? null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing auth...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[Auth] Session:', currentSession ? 'found' : 'none', 'Error:', sessionError);

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const profileData = await fetchProfile(currentSession.user.id);
          setProfile(profileData);
          console.log('[Auth] Profile loaded:', profileData ? 'yes' : 'no');
        } else {
          console.log('[Auth] No session found');
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        console.log('[Auth] Init complete, setting isLoading=false');
        setIsLoading(false);
      }
    };

    initAuth();

    // Safety timeout: if auth takes > 5s, stop loading to prevent stuck screen
    const timeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) console.warn('[Auth] Timeout: forcing isLoading=false after 5s');
        return false;
      });
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { first_name: string; last_name: string; role: 'client' | 'admin'; referral_code?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      return { error: error as Error, user: null };
    }

    // Create profile
    if (data.user) {
      const referralCode = `CS${data.user.id.slice(0, 6).toUpperCase()}`;
      
      const profileData = {
        id: data.user.id,
        email,
        first_name: metadata.first_name,
        last_name: metadata.last_name,
        role: metadata.role,
        referral_code: referralCode,
        referred_by: metadata.referral_code || null,
      };
      const { error: profileError } = await supabase.from('profiles').insert(profileData as never);

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return { error: null, user: data.user };
  };

  const signOut = async () => {
    // Clear Supabase session completely
    await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setProfile(null);
    setSession(null);
    // Force a full page refresh to clear any cached session data
    // Redirect to landing page after logout
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
