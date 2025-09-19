import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Search, UserPlus, Check, Clock, UserMinus } from 'lucide-react-native';
import { useFriends, UserSearchResult } from '@/hooks/useFriends';
import ProfileAvatar from '@/components/ProfileAvatar';
import { useTheme } from '@/contexts/ThemeContext';

interface FriendSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FriendSearchModal({ visible, onClose }: FriendSearchModalProps) {
  const { currentTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { searchUsers, sendFriendRequest } = useFriends();

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const newTimeout = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 500);

    setSearchTimeout(newTimeout);

    return () => {
      if (newTimeout) {
        clearTimeout(newTimeout);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string, username: string) => {
    try {
      await sendFriendRequest(userId);
      Alert.alert('Friend Request Sent', `Friend request sent to ${username}!`);
      
      // Update the search results to reflect the new status
      setSearchResults(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, request_status: 'pending' }
          : user
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      Alert.alert('Error', errorMessage);
    }
  };

  const getActionButton = (user: UserSearchResult) => {
    if (user.is_friend) {
      return (
        <View style={styles.friendBadge}>
          <Check size={16} color={currentTheme.primary} />
          <Text style={[styles.friendBadgeText, { color: currentTheme.primary }]}>Friends</Text>
        </View>
      );
    }

    if (user.request_status === 'pending') {
      return (
        <View style={styles.pendingBadge}>
          <Clock size={16} color="#F59E0B" />
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.addFriendButton, { backgroundColor: currentTheme.primary }]}
        onPress={() => handleSendFriendRequest(user.id, user.username)}
      >
        <UserPlus size={16} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <View style={styles.userItem}>
      <ProfileAvatar name={item.username} size={48} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.userSubtext}>Chapterly Reader</Text>
      </View>
      {getActionButton(item)}
    </View>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.emptyText}>Searching users...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with a different username
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Search size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>Find Friends</Text>
        <Text style={styles.emptySubtext}>
          Search for friends by their username
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Friends</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  resultsList: {
    flex: 1,
  },
  resultsContainer: {
    padding: 20,
  },
  userItem: {
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
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  userSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  addFriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  friendBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});