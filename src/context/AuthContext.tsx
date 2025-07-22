'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Get the Supabase URL from environment or use default
// (Removed unused supabaseUrl variable)

type UserRole = 'owner' | 'staff' | null;

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{
    error: any | null;
  }>;
  signUp: (email: string, password: string, role: UserRole) => Promise<{
    error: any | null;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setUserRole(profile?.role as UserRole);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role from profiles table
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            setUserRole(profile?.role as UserRole);
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          setUserRole(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    console.log('Starting sign in process...');
    
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('User is offline');
        setAuthError('You are offline. Please check your internet connection.');
        return { error: { message: 'You are offline. Please check your internet connection.' } };
      }
      
      console.log('User is online, attempting sign in...');
      console.log('Supabase client available:', !!supabase);
      console.log('Supabase auth available:', !!supabase.auth);
      
      // Retry logic for transient errors (up to 2 retries)
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`Sign in attempt ${attempt + 1}/3`);
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          console.log('Sign in response:', { data: !!data, error: !!error });
          
          if (!error) {
            console.log('Sign in successful');
            setAuthError(null);
            return { error: null };
          }
          
          console.log('Sign in error:', error);
          lastError = error;
          
          if (error.status === 429 || error.status === 503) {
            console.log(`Retrying after ${500 * (attempt + 1)}ms due to status ${error.status}`);
            await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
          } else {
            console.log('Not retrying - non-retryable error');
            break;
          }
        } catch (err) {
          console.error('Exception during sign in attempt:', err);
          lastError = err;
          await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
        }
      }
      
      console.log('Final error:', lastError);
      const errorMessage = (lastError && typeof lastError === 'object' && 'message' in lastError) ? (lastError as any).message : String(lastError);
      setAuthError(errorMessage || 'Failed to sign in. Please try again.');
      return { error: lastError };
    } catch (e) {
      console.error('Unexpected error in signIn:', e);
      setAuthError('Unexpected error during sign in. Please check your connection and try again.');
      return { error: { message: 'Unexpected error during sign in. Please check your connection and try again.' } };
    }
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    setAuthError(null);
    try {
      const { error, data } = await supabase.auth.signUp({ email, password });
      
      if (!error && data.user) {
        // Create a profile with role
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          role,
          created_at: new Date().toISOString()
        });
      }
      
      if (error) {
        setAuthError(error.message || 'Failed to create account. Please try again.');
      }
      
      return { error };
    } catch (e) {
      setAuthError('Unexpected error during sign up. Please check your connection and try again.');
      return { error: { message: 'Unexpected error during sign up. Please check your connection and try again.' } };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserRole(null);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  // Don't render any content until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  const value = {
    user,
    session,
    userRole,
    isLoading,
    authError,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
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