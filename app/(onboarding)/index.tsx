import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { BookOpen, User, Clock, ArrowRight, Check } from 'lucide-react-native';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, themes, ThemeColor } from '@/contexts/ThemeContext';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [username, setUsername] = useState('');
  const [dailyGoal, setDailyGoal] = useState('30');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('emerald');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { completeOnboarding } = useProfile();
  const { clearJustSignedUp } = useAuth();
  const { setTheme } = useTheme();

  // Ensure onboarding always starts at step 0 (Welcome to Chapterly)
  useEffect(() => {
    setCurrentStep(0);
    setHasStarted(false);
    setIsReady(true);
  }, []);

  const steps = [
    {
      title: 'Welcome to Chapterly',
      subtitle: 'Your reading journey starts here',
      description: 'Track your progress, build reading habits, and discover your next favorite book.',
      icon: BookOpen,
      color: '#059669',
    },
    {
      title: 'Choose Your Username',
      subtitle: 'How should we call you?',
      description: 'Pick a username that represents you in the Chapterly community.',
      icon: User,
      color: '#6366F1',
    },
    {
      title: 'Choose Your Theme',
      subtitle: 'Pick your favorite color',
      description: 'Select a theme that matches your style. You can always change this later in settings.',
      icon: Clock,
      color: themes[selectedTheme].primary,
    },
    {
      title: 'Set Your Daily Goal',
      subtitle: 'How many minutes per day?',
      description: 'Set a realistic daily reading goal. You can always change this later.',
      icon: Clock,
      color: themes[selectedTheme].primary,
    },
  ];

  // ALWAYS show step 0 until user explicitly progresses
  const displayStep = hasStarted ? currentStep : 0;
  const currentStepData = steps[displayStep];
  const Icon = currentStepData.icon;
  
  // Debug logging
  console.log('🎯 Onboarding render - currentStep:', currentStep, 'hasStarted:', hasStarted, 'displayStep:', displayStep);
  
  // Force step 0 data if we're not ready or haven't started
  const safeStepData = isReady && hasStarted ? currentStepData : steps[0];
  const SafeIcon = isReady && hasStarted ? Icon : steps[0].icon;


  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate username
      if (!username.trim()) {
        Alert.alert('Username Required', 'Please enter a username to continue.');
        return;
      }
      if (username.length < 3) {
        Alert.alert('Username Too Short', 'Username must be at least 3 characters long.');
        return;
      }
    }

    if (currentStep === 2) {
      // Set theme selection
      await setTheme(selectedTheme);
    }

    if (currentStep === 3) {
      // Validate daily goal
      const goalNumber = parseInt(dailyGoal);
      if (isNaN(goalNumber) || goalNumber < 5 || goalNumber > 300) {
        Alert.alert('Invalid Goal', 'Please enter a goal between 5 and 300 minutes.');
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (currentStep === 0) {
        setHasStarted(true);
      }
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await setTheme(selectedTheme);
      await completeOnboarding(username.trim(), parseInt(dailyGoal));

      // Small delay to ensure profile is updated before navigation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  const canProceed = () => {
    if (currentStep === 1) return username.trim().length >= 3;
    if (currentStep === 3) {
      const goalNumber = parseInt(dailyGoal);
      return !isNaN(goalNumber) && goalNumber >= 5 && goalNumber <= 300;
    }
    return true;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {!isReady ? (
        <View style={styles.loadingContainer}>
          {/* Show nothing while loading to prevent flash */}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${safeStepData.color}15` }]}>
            <SafeIcon size={48} color={safeStepData.color} />
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{safeStepData.title}</Text>
            <Text style={[styles.subtitle, { color: safeStepData.color }]}>
              {safeStepData.subtitle}
            </Text>
            <Text style={styles.description}>{safeStepData.description}</Text>
          </View>

          {/* Step-specific inputs */}
          {currentStep === 1 && hasStarted && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <User size={20} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94A3B8"
                  maxLength={20}
                />
              </View>
              {username.length > 0 && username.length < 3 && (
                <Text style={styles.inputError}>Username must be at least 3 characters</Text>
              )}
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.themeContainer}>
              <Text style={styles.themeLabel}>Choose your theme:</Text>
              <View style={styles.themeGrid}>
                {Object.values(themes).map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      { backgroundColor: theme.primary },
                      selectedTheme === theme.id && styles.themeOptionSelected,
                    ]}
                    onPress={() => setSelectedTheme(theme.id)}
                  >
                    <View style={styles.themeIcon}>
                      <Text style={styles.themeIconText}>C</Text>
                    </View>
                    {selectedTheme === theme.id && (
                      <View style={styles.themeCheckmark}>
                        <Text style={styles.themeCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.themeSelectedText}>
                {themes[selectedTheme].name} selected
              </Text>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.inputContainer}>
              <View style={styles.goalContainer}>
                <View style={styles.goalInputContainer}>
                  <TextInput
                    style={styles.goalInput}
                    value={dailyGoal}
                    onChangeText={setDailyGoal}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor="#94A3B8"
                    maxLength={3}
                  />
                  <Text style={styles.goalUnit}>minutes</Text>
                </View>
                <Text style={styles.goalHint}>Recommended: 15-60 minutes per day</Text>
              </View>
            </View>
          )}
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep === 0 ? (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip Setup</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.nextButton, 
              !canProceed() && styles.nextButtonDisabled,
            { backgroundColor: currentStep === 2 ? themes[selectedTheme].primary : currentStepData.color }
            ]} 
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? (isLoading ? 'Setting Up...' : 'Get Started') : 'Next'}
            </Text>
            {currentStep === steps.length - 1 ? (
              <Check size={20} color="#FFFFFF" />
            ) : (
              <ArrowRight size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hiddenContainer: {
    height: 0,
    opacity: 0,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#059669',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lobster',
    fontWeight: '400',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 320,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: '#1E293B',
  },
  inputError: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 4,
  },
  goalContainer: {
    alignItems: 'center',
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    width: 200,
    alignSelf: 'center',
  },
  goalInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    width: 80,
  },
  goalUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  goalHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  themeContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  themeOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  themeOptionSelected: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.3,
  },
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Lobster',
  },
  themeCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckmarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  themeSelectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});