import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  justSignedUp: boolean;
}

export function useAuth() {
  const isMounted = useRef(true);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    justSignedUp: false,
  });

  useEffect(() => {
    isMounted.current = true;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
        } else if (session) {
          console.log('✅ Found existing session for user:', session.user?.email);
        } else {
          console.log('ℹ️ No existing session found');
        }
        
        if (isMounted.current) {
          setAuthState(prev => ({
            user: session?.user ?? null,
            session,
            loading: false,
            justSignedUp: false, // Always false for existing sessions
          }));
        }
      } catch (error) {
        console.error('❌ Session error:', error);
        if (isMounted.current) {
          setAuthState(prev => ({
            user: null,
            session: null,
            loading: false,
            justSignedUp: false, // Reset to false on error
          }));
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
        if (isMounted.current) {
          setAuthState(prev => {
            console.log('🔍 Previous justSignedUp:', prev.justSignedUp, 'Event:', event);
            return {
              user: session?.user ?? null,
              session,
              loading: false,
              justSignedUp: prev.justSignedUp, // Preserve the justSignedUp flag
            };
          });
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting to sign in with email:', email);
      console.log('🌐 Supabase URL being used:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log('✅ Sign in successful, session saved:', !!data.session);
      return data;
    } catch (error) {
      console.error('❌ Sign in error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Unable to connect to Supabase. Please check:\n1. Your internet connection\n2. That your Supabase URL and key are correct\n3. That your Supabase project is active');
        }
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('📝 Attempting to sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Mark that this user just signed up
      if (isMounted.current) {
        console.log('🎯 Setting justSignedUp to true for new user');
        setAuthState(prev => {
          console.log('🎯 Previous state before setting justSignedUp:', prev.justSignedUp);
          return {
            ...prev,
            justSignedUp: true,
          };
        });
      }
      
      console.log('✅ Sign up successful, user just signed up:', !!data.user);
      return data;
    } catch (error) {
      console.error('❌ Sign up error:', error);
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = makeRedirectUri({
        path: '/auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Open the OAuth URL
      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          
          if (result.type === 'success' && result.url) {
            // Handle the callback URL
            const url = new URL(result.url);
            const params = new URLSearchParams(url.hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken) {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (sessionError) throw sessionError;
              return sessionData;
            }
          }
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out user...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
    console.log('✅ Sign out successful');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const clearJustSignedUp = () => {
    if (isMounted.current) {
      setAuthState(prev => ({
        ...prev,
        justSignedUp: false,
      }));
    }
  };

  return {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearJustSignedUp,
  };
}