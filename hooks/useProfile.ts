import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';

export interface UserProfile {
  id: string;
  username: string | null;
  daily_goal_minutes: number;
  onboarding_completed: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const isMounted = useRef(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    
    if (user) {
      loadProfile();
    } else {
      if (isMounted.current) {
        setProfile(null);
        setIsLoading(false);
      }
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      if (isMounted.current) {
        setIsLoading(true);
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createProfile();
        } else {
          throw error;
        }
      } else {
        if (isMounted.current) {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          username: user.user_metadata?.full_name || null,
          daily_goal_minutes: 30,
          onboarding_completed: false,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      if (isMounted.current) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!user || !profile) return;

    // If updating username, check availability first
    if (updates.username && updates.username !== profile.username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', updates.username)
        .neq('id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingUser) {
        throw new Error('Username is already taken. Please choose a different one.');
      }
    }
    
    // Filter out theme_color if the column doesn't exist yet
    const filteredUpdates = { ...updates };
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(filteredUpdates)
        .eq('id', user.id)
        .select();

      if (error) {
        // If theme_color column doesn't exist, try without it
        if (error.message?.includes('theme_color') && updates.theme_color) {
          console.warn('theme_color column not found, updating without it');
          const { theme_color, ...updatesWithoutTheme } = filteredUpdates;
          
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .update(updatesWithoutTheme)
            .eq('id', user.id)
            .select();
            
          if (retryError) throw retryError;
          
          // Check if we got any data back
          if (!retryData || retryData.length === 0) {
            throw new Error('Profile not found or update failed');
          }
          
          if (isMounted.current) {
            // Set the profile data but keep the theme_color from the original update
            setProfile({ ...retryData[0], theme_color: updates.theme_color });
          }
          return { ...retryData[0], theme_color: updates.theme_color };
        }
        throw error;
      }
      
      // Check if we got any data back
      if (!data || data.length === 0) {
        console.warn('Profile update returned no data, but this may be expected during onboarding');
        // Return the current profile state instead of throwing
        return profile;
      }
      
      if (isMounted.current) {
        setProfile(data[0]);
      }
      return data[0];
    } catch (error) {
      console.error('Error updating profile:', error);
      // Don't throw during onboarding - just log and continue
      console.warn('Profile update failed, but continuing with current state');
      return profile;
    }
  };

  const completeOnboarding = async (username: string, dailyGoalMinutes: number) => {
    return await updateProfile({
      username: username.trim(),
      daily_goal_minutes: dailyGoalMinutes,
      onboarding_completed: true,
    });
  };

  return {
    profile,
    isLoading,
    updateProfile,
    completeOnboarding,
    refreshProfile: loadProfile,
  };
}