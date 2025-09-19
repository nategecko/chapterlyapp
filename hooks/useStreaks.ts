import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export interface UserStreak {
  id: string;
  user_id: string;
  date: string;
  minutes_read: number;
  goal_met: boolean;
  created_at: string;
}

export function useStreaks() {
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      // Add small delay to prevent blocking initial render
      const timer = setTimeout(() => {
        loadStreaks();
      }, 150);
      return () => {
        clearTimeout(timer);
        isMounted.current = false;
      };
    } else {
      if (isMounted.current) {
        setStreaks([]);
        setIsLoading(false);
      }
    }
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const loadStreaks = async () => {
    if (!user) return;
    
    try {
      if (isMounted.current) {
        setIsLoading(true);
      }
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      if (isMounted.current) {
        setStreaks(data || []);
      }
    } catch (error) {
      console.error('Error loading streaks:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const updateTodayStreak = async (minutesRead: number) => {
    if (!user || !profile) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const goalMet = minutesRead >= profile.daily_goal_minutes;

      const { error } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: user.id,
          date: today,
          minutes_read: minutesRead,
          goal_met: goalMet,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;
      
      // Reload streaks to get updated data
      await loadStreaks();
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  };

  const getCurrentStreak = () => {
    if (streaks.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    
    // Sort streaks by date descending
    const sortedStreaks = [...streaks].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Check if today has a streak
    const todayStr = today.toISOString().split('T')[0];
    const todayStreak = sortedStreaks.find(s => s.date === todayStr);
    
    // If today doesn't have a goal met, check yesterday
    let checkDate = new Date(today);
    if (!todayStreak?.goal_met) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days with goal met
    for (const streakData of sortedStreaks) {
      const streakDate = checkDate.toISOString().split('T')[0];
      
      if (streakData.date === streakDate && streakData.goal_met) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streakData.date === streakDate) {
        // Found the date but goal wasn't met, break the streak
        break;
      }
    }

    return streak;
  };

  const getWeeklyStreaks = () => {
    const today = new Date();
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStreak = streaks.find(s => s.date === dateStr);
      const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
      
      weeklyData.push({
        day: dayName,
        date: dateStr,
        goalReached: dayStreak?.goal_met || false,
        minutes: dayStreak?.minutes_read || 0,
      });
    }
    
    return weeklyData;
  };

  const getTodayMinutes = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStreak = streaks.find(s => s.date === today);
    return todayStreak?.minutes_read || 0;
  };

  const getWeeklyMinutes = () => {
    const weeklyData = getWeeklyStreaks();
    return weeklyData.reduce((total, day) => total + day.minutes, 0);
  };

  return {
    streaks,
    isLoading,
    updateTodayStreak,
    getCurrentStreak,
    getWeeklyStreaks,
    getTodayMinutes,
    getWeeklyMinutes,
    refreshStreaks: loadStreaks,
  };
}