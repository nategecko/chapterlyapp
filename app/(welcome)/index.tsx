import React, { useState } from 'react';
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
import { User, Target, Flame, Users, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { useTheme, themes, ThemeColor } from '@/contexts/ThemeContext';

interface OnboardingData {
  name: string;
  dailyGoal: number;
  themeColor: ThemeColor;
}

export default function WelcomeScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [dailyGoal, setDailyGoal] = useState('30');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('emerald');
  const { setTheme } = useTheme();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    name: '',
    dailyGoal: 30,
    themeColor: 'emerald',
  });

  const steps = [
    {
      title: 'What should we call you?',
      subtitle: 'Enter your name',
      description: 'This will be your display name in the Chapterly community.',
      icon: User,
      color: '#059669',
    },
    {
      title: 'Set your reading goal',
      subtitle: 'How many minutes per day?',
      description: 'Choose a realistic daily reading goal. You can always change this later.',
      icon: Target,
      color: '#6366F1',
    },
    {
      title: 'Build your streak',
      subtitle: 'Consistency is key',
      description: 'Reach your daily reading goal to build and maintain your reading streak. The longer your streak, the stronger your reading habit becomes!',
      icon: Flame,
      color: '#F59E0B',
    },
    {
      title: 'Choose your theme',
      subtitle: 'Pick your favorite color',
      description: 'Select a theme that matches your style. You can always change this later in settings.',
      icon: Target,
      color: themes[selectedTheme].primary,
    },
    {
      title: 'Connect with friends',
      subtitle: 'Reading is better together',
      description: 'Add friends to see their progress, compete in weekly challenges, and motivate each other to reach your reading goals.',
      icon: Users,
      color: themes[selectedTheme].primary,
    },
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate name
      if (!name.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }
      if (name.length < 2) {
        Alert.alert('Name Too Short', 'Name must be at least 2 characters long.');
        return;
      }
      setOnboardingData(prev => ({ ...prev, name: name.trim() }));
    }

    if (currentStep === 1) {
      // Validate daily goal
      const goalNumber = parseInt(dailyGoal);
      if (isNaN(goalNumber) || goalNumber < 5 || goalNumber > 300) {
        Alert.alert('Invalid Goal', 'Please enter a goal between 5 and 300 minutes.');
        return;
      }
      setOnboardingData(prev => ({ ...prev, dailyGoal: goalNumber }));
    }

    if (currentStep === 2) {
      // Set theme selection
      setOnboardingData(prev => ({ ...prev, themeColor: selectedTheme }));
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Store onboarding data and navigate to signup
      await setTheme(onboardingData.themeColor);
      router.push({
        pathname: '/(auth)/signup',
        params: {
          onboardingName: onboardingData.name,
          onboardingGoal: onboardingData.dailyGoal.toString(),
          onboardingTheme: onboardingData.themeColor,
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return name.trim().length >= 2;
    if (currentStep === 1) {
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
          <View style={[styles.iconContainer, { backgroundColor: `${currentStepData.color}15` }]}>
            <Icon size={48} color={currentStepData.color} />
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={[styles.subtitle, { color: currentStepData.color }]}>
              {currentStepData.subtitle}
            </Text>
            <Text style={styles.description}>{currentStepData.description}</Text>
          </View>

          {/* Step-specific inputs */}
          {currentStep === 0 && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <User size={20} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholderTextColor="#94A3B8"
                  maxLength={30}
                />
              </View>
              {name.length > 0 && name.length < 2 && (
                <Text style={styles.inputError}>Name must be at least 2 characters</Text>
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
          {currentStep === 1 && (
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
            <View style={styles.backButtonPlaceholder} />
          ) : (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBack}
            >
              <ArrowLeft size={20} color="#64748B" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.nextButton, 
              !canProceed() && styles.nextButtonDisabled,
              { backgroundColor: currentStepData.color }
            ]} 
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Lobster',
    fontWeight: '400',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
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
    marginTop: 60,
  },
  backButtonPlaceholder: {
    width: 80,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
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