import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Search, Plus, BookOpen, Book, Heart, Crown, X, CreditCard as Edit3, Check } from 'lucide-react-native';
import BookSearchModal from '@/components/BookSearchModal';
import { useBooks } from '@/hooks/useBooks';
import { Book as GoogleBook } from '@/services/googleBooksApi';
import { useTheme } from '@/contexts/ThemeContext';

export default function LibraryScreen() {
  const { currentTheme } = useTheme();
  const { books, addBook, getBooksByStatus, updateBook, recalculateProgress, removeBook } = useBooks();
  
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>('want-to-read');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<any>(null);
  const [showProgressEdit, setShowProgressEdit] = useState(false);
  const [newCurrentPage, setNewCurrentPage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const currentBooks = useMemo(() => {
    try {
      // Safety check for corrupted books state
      if (!books || !Array.isArray(books)) {
        console.warn('Books state is corrupted, resetting to empty array');
        return [];
      }
      
      const result = getBooksByStatus(activeTab);
      console.log(`Current books for ${activeTab}:`, result.length);
      return result;
    } catch (error) {
      console.error('Error getting books by status:', error);
      return [];
    }
  }, [activeTab, books]);

  const tabs = [
    { id: 'reading', label: 'Reading', icon: BookOpen },
    { id: 'read', label: 'Read', icon: Book },
    { id: 'want-to-read', label: 'Want to Read', icon: Heart },
  ] as const;

  const filteredBooks = useMemo(() => {
    try {
      if (!currentBooks || !Array.isArray(currentBooks)) return [];
      return currentBooks.filter(book => {
        if (!book || !book.title || !book.author) return false;
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             book.author.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    } catch (error) {
      console.error('Error filtering books:', error);
      return [];
    }
  }, [currentBooks, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading': return currentTheme.primary;
      case 'read': return '#8B5CF6';
      case 'want-to-read': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const handleAddBook = async (book: GoogleBook) => {
    try {
      const status = (book as any).initialStatus || 'want-to-read';
      
      // Add the book first
      console.log('About to add book:', book.title);
      await addBook(book, status);
      console.log('Book added successfully');
      
      // Close the search modal
      setShowBookSearch(false);
      console.log('Modal closed');
      
      // Switch to the appropriate tab based on status
      const finalStatus = (book as any).initialStatus || 'want-to-read';
      setActiveTab(finalStatus);
      console.log('Tab switched to:', finalStatus);
      
      // Show success message
      Alert.alert(
        'Book Added!', 
        `"${book.title}" has been added to your library!`,
        [{ text: 'OK' }]
      );
      console.log('Success alert shown');
      
    } catch (error) {
      console.error('Error in handleAddBook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add book to library';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleEditProgress = (book: any) => {
    setSelectedBookForDetails(book);
    setNewCurrentPage(book.currentPage?.toString() || '0');
    setShowProgressEdit(true);
  };

  const handleProgressUpdate = async () => {
    if (!selectedBookForDetails) return;
    
    const pageNumber = parseInt(newCurrentPage);
    if (isNaN(pageNumber) || pageNumber < 0) {
      Alert.alert('Invalid Page', 'Please enter a valid page number');
      return;
    }
    
    if (pageNumber > selectedBookForDetails.totalPages) {
      Alert.alert('Invalid Page', `Page number cannot exceed ${selectedBookForDetails.totalPages}`);
      return;
    }

    try {
      await updateBook(selectedBookForDetails.id, { currentPage: pageNumber });
      
      // Recalculate progress
      const progress = selectedBookForDetails.totalPages > 0 
        ? Math.round((pageNumber / selectedBookForDetails.totalPages) * 100)
        : 0;
      
      await updateBook(selectedBookForDetails.id, { progress });
      
      setShowProgressEdit(false);
      setSelectedBookForDetails(null);
      Alert.alert('Progress Updated', `Current page updated to ${pageNumber}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update progress');
    }
  };

  const handleRemoveBook = async (book: any) => {
    // This function is no longer needed as the logic is inline
  };
  // Safety check - don't render if books state is corrupted
  if (!books || !Array.isArray(books)) {
    console.error('Critical error: Books state is corrupted, showing error state');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Library</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Library Error</Text>
          <Text style={styles.errorSubtext}>Please refresh the app</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Library</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
          onPress={() => setShowBookSearch(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your books..."
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
          const count = useMemo(() => {
            try {
              if (!books || !Array.isArray(books)) return 0;
              return books.filter(book => book && book.status === tab.id).length;
            } catch (error) {
              console.error('Error calculating tab count:', error);
              return 0;
            }
          }, [books, tab.id]);
          
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

      {/* Books List */}
      <ScrollView style={styles.booksList} showsVerticalScrollIndicator={false}>
        {/* Add Book Card */}
        <TouchableOpacity 
          style={styles.addBookCard}
          onPress={() => setShowBookSearch(true)}
        >
          <View style={styles.addBookIcon}>
            <Plus size={24} color={currentTheme.primary} />
          </View>
          <Text style={[styles.addBookText, { color: currentTheme.primary }]}>Add a new book</Text>
        </TouchableOpacity>

        {filteredBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No books here yet</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'reading' ? 'Start reading to track your progress' : 
               activeTab === 'read' ? 'Finished books will appear here' : 
               activeTab === 'want-to-read' ? 'Add books you want to read' : ''}
            </Text>
          </View>
        ) : (
          filteredBooks.map((book) => (
            <TouchableOpacity 
              key={book.id} 
              style={styles.bookCard}
              onPress={() => setSelectedBookForDetails(book)}
            >
              <Image source={{ uri: book.cover }} style={styles.bookCover} />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  by {book.author}
                </Text>
                
                <View style={styles.bookMeta}>
                  {book.totalPages > 0 ? (
                    <Text style={styles.bookPages}>{book.totalPages} pages</Text>
                  ) : null}
                  {book.publishedDate ? (
                    <Text style={styles.bookYear}>
                      {new Date(book.publishedDate).getFullYear()}
                    </Text>
                  ) : null}
                </View>
                
                {book.progress ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: book.progress + '%', backgroundColor: currentTheme.primary }]} />
                    </View>
                    <Text style={[styles.progressText, { color: currentTheme.primary }]}>
                      {book.progress}% complete
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Book Search Modal */}
      <BookSearchModal
        visible={showBookSearch}
        onClose={() => setShowBookSearch(false)}
        onBookSelect={handleAddBook}
      />

      {/* Book Details Modal */}
      <Modal
        visible={!!selectedBookForDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedBookForDetails ? (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Book Details</Text>
              <TouchableOpacity
                style={styles.detailsCloseButton}
                onPress={() => setSelectedBookForDetails(null)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
              <View>
                {/* Status Change Section */}
                <View style={styles.statusChangeContainer}>
                  <Text style={styles.statusChangeTitle}>Reading Status</Text>
                  <View style={styles.statusChangeOptions}>
                    <TouchableOpacity
                      style={[
                        styles.statusChangeOption,
                        selectedBookForDetails.status === 'reading' && [styles.statusChangeOptionActive, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]
                      ]}
                      onPress={async () => {
                        if (isUpdating) return;
                        setIsUpdating(true);
                        try {
                          await updateBook(selectedBookForDetails.id, { 
                            status: 'reading',
                            dateStarted: selectedBookForDetails.status !== 'reading' ? new Date().toISOString() : selectedBookForDetails.dateStarted
                          });
                          setSelectedBookForDetails({ ...selectedBookForDetails, status: 'reading' });
                        } catch (error) {
                          console.error('Error updating book status:', error);
                          Alert.alert('Error', 'Failed to update book status');
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                    >
                      <BookOpen size={16} color={selectedBookForDetails.status === 'reading' ? '#FFFFFF' : currentTheme.primary} />
                      <Text style={[
                        styles.statusChangeOptionText,
                        selectedBookForDetails.status === 'reading' && styles.statusChangeOptionTextActive
                      ]}>
                        Reading
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusChangeOption,
                        selectedBookForDetails.status === 'read' && styles.statusChangeOptionActive
                      ]}
                      onPress={async () => {
                        if (isUpdating) return;
                        setIsUpdating(true);
                        try {
                          await updateBook(selectedBookForDetails.id, { 
                            status: 'read',
                            dateFinished: selectedBookForDetails.status !== 'read' ? new Date().toISOString() : selectedBookForDetails.dateFinished,
                            currentPage: selectedBookForDetails.totalPages,
                            progress: 100
                          });
                          setSelectedBookForDetails({ ...selectedBookForDetails, status: 'read', progress: 100 });
                        } catch (error) {
                          console.error('Error updating book status:', error);
                          Alert.alert('Error', 'Failed to update book status');
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                    >
                      <Book size={16} color={selectedBookForDetails.status === 'read' ? '#FFFFFF' : '#8B5CF6'} />
                      <Text style={[
                        styles.statusChangeOptionText,
                        selectedBookForDetails.status === 'read' && styles.statusChangeOptionTextActive
                      ]}>
                        Read
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.statusChangeOption,
                        selectedBookForDetails.status === 'want-to-read' && [styles.statusChangeOptionActive, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]
                      ]}
                      onPress={async () => {
                        if (isUpdating) return;
                        setIsUpdating(true);
                        try {
                          await updateBook(selectedBookForDetails.id, { status: 'want-to-read' });
                          setSelectedBookForDetails({ ...selectedBookForDetails, status: 'want-to-read' });
                        } catch (error) {
                          console.error('Error updating book status:', error);
                          Alert.alert('Error', 'Failed to update book status');
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                    >
                      <Heart size={16} color={selectedBookForDetails.status === 'want-to-read' ? '#FFFFFF' : '#EF4444'} />
                      <Text style={[
                        styles.statusChangeOptionText,
                        selectedBookForDetails.status === 'want-to-read' && styles.statusChangeOptionTextActive
                      ]}>
                        Want to Read
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.detailsBookHeader}>
                  <Image source={{ uri: selectedBookForDetails.cover }} style={styles.detailsBookCover} />
                  <View style={styles.detailsBookInfo}>
                    <Text style={styles.detailsBookTitle}>{selectedBookForDetails.title}</Text>
                    <Text style={styles.detailsBookAuthor}>by {selectedBookForDetails.author}</Text>
                    
                    <View style={styles.detailsMetaRow}>
                      {selectedBookForDetails.totalPages > 0 ? (
                        <Text style={styles.detailsMetaText}>{selectedBookForDetails.totalPages} pages</Text>
                      ) : null}
                      {selectedBookForDetails.publishedDate ? (
                        <Text style={styles.detailsMetaText}>
                          Published {new Date(selectedBookForDetails.publishedDate).getFullYear()}
                        </Text>
                      ) : null}
                    </View>
                    
                    {selectedBookForDetails.categories ? (
                      <View style={styles.categoriesContainer}>
                        {selectedBookForDetails.categories.slice(0, 3).map((category: string, index: number) => (
                          <View key={index} style={styles.categoryTag}>
                            <Text style={styles.categoryText}>{category}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    
                    <View style={styles.progressActions}>
                      <TouchableOpacity 
                        style={[styles.editProgressButton, { backgroundColor: currentTheme.primary }]}
                        onPress={() => handleEditProgress(selectedBookForDetails)}
                      >
                        <Text style={styles.editProgressButtonText}>Edit Progress</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeBookButton}
                        onPress={() => {
                          Alert.alert(
                            'Remove Book',
                            `Are you sure you want to remove "${selectedBookForDetails.title}" from your library?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Remove', 
                                style: 'destructive',
                                onPress: async () => {
                                  if (isUpdating) return;
                                  setIsUpdating(true);
                                  
                                  // Store the book details before removal
                                  const bookToRemove = selectedBookForDetails;
                                  
                                  try {
                                    console.log('Starting book removal process...');
                                    await removeBook(bookToRemove.id);
                                    console.log('Book removed successfully, closing modal...');
                                    
                                    // Close the modal first
                                    setSelectedBookForDetails(null);
                                    
                                    // Small delay to ensure state is stable
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    console.log('Showing success alert...');
                                    Alert.alert('Book Removed', `"${bookToRemove.title}" has been removed from your library`);
                                  } catch (error) {
                                    console.error('Error removing book:', error);
                                    Alert.alert('Error', 'Failed to remove book');
                                  } finally {
                                    console.log('Removing loading state...');
                                    setIsUpdating(false);
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.removeBookButtonText}>Remove Book</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                {selectedBookForDetails.description ? (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedBookForDetails.description?.replace(/<[^>]*>/g, '') || 'No description available'}
                    </Text>
                  </View>
                ) : null}
                
                {selectedBookForDetails.progress !== undefined ? (
                  <View style={styles.progressSection}>
                    <Text style={styles.progressSectionTitle}>Your Progress</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: selectedBookForDetails.progress + '%' }]} />
                      </View>
                      <Text style={styles.progressText}>{selectedBookForDetails.progress}% complete</Text>
                    </View>
                    {selectedBookForDetails.currentPage ? (
                      <Text style={styles.currentPageText}>
                        Currently on page {selectedBookForDetails.currentPage} of {selectedBookForDetails.totalPages}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                
                <View style={styles.detailsBottomPadding} />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>

      {/* Progress Edit Modal */}
      <Modal
        visible={showProgressEdit}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.progressModalOverlay}>
          <View style={styles.progressModalContainer}>
            <Text style={styles.progressModalTitle}>Update Reading Progress</Text>
            <Text style={styles.progressModalSubtitle}>
              What page are you currently on?
            </Text>
            
            <View style={styles.progressInputContainer}>
              <TextInput
                style={styles.progressInput}
                value={newCurrentPage}
                onChangeText={setNewCurrentPage}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
                autoFocus
              />
              <Text style={styles.progressInputLabel}>
                of {selectedBookForDetails?.totalPages || 0} pages
              </Text>
            </View>
            
            <View style={styles.progressModalButtons}>
              <TouchableOpacity
                style={styles.progressModalCancel}
                onPress={() => {
                  setShowProgressEdit(false);
                  setNewCurrentPage('');
                }}
              >
                <Text style={styles.progressModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.progressModalConfirm, { backgroundColor: currentTheme.primary }]}
                onPress={handleProgressUpdate}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.progressModalConfirmText}>Update</Text>
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
    paddingHorizontal: 12,
    borderRadius: 10,
    position: 'relative',
    minWidth: 0,
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
    flexShrink: 1,
    textAlign: 'center',
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
  booksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  addBookIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  addBookText: {
    fontSize: 18,
    fontWeight: '600',
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bookCover: {
    width: 64,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  bookAuthor: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  bookMeta: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  bookPages: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 12,
  },
  bookYear: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomPadding: {
    height: 32,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailsHeader: {
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
  detailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailsCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailsBookHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsBookCover: {
    width: 100,
    height: 150,
    borderRadius: 12,
    marginRight: 20,
  },
  detailsBookInfo: {
    flex: 1,
  },
  detailsBookTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  detailsBookAuthor: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 12,
  },
  detailsMetaRow: {
    marginBottom: 12,
  },
  detailsMetaText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#047857',
  },
  progressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editProgressButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  editProgressButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeBookButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  removeBookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748B',
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  currentPageText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginTop: 8,
  },
  detailsBottomPadding: {
    height: 32,
  },
  recalculateButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  recalculateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusChangeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusChangeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  statusChangeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChangeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChangeOptionActive: {
  },
  statusChangeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  statusChangeOptionTextActive: {
    color: '#FFFFFF',
  },
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  progressModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressModalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressInputContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: 120,
    maxWidth: 120,
  },
  progressInputLabel: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
  progressModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  progressModalCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  progressModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  progressModalConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  progressModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});