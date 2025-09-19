import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import {
  Trophy,
  Search,
  UserPlus,
  Clock,
  Medal,
  Crown,
  Flame,
  Target,
  Bell,
  Check,
  X,
  UserMinus,
  BookOpen,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useBooks } from '@/hooks/useBooks';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useFriends } from '@/hooks/useFriends';
import ProfileAvatar from '@/components/ProfileAvatar';
import FriendSearchModal from '@/components/FriendSearchModal';
import FriendLibraryModal from '@/components/FriendLibraryModal';
import { useTheme } from '@/contexts/ThemeContext';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  weeklyMinutes: number;
  currentStreak: number;
  position: number;
}

export default function SocialScreen() {
  const { currentTheme } = useTheme();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { getCurrentStreak, getWeeklyMinutes } = useStreaks();
  const { 
    friends, 
    friendRequests, 
    respondToFriendRequest, 
    removeFriend,
    refreshFriends, 
    refreshFriendRequests 
  } = useFriends();
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [selectedFriendForRemoval, setSelectedFriendForRemoval] = useState<any>(null);
  const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
  const [selectedFriendForLibrary, setSelectedFriendForLibrary] = useState<any>(null);
  const [showFriendLibrary, setShowFriendLibrary] = useState(false);

  // Get real user data
  const userWeeklyMinutes = getWeeklyMinutes();
  const currentStreak = getCurrentStreak();

  // Create leaderboard with user and friends
  const allUsers = [
    {
      id: user?.id || 'current-user',
      name: profile?.username || 'You',
      weeklyMinutes: userWeeklyMinutes || 0,
      currentStreak: currentStreak || 0,
    },
    ...friends.map(friend => ({
      id: friend.id,
      name: friend.username || 'Friend',
      avatar: friend.avatar_url || undefined,
      weeklyMinutes: friend.weekly_minutes || 0,
      currentStreak: friend.current_streak || 0,
    }))
  ];

  const leaderboard: LeaderboardEntry[] = allUsers
    .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes)
    .map((friend, index) => ({ ...friend, position: index + 1 }));

  const filteredFriends = friends.filter(friend => 
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
  );

  const handleAcceptFriendRequest = async (requestId: string, senderUsername: string) => {
    try {
      await respondToFriendRequest(requestId, 'accepted');
      Alert.alert('Friend Added!', `You are now friends with ${senderUsername}!`);
      await refreshFriends();
      await refreshFriendRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      await respondToFriendRequest(requestId, 'declined');
      await refreshFriendRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const handleFriendPress = (friend: any) => {
    setSelectedFriendForLibrary(friend);
    setShowFriendLibrary(true);
  };

  const handleRemoveFriendPress = (friend: any) => {
    setSelectedFriendForRemoval(friend);
    setShowRemoveFriendModal(true);
  };

  const handleRemoveFriend = async () => {
    if (!selectedFriendForRemoval) return;
    
    try {
      await removeFriend(selectedFriendForRemoval.id);
      Alert.alert('Friend Removed', `You are no longer friends with ${selectedFriendForRemoval.username}`);
      await refreshFriends();
      setShowRemoveFriendModal(false);
      setSelectedFriendForRemoval(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown size={20} color="#F59E0B" />;
      case 2:
        return <Medal size={20} color="#9CA3AF" />;
      case 3:
        return <Medal size={20} color="#CD7C2F" />;
      default:
        return (
          <View style={styles.rankNumberContainer}>
            <Text style={styles.rankNumber}>{position}</Text>
          </View>
        );
    }
  };

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'friends', label: 'Friends', icon: UserPlus },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.headerButtons}>
          {friendRequests.filter(req => req.receiver_id === user?.id).length > 0 && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setShowFriendRequests(true)}
            >
              <Bell size={20} color="#FFFFFF" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {friendRequests.filter(req => req.receiver_id === user?.id).length}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.addButton, { backgroundColor: currentTheme.primary }]} onPress={() => setShowFriendSearch(true)}>
          <UserPlus size={20} color="#FFFFFF" />
        </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tab.id === 'friends' ? friends.length : allUsers.length;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Icon size={18} color={isActive ? currentTheme.primary : '#94A3B8'} />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, isActive && [styles.activeTabBadge, { backgroundColor: currentTheme.primary }]]}>
                <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'leaderboard' ? (
          <>
            {/* Challenge Header */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Trophy size={24} color="#F59E0B" />
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>Weekly Reading Challenge</Text>
                  <Text style={styles.challengeSubtitle}>
                    Compete with friends based on reading minutes
                  </Text>
                </View>
              </View>
            </View>

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <View style={styles.podiumContainer}>
                <Text style={styles.sectionTitle}>Top Readers This Week</Text>
                <View style={styles.podiumRow}>
                  {leaderboard.slice(0, 3).map((friend, index) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.podiumCard,
                        index === 0 && styles.firstPlace,
                        index === 1 && styles.secondPlace,
                        index === 2 && styles.thirdPlace,
                      ]}
                    >
                      <View style={styles.podiumRank}>
                        {getRankIcon(friend.position)}
                      </View>
                      {friend.id === user?.id ? (
                        <ProfileAvatar 
                          name={friend.name || 'User'} 
                          size={48} 
                        />
                      ) : (
                        <Image source={{ uri: friend.avatar }} style={styles.podiumAvatar} />
                      )}
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {friend.id === user?.id ? 'You' : friend.name}
                      </Text>
                      <View style={styles.podiumStats}>
                        <Clock size={12} color="#64748B" />
                        <Text style={styles.podiumMinutes}>{friend.weeklyMinutes}m</Text>
                      </View>
                      <View style={styles.podiumStreak}>
                        <Flame size={12} color="#F59E0B" />
                        <Text style={styles.podiumStreakText}>{friend.currentStreak}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Full Rankings */}
            <View style={styles.leaderboardContainer}>
              <Text style={styles.sectionTitle}>
                {leaderboard.length >= 3 ? 'Full Rankings' : 'Your Progress'}
              </Text>
              {leaderboard.map((friend) => (
                <TouchableOpacity key={friend.id} style={styles.leaderboardItem}>
                  <View style={styles.rankContainer}>
                    {getRankIcon(friend.position)}
                  </View>
                  {friend.id === user?.id ? (
                    <ProfileAvatar 
                      name={friend.name || 'User'} 
                      size={48} 
                    />
                  ) : friend.avatar ? (
                    <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
                  ) : (
                    <ProfileAvatar 
                      name={friend.name || 'User'} 
                      size={48} 
                    />
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>
                      {friend.id === user?.id ? 'You' : friend.name}
                    </Text>
                    <View style={styles.friendStats}>
                      <View style={styles.statRow}>
                        <Clock size={14} color="#64748B" />
                        <Text style={styles.friendMinutes}>
                          {friend.weeklyMinutes} min this week
                        </Text>
                      </View>
                      <View style={styles.statRow}>
                        <Flame size={14} color="#F59E0B" />
                        <Text style={styles.friendStreak}>
                          {friend.currentStreak} day streak
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Friends List */}
            <View style={styles.friendsContainer}>
              <Text style={styles.sectionTitle}>Your Friends</Text>
              {filteredFriends
                .map((friend) => (
                <TouchableOpacity 
                  key={friend.id} 
                  style={styles.friendCard}
                  onPress={() => handleFriendPress(friend)}
                >
                  {friend.avatar_url ? (
                    <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                  ) : (
                    <ProfileAvatar 
                      name={friend.username} 
                      size={48} 
                    />
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.username}</Text>
                    <View style={styles.friendStats}>
                      <View style={styles.statRow}>
                        <Clock size={14} color="#64748B" />
                        <Text style={styles.friendMinutes}>
                          {friend.weekly_minutes} min this week
                        </Text>
                      </View>
                      <View style={styles.statRow}>
                        <Flame size={14} color="#F59E0B" />
                        <Text style={styles.friendStreak}>
                          {friend.current_streak} day streak
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.friendActions}>
                    <TouchableOpacity 
                      style={styles.viewLibraryButton}
                      onPress={() => handleFriendPress(friend)}
                    >
                      <BookOpen size={16} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeFriendButton}
                      onPress={() => handleRemoveFriendPress(friend)}
                    >
                      <UserMinus size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              
              {friends.length === 0 && (
                <View style={styles.emptyFriends}>
                  <Text style={styles.emptyFriendsText}>No friends yet</Text>
                  <Text style={styles.emptyFriendsSubtext}>
                    Add friends to see their reading progress and compete in challenges
                  </Text>
                  <TouchableOpacity 
                    style={[styles.addFirstFriendButton, { backgroundColor: currentTheme.primary }]}
                    onPress={() => setShowFriendSearch(true)}
                  >
                    <UserPlus size={16} color="#FFFFFF" />
                    <Text style={styles.addFirstFriendText}>Find Friends</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Friend Search Modal */}
      <FriendSearchModal
        visible={showFriendSearch}
        onClose={() => setShowFriendSearch(false)}
      />

      {/* Friend Library Modal */}
      <FriendLibraryModal
        visible={showFriendLibrary}
        onClose={() => setShowFriendLibrary(false)}
        friend={selectedFriendForLibrary}
      />

      {/* Friend Requests Modal */}
      <Modal
        visible={showFriendRequests}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.requestsContainer}>
          <View style={styles.requestsHeader}>
            <Text style={styles.requestsTitle}>Friend Requests</Text>
            <TouchableOpacity
              style={styles.requestsCloseButton}
              onPress={() => setShowFriendRequests(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={friendRequests.filter(req => req.receiver_id === user?.id)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              // Ensure we have a valid username, fallback to a generated one if needed
              const username = item.sender_username || `User${item.sender_id.slice(-4)}`;
              
              return (
                <View style={styles.requestItem}>
                  <ProfileAvatar name={username} size={48} />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUsername}>{username}</Text>
                    <Text style={styles.requestText}>wants to be friends</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.acceptButton, { backgroundColor: currentTheme.primary }]}
                      onPress={() => handleAcceptFriendRequest(item.id, username)}
                    >
                      <Check size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => handleDeclineFriendRequest(item.id)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            style={styles.requestsList}
            contentContainerStyle={styles.requestsContent}
            ListEmptyComponent={
              <View style={styles.emptyRequests}>
                <Text style={styles.emptyRequestsText}>No friend requests</Text>
                <Text style={styles.emptyRequestsSubtext}>
                  Friend requests will appear here
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Remove Friend Confirmation Modal */}
      <Modal
        visible={showRemoveFriendModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.removeModalOverlay}>
          <View style={styles.removeModalContainer}>
            <Text style={styles.removeModalTitle}>Remove Friend</Text>
            <Text style={styles.removeModalMessage}>
              Are you sure you want to remove {selectedFriendForRemoval?.username} from your friends list?
            </Text>
            <Text style={styles.removeModalSubtext}>
              You can always send them a friend request again later.
            </Text>
            
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancel}
                onPress={() => {
                  setShowRemoveFriendModal(false);
                  setSelectedFriendForRemoval(null);
                }}
              >
                <Text style={styles.removeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeModalConfirm}
                onPress={handleRemoveFriend}
              >
                <UserMinus size={16} color="#FFFFFF" />
                <Text style={styles.removeModalConfirmText}>Remove Friend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  activeTabText: {
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activeTabBadge: {
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeInfo: {
    marginLeft: 16,
    flex: 1,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  challengeSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  podiumContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
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
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  firstPlace: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    transform: [{ scale: 1.05 }],
  },
  secondPlace: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF',
  },
  thirdPlace: {
    backgroundColor: '#FED7AA',
    borderColor: '#CD7C2F',
  },
  podiumRank: {
    marginBottom: 12,
  },
  rankNumberContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 8,
    textAlign: 'center',
  },
  podiumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  podiumMinutes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  podiumStreak: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podiumStreakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  leaderboardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 16,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  friendStats: {
    flexDirection: 'column',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendMinutes: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  friendStreak: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 4,
  },
  friendBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewLibraryButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  removeFriendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  friendRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  friendsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFriendsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptyFriendsSubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addFirstFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstFriendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  requestsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  requestsCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsList: {
    flex: 1,
  },
  requestsContent: {
    padding: 20,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 16,
  },
  requestUsername: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  requestText: {
    fontSize: 14,
    color: '#64748B',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRequests: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyRequestsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptyRequestsSubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  removeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  removeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  removeModalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  removeModalSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  removeModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  removeModalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  removeModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  removeModalConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  removeModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  bottomPadding: {
    height: 32,
  },
});