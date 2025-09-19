import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  Settings,
  Book,
  Share,
  Calendar,
  LogOut,
  Clock,
  TrendingUp,
  Target,
  Award,
  Flame,
  ChevronRight,
  Gift,
  X,
  Check,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useBooks } from '@/hooks/useBooks';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useTheme, themes, ThemeColor } from '@/contexts/ThemeContext';
import ProfileAvatar from '@/components/ProfileAvatar';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { books, getTodayReadingTime, getWeeklyReadingTime } = useBooks();
  const { getCurrentStreak, getWeeklyMinutes, getTodayMinutes } = useStreaks();
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [newDailyGoal, setNewDailyGoal] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const { currentTheme, setTheme, isChangingTheme } = useTheme();

  useEffect(() => {
    const loadReadingData = async () => {
      const today = await getTodayReadingTime();
      setTodayMinutes(today);
    };
    loadReadingData();
  }, []);

  useEffect(() => {
    if (profile) {
      setNewDailyGoal(profile.daily_goal_minutes.toString());
      setNewUsername(profile.username || '');
    }
  }, [profile]);
  // Get real user data
  const currentStreak = getCurrentStreak();
  const weeklyMinutes = getWeeklyMinutes();

  // Calculate user stats
  const userStats = {
    totalBooks: books.filter(book => book.status === 'read').length,
    currentStreak: currentStreak,
    longestStreak: currentStreak, // For now, same as current
    totalMinutes: weeklyMinutes,
    averageDaily: Math.round(weeklyMinutes / 7),
    favoriteGenre: 'Fiction', // Could be calculated from book categories
    level: Math.floor(books.filter(book => book.status === 'read').length / 5) + 1, // Level up every 5 books
    weeklyGoal: (profile?.daily_goal_minutes || 30) * 7,
    weeklyProgress: weeklyMinutes,
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    // Here you would implement actual notification settings
    Alert.alert(
      'Notifications',
      value ? 'Notifications enabled' : 'Notifications disabled'
    );
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkModeEnabled(value);
    
    // Apply dark mode styles to the entire app
    if (value) {
      // Enable dark mode
      Alert.alert('Dark Mode', 'Dark mode enabled! The app will switch to dark theme.');
      // TODO: Implement actual dark theme switching
    } else {
      // Disable dark mode
      Alert.alert('Dark Mode', 'Dark mode disabled! The app will switch to light theme.');
      // TODO: Implement actual light theme switching
    }
  };

  const handleGoalUpdate = async () => {
    const goalNumber = parseInt(newDailyGoal);
    if (isNaN(goalNumber) || goalNumber < 5 || goalNumber > 300) {
      Alert.alert('Invalid Goal', 'Please enter a goal between 5 and 300 minutes.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ daily_goal_minutes: goalNumber });
      setShowGoalModal(false);
      Alert.alert('Success', 'Your daily reading goal has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your reading goal. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Invalid Username', 'Please enter a username.');
      return;
    }
    if (newUsername.length < 3) {
      Alert.alert('Username Too Short', 'Username must be at least 3 characters long.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ username: newUsername.trim() });
      setShowGeneralSettings(false);
      Alert.alert('Success', 'Your username has been updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update your username. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleSignOut = async () => {
    try {
      console.log('Signing out user...');
      await signOut();
      console.log('User signed out successfully');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Profile */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <ProfileAvatar 
            name={profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            size={80}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Reader'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Progress Card */}
      <View style={styles.weeklyProgressCard}>
        <View style={styles.weeklyProgressHeader}>
          <Target size={20} color={currentTheme.primary} />
          <Text style={styles.weeklyProgressTitle}>This Week's Progress</Text>
        </View>
        <View style={styles.weeklyProgressBar}>
          <View style={[styles.weeklyProgressFill, { width: `${(userStats.weeklyProgress / userStats.weeklyGoal) * 100}%`, backgroundColor: currentTheme.primary }]} />
        </View>
        <Text style={styles.weeklyProgressText}>
          {userStats.weeklyProgress} / {userStats.weeklyGoal} minutes
        </Text>
        <Text style={styles.weeklyProgressRemaining}>
          {userStats.weeklyGoal - userStats.weeklyProgress} minutes to reach weekly goal
        </Text>
      </View>

      {/* Reading Stats Grid */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Reading Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Book size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{userStats.totalBooks}</Text>
            <Text style={styles.statLabel}>Books Read</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Flame size={24} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>{userStats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Clock size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{formatTime(userStats.totalMinutes)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{userStats.averageDaily}m</Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => setShowGoalModal(true)}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconContainer}>
              <Calendar size={20} color="#6B7280" />
            </View>
            <Text style={styles.settingLabel}>Reading Goals</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{profile?.daily_goal_minutes || 30} min/day</Text>
            <ChevronRight size={16} color="#CBD5E1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconContainer, { backgroundColor: currentTheme.primary }]}>
              <Text style={styles.themePreviewText}>C</Text>
            </View>
            <Text style={styles.settingLabel}>App Theme</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{currentTheme.name}</Text>
            <ChevronRight size={16} color="#CBD5E1" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => setShowGeneralSettings(true)}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconContainer}>
              <Settings size={20} color="#6B7280" />
            </View>
            <Text style={styles.settingLabel}>General Settings</Text>
          </View>
          <ChevronRight size={16} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingItem, styles.logoutItem]} 
          onPress={async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIconContainer}>
              <LogOut size={20} color="#EF4444" />
            </View>
            <Text style={[styles.settingLabel, styles.logoutText]}>Log Out</Text>
          </View>
          <ChevronRight size={16} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* Goal Setting Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Reading Goal</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGoalModal(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Set your daily reading goal in minutes. This helps track your progress and maintain consistency.
            </Text>
            
            <View style={styles.goalInputContainer}>
              <TextInput
                style={styles.goalInput}
                value={newDailyGoal}
                onChangeText={setNewDailyGoal}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor="#94A3B8"
                maxLength={3}
              />
              <Text style={styles.goalUnit}>minutes per day</Text>
            </View>
            
            <Text style={styles.goalHint}>Recommended: 15-60 minutes per day</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewDailyGoal(profile?.daily_goal_minutes.toString() || '30');
                  setShowGoalModal(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton, 
                  { backgroundColor: currentTheme.primary },
                  isUpdating && styles.modalConfirmButtonDisabled
                ]}
                onPress={handleGoalUpdate}
                disabled={isUpdating}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.modalConfirmText}>
                  {isUpdating ? 'Updating...' : 'Save Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.themeModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Theme</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalDescription}>
            Select your preferred theme. The app colors and icon will update immediately.
          </Text>
          
          <View style={styles.themeGrid}>
            {Object.values(themes).map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: theme.primary },
                  currentTheme.id === theme.id && styles.themeOptionSelected
                ]}
                onPress={async () => {
                  if (isChangingTheme || theme.id === currentTheme.id) return;
                  
                  try {
                    await setTheme(theme.id);
                    setShowThemeModal(false);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to change theme. Please try again.');
                  }
                }}
                disabled={isChangingTheme}
              >
                <View style={styles.themeIcon}>
                  <Text style={styles.themeIconText}>C</Text>
                </View>
                <Text style={styles.themeOptionName}>{theme.name}</Text>
                {currentTheme.id === theme.id && (
                  <View style={styles.themeCheckmark}>
                    <Check size={16} color="#FFFFFF" />
                  </View>
                )}
                {isChangingTheme && currentTheme.id === theme.id && (
                  <View style={styles.themeLoading}>
                    <Text style={styles.themeLoadingText}>...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.themeHint}>
            Your app icon will also change to match your selected theme.
          </Text>
        </View>
      </Modal>

      {/* General Settings Modal */}
      <Modal
        visible={showGeneralSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.generalSettingsContainer}>
          <View style={styles.generalSettingsHeader}>
            <Text style={styles.modalTitle}>General Settings</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowGeneralSettings(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.generalSettingsContent}>
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Profile</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Username</Text>
                <View style={styles.usernameInputContainer}>
                  <TextInput
                    style={styles.usernameInput}
                    value={newUsername}
                    onChangeText={setNewUsername}
                    placeholder="Enter username"
                    placeholderTextColor="#94A3B8"
                    maxLength={20}
                  />
                  <TouchableOpacity
                    style={[styles.updateButton, { backgroundColor: currentTheme.primary }]}
                    onPress={handleUsernameUpdate}
                    disabled={isUpdating}
                  >
                    <Text style={styles.updateButtonText}>
                      {isUpdating ? 'Updating...' : 'Update'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Email</Text>
                <Text style={styles.settingRowValue}>{user?.email}</Text>
              </View>
            </View>
            
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Reading Preferences</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Daily Goal</Text>
                <TouchableOpacity
                  style={styles.settingRowButton}
                  onPress={() => {
                    setShowGeneralSettings(false);
                    setShowGoalModal(true);
                  }}
                >
                  <Text style={styles.settingRowValue}>{profile?.daily_goal_minutes || 30} minutes</Text>
                  <ChevronRight size={16} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>App Info</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Version</Text>
                <Text style={styles.settingRowValue}>1.0.0</Text>
              </View>
              
              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Privacy Policy</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingRow}>
                <Text style={styles.settingRowLabel}>Terms of Service</Text>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 80,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748B',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumContent: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#A16207',
    marginTop: 4,
  },
  premiumPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weeklyProgressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  weeklyProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  weeklyProgressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
  },
  weeklyProgressBar: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginBottom: 12,
  },
  weeklyProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  weeklyProgressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  weeklyProgressRemaining: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  achievementsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  achievementCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  achievementLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: '#94A3B8',
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginRight: 8,
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
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
    marginLeft: 8,
  },
  goalHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  generalSettingsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  generalSettingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  generalSettingsContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  settingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingRowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    width: 80,
    marginRight: 16,
  },
  settingRowValue: {
    fontSize: 16,
    color: '#64748B',
  },
  settingRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  usernameInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
    minWidth: 0,
  },
  updateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  themePreviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Lobster',
  },
  themeModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginVertical: 32,
  },
  themeOption: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  themeOptionSelected: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.25,
  },
  themeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  themeIconText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Lobster',
  },
  themeOptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  themeCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLoading: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLoadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  themeHint: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
});