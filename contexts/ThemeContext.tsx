import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';

export type ThemeColor = 'emerald' | 'pink' | 'red' | 'blue' | 'orange' | 'purple';

export interface Theme {
  id: ThemeColor;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  surface: string;
}

export const themes: Record<ThemeColor, Theme> = {
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#10B981',
    accent: '#ECFDF5',
    background: '#F8FAFC',
    surface: '#FFFFFF',
  },
  pink: {
    id: 'pink',
    name: 'Pink',
    primary: '#EC4899',
    primaryDark: '#DB2777',
    primaryLight: '#F472B6',
    accent: '#FDF2F8',
    background: '#FEF7F7',
    surface: '#FFFFFF',
  },
  red: {
    id: 'red',
    name: 'Red',
    primary: '#EF4444',
    primaryDark: '#DC2626',
    primaryLight: '#F87171',
    accent: '#FEF2F2',
    background: '#FEF7F7',
    surface: '#FFFFFF',
  },
  blue: {
    id: 'blue',
    name: 'Blue',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    accent: '#EFF6FF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    primary: '#F97316',
    primaryDark: '#EA580C',
    primaryLight: '#FB923C',
    accent: '#FFF7ED',
    background: '#FFFBF5',
    surface: '#FFFFFF',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',
    accent: '#F5F3FF',
    background: '#FDFCFF',
    surface: '#FFFFFF',
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: ThemeColor) => Promise<void>;
  isChangingTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { profile, updateProfile } = useProfile();
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.emerald);
  const [isChangingTheme, setIsChangingTheme] = useState(false);

  // Load theme from profile
  useEffect(() => {
    if (profile?.theme_color && themes[profile.theme_color]) {
      setCurrentTheme(themes[profile.theme_color]);
    }
  }, [profile?.theme_color]);

  const setTheme = async (themeId: ThemeColor) => {
    if (isChangingTheme) return;
    
    setIsChangingTheme(true);
    try {
      // Update theme in state immediately for better UX
      setCurrentTheme(themes[themeId]);
      
      // Try to update profile in database, but don't fail if theme_color column doesn't exist
      try {
        await updateProfile({ theme_color: themeId });
      } catch (error) {
        console.warn('Could not save theme to database:', error);
        // Theme is still applied in memory, so continue
      }
    } catch (error) {
      console.error('Error changing theme:', error);
      // Revert theme on error
      if (profile?.theme_color) {
        setCurrentTheme(themes[profile.theme_color]);
      }
      // Don't throw error to prevent app crashes during onboarding
    } finally {
      setIsChangingTheme(false);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, isChangingTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}