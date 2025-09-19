import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Lobster': require('../assets/fonts/Lobster-Regular.ttf'),
  });

  useFrameworkReady();
  const { user, loading, justSignedUp } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

  const routingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRoutedRef = useRef(false); // prevent double-routing spam

  useEffect(() => {
    async function prepare() {
      try {
        // Wait for all critical data to be loaded
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
      } catch (e) {
        console.warn(e);
      } finally {
        // Only hide splash screen when we're completely ready to route
        if (fontsLoaded && !loading && !profileLoading && user !== undefined) {
          await SplashScreen.hideAsync();
        }
      }
    }

    if (fontsLoaded && !loading && !profileLoading && user !== undefined) {
      prepare();
    }
  }, [fontsLoaded, loading, profileLoading, user]);

  useEffect(() => {
    // clear any previous timer so stale closures can't override newer decisions
    if (routingTimer.current) {
      clearTimeout(routingTimer.current);
      routingTimer.current = null;
    }

    // Reset routing flag when user becomes null (logout)
    if (user === null) {
      hasRoutedRef.current = false;
    }

    // Only route when everything is ready
    if (!loading && !profileLoading && fontsLoaded && user !== undefined && !hasRoutedRef.current) {
      // small debounce to avoid flashes while simultaneous updates settle
      routingTimer.current = setTimeout(() => {
        console.log('🔄 Routing decision - User:', !!user, 'Profile:', !!profile, 'Onboarding completed:', profile?.onboarding_completed, 'Just signed up:', justSignedUp);

        if (!user) {
          console.log('➡️ Routing to signup (no user)');
          router.replace('/(auth)/signup');
          hasRoutedRef.current = true;
          return;
        }

        // first priority: explicit just-signed-up flag
        if (justSignedUp) {
          console.log('➡️ Routing to onboarding (just signed up)');
          router.replace('/(onboarding)');
          hasRoutedRef.current = true;
          return;
        }

        // If profile missing OR onboarding not completed => onboarding
        if (!profile || !profile.onboarding_completed) {
          console.log('➡️ Routing to onboarding (profile missing or onboarding not completed)');
          router.replace('/(onboarding)');
          hasRoutedRef.current = true;
          return;
        }

        // otherwise user is good to go
        console.log('➡️ Routing to main app (onboarding completed)');
        router.replace('/(tabs)');
        hasRoutedRef.current = true;
      }, 200);

      // cleanup for this effect run
      return () => {
        if (routingTimer.current) {
          clearTimeout(routingTimer.current);
          routingTimer.current = null;
        }
      };
    }
  }, [user, loading, profile, profileLoading, fontsLoaded, justSignedUp]);

  // Show loading screen while checking auth, loading profile, or loading fonts
  if (loading || profileLoading || !fontsLoaded) {
    return null; // Show loading screen while checking auth or loading fonts
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(welcome)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
