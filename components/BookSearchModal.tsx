import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Search, Plus, BookOpen, Book as BookIcon, Heart } from 'lucide-react-native';
import { GoogleBooksService, Book } from '@/services/googleBooksApi';
import { useTheme } from '@/contexts/ThemeContext';

interface BookSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onBookSelect: (book: Book) => void;
}

export default function BookSearchModal({ visible, onClose, onBookSelect }: BookSearchModalProps) {
  const { currentTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showStatusSelector, setShowStatusSelector] = useState(false);

  // TEMPORARY: Add console log to track modal visibility
  console.log('BookSearchModal visible:', visible, 'showStatusSelector:', showStatusSelector);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setSearchQuery('');
      setSearchResults([]);
      setSelectedBook(null);
      setShowStatusSelector(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  }, [visible]);



  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    // Set loading state immediately for better UX
    setIsLoading(true);

    // Set new timeout for search
    const newTimeout = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 500); // 500ms delay

    setSearchTimeout(newTimeout);

    // Cleanup function
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
      const results = await GoogleBooksService.searchBooks(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookPress = (book: Book) => {
    setSelectedBook(book);
    setShowStatusSelector(true);
  };

  const handleStatusSelect = (status: 'reading' | 'read' | 'want-to-read') => {
    if (selectedBook) {
      try {
        onBookSelect({ ...selectedBook, initialStatus: status } as any);
        onClose();
      } catch (error) {
        Alert.alert('Already Added', 'This book is already in your library!');
      }
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity style={styles.bookItem} onPress={() => handleBookPress(item)}>
      <Image source={{ uri: item.cover }} style={styles.bookCover} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          by {item.author}
        </Text>
        {item.totalPages > 0 && (
          <Text style={styles.bookPages}>{item.totalPages} pages</Text>
        )}
        {item.publishedDate && (
          <Text style={styles.bookYear}>
            {new Date(item.publishedDate).getFullYear()}
          </Text>
        )}
      </View>
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: currentTheme.accent, borderColor: currentTheme.primary }]}
        onPress={() => handleBookPress(item)}
      >
        <Plus size={20} color={currentTheme.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.emptyText}>Searching books...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No books found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Search size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>Search for books</Text>
        <Text style={styles.emptySubtext}>
          Enter a book title, author, or ISBN to get started
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Book</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search books, authors, or ISBN..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={searchResults}
          renderItem={renderBookItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Status Selection - SIMPLE VERSION THAT WORKS */}
        {showStatusSelector && (
          <View style={styles.statusModalOverlay}>
            <View style={styles.statusModalContainer}>
              <Text style={styles.statusModalTitle}>
                How would you like to add this book?
              </Text>
              {selectedBook && (
                <View style={styles.statusBookInfo}>
                  <Image source={{ uri: selectedBook.cover }} style={styles.statusBookCover} />
                  <View style={styles.statusBookDetails}>
                    <Text style={styles.statusBookTitle} numberOfLines={2}>
                      {selectedBook.title}
                    </Text>
                    <Text style={styles.statusBookAuthor} numberOfLines={1}>
                      by {selectedBook.author}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={styles.statusOptions}>
                <TouchableOpacity
                  style={styles.statusOption}
                  onPress={() => handleStatusSelect('reading')}
                >
                 <BookOpen size={24} color={currentTheme.primary} />
                  <View style={styles.statusOptionText}>
                    <Text style={styles.statusOptionTitle}>Currently Reading</Text>
                    <Text style={styles.statusOptionSubtitle}>I'm reading this now</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.statusOption}
                  onPress={() => handleStatusSelect('read')}
                >
                  <BookIcon size={24} color="#8B5CF6" />
                  <View style={styles.statusOptionText}>
                    <Text style={styles.statusOptionTitle}>Already Read</Text>
                    <Text style={styles.statusOptionSubtitle}>I've finished this book</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.statusOption}
                  onPress={() => handleStatusSelect('want-to-read')}
                >
                  <Heart size={24} color="#EF4444" />
                  <View style={styles.statusOptionText}>
                    <Text style={styles.statusOptionTitle}>Want to Read</Text>
                    <Text style={styles.statusOptionSubtitle}>Save for later</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.statusModalCancel}
                onPress={() => {
                  setShowStatusSelector(false);
                  setSelectedBook(null);
                }}
              >
                <Text style={styles.statusModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  bookItem: {
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
    marginBottom: 4,
  },
  bookPages: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  bookYear: {
    fontSize: 12,
    color: '#94A3B8',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
   borderWidth: 1,
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
  statusModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  statusModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusBookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBookCover: {
    width: 40,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  statusBookDetails: {
    flex: 1,
  },
  statusBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  statusBookAuthor: {
    fontSize: 14,
    color: '#64748B',
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  statusOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  statusOptionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  statusModalCancel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  statusModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});