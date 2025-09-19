import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X, BookOpen, Book, Heart, Calendar, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import ProfileAvatar from '@/components/ProfileAvatar';

interface FriendBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  total_pages: number;
  current_page: number;
  progress: number;
  status: 'reading' | 'read' | 'want-to-read';
  date_added: string;
  date_started?: string;
  date_finished?: string;
}

interface FriendLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  friend: {
    id: string;
    username: string;
    avatar_url?: string | null;
  } | null;
}

export default function FriendLibraryModal({ visible, onClose, friend }: FriendLibraryModalProps) {
  const [books, setBooks] = useState<FriendBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reading' | 'read' | 'want-to-read'>('reading');

  useEffect(() => {
    if (visible && friend) {
      loadFriendBooks();
    } else {
      setBooks([]);
    }
  }, [visible, friend]);

  const loadFriendBooks = async () => {
    if (!friend) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', friend.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading friend books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBooksByStatus = (status: 'reading' | 'read' | 'want-to-read') => {
    return books.filter(book => book.status === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading': return '#059669';
      case 'read': return '#8B5CF6';
      case 'want-to-read': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reading': return 'Currently Reading';
      case 'read': return 'Finished';
      case 'want-to-read': return 'Want to Read';
      default: return 'Unknown';
    }
  };

  const tabs = [
    { id: 'reading' as const, label: 'Reading', icon: BookOpen },
    { id: 'read' as const, label: 'Read', icon: Book },
    { id: 'want-to-read' as const, label: 'Want to Read', icon: Heart },
  ];

  const currentBooks = getBooksByStatus(activeTab);

  const renderBookItem = ({ item }: { item: FriendBook }) => (
    <View style={styles.bookCard}>
      <Image source={{ uri: item.cover }} style={styles.bookCover} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          by {item.author}
        </Text>
        
        <View style={styles.bookMeta}>
          {item.total_pages > 0 && (
            <Text style={styles.bookPages}>{item.total_pages} pages</Text>
          )}
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.bookStatus}>{getStatusLabel(item.status)}</Text>
        </View>
        
        {item.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.progress}% complete</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!friend) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.friendInfo}>
            {friend.avatar_url ? (
              <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
            ) : (
              <ProfileAvatar name={friend.username} size={40} />
            )}
            <View style={styles.friendDetails}>
              <Text style={styles.friendName}>{friend.username}'s Library</Text>
              <Text style={styles.bookCount}>
                {books.length} book{books.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = getBooksByStatus(tab.id).length;
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon size={16} color={isActive ? '#059669' : '#94A3B8'} />
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Books List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Loading library...</Text>
          </View>
        ) : (
          <FlatList
            data={currentBooks}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            style={styles.booksList}
            contentContainerStyle={styles.booksContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No books here yet</Text>
                <Text style={styles.emptySubtext}>
                  {activeTab === 'reading' ? `${friend.username} isn't currently reading any books` : 
                   activeTab === 'read' ? `${friend.username} hasn't finished any books yet` : 
                   `${friend.username} doesn't have any books on their want-to-read list`}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
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
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  bookCount: {
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 0,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    flexShrink: 1,
  },
  activeTabText: {
    color: '#059669',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 4,
  },
  activeTabBadge: {
    backgroundColor: '#059669',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  booksList: {
    flex: 1,
  },
  booksContainer: {
    padding: 20,
  },
  bookCard: {
    flexDirection: 'row',
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
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookPages: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  bookStatus: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});