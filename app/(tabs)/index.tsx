import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import {
  Play,
  Pause,
  BookMarked,
  Flame,
  Crown,
  Gift,
  X,
  Check,
  Calendar,
} from 'lucide-react-native';
import { useBooks } from '@/hooks/useBooks';
import BookSearchModal from '@/components/BookSearchModal';
import { Book as GoogleBook } from '@/services/googleBooksApi';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { currentTheme } = useTheme();
  const { addReadingSession, getTodayReadingTime } = useBooks();
  const { profile } = useProfile();
  const { getCurrentStreak, getWeeklyStreaks, getTodayMinutes, updateTodayStreak } = useStreaks();
  const { books: userBooks, addBook, updateProgress, getBooksByStatus, refreshBooks } = useBooks();
  const [todayProgress, setTodayProgress] = useState(getTodayMinutes());
  const [isReading, setIsReading] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [showPageInput, setShowPageInput] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [endingPage, setEndingPage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get daily goal from profile, with real-time updates
  const dailyGoal = profile?.daily_goal_minutes || 30;

  // Get all books from library for selection
  const allBooks = userBooks;

  // Get real user data
  const currentStreak = getCurrentStreak();
  const weeklyStreak = getWeeklyStreaks();

  useEffect(() => {
    const updateTodayProgress = async () => {
      const todayMinutes = await getTodayReadingTime();
      setTodayProgress(todayMinutes);
    };
    updateTodayProgress();
  }, [getTodayReadingTime, profile?.daily_goal_minutes]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReading, sessionTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.min((todayProgress / dailyGoal) * 100, 100);

  const handleStartReading = () => {
    if (allBooks.length === 0) {
      Alert.alert(
        'No Books to Read',
        'You need to add some books to your library first. Would you like to search for books?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Search Books', onPress: () => setShowBookSearch(true) }
        ]
      );
    } else {
      setShowBookSelector(true);
    }
  };

  const handleBookSelect = (book: any) => {
    setSelectedBook(book);
    setShowBookSelector(false);
    setSessionStartTime(Date.now());
    setIsReading(true);
  };

  const handleStopReading = () => {
    setIsReading(false);
    setShowPageInput(true);
  };

  const handleEndingPageSubmit = async () => {
    if (!selectedBook || !endingPage || isNaN(parseInt(endingPage))) {
      Alert.alert('Invalid Page', 'Please enter a valid page number');
      return;
    }

    const endPageNum = parseInt(endingPage);
    const startPageNum = selectedBook.currentPage || 0;

    if (endPageNum < startPageNum) {
      Alert.alert('Invalid Page', 'Ending page cannot be less than starting page');
      return;
    }

    setIsLoading(true);
    try {
      const sessionMinutes = Math.floor(sessionTime / 60);
      const startTime = new Date(sessionStartTime);
      const endTime = new Date();
      
      // Update book progress first
      await updateProgress(selectedBook.id, endPageNum);
      
      // Save reading session
      await addReadingSession(
        selectedBook.id,
        startTime,
        endTime,
        startPageNum,
        endPageNum
      );
      
      // Get updated today's total reading time
      const updatedTodayTotal = await getTodayReadingTime();
      setTodayProgress(updatedTodayTotal);
      
      // Update streak data
      await updateTodayStreak(updatedTodayTotal);
      
      // Refresh books to get updated data
      await refreshBooks();
      
      Alert.alert(
        'Session Saved!',
        `Great job! You read for ${sessionMinutes} minutes and progressed from page ${startPageNum} to ${endPageNum}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving reading session:', error);
      Alert.alert('Error', 'Failed to save reading session. Please try again.');
    } finally {
      setIsLoading(false);
    }
    
    // Reset state
    setShowPageInput(false);
    setSessionTime(0);
    setSelectedBook(null);
    setEndingPage('');
  };

  const handleCancelSession = () => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this reading session? Your progress will not be saved.',
      [
        { text: 'Keep Reading', style: 'cancel' },
        { text: 'Cancel Session', style: 'destructive', onPress: () => {
          setIsReading(false);
          setSessionTime(0);
          setSelectedBook(null);
          setEndingPage('');
          setShowPageInput(false);
        }}
      ]
    );
  };


  const handleAddBookFromSearch = async (book: GoogleBook) => {
    try {
      const status = (book as any).initialStatus || 'want-to-read';
      await addBook(book, status);
      Alert.alert(
        'Book Added!', 
        `"${book.title}" has been added to your library!`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add book to library';
      Alert.alert('Error', errorMessage);
    }
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.greetingSection}>
              <Text style={styles.greeting}>Today's Reading</Text>
              <Text style={styles.subGreeting}>Keep your streak alive</Text>
            </View>
            <TouchableOpacity style={[styles.streakBadge, { backgroundColor: currentTheme.primary }]}>
              <Flame size={16} color="#FFFFFF" />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekly Progress Card */}
        <View style={styles.weeklyCard}>
          <View style={styles.goalHeader}>
            <Calendar size={20} color={currentTheme.primary} />
            <Text style={styles.goalTitle}>This Week</Text>
          </View>
          <View style={styles.weeklyCalendar}>
            {weeklyStreak.map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                <Text style={styles.dayLabel}>{day.day}</Text>
                <View style={[
                  styles.dayCircle,
                  day.goalReached ? [styles.dayCompleted, { backgroundColor: currentTheme.primary }] : styles.dayIncomplete
                ]}>
                  {day.goalReached && <View style={styles.dayDot} />}
                </View>
                <Text style={styles.dayMinutes}>{day.minutes}m</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reading Timer Card */}
        <View style={styles.timerCard}>
          <Text style={styles.timerTitle}>Reading Session</Text>
          {selectedBook && (
            <View style={styles.selectedBookInfo}>
              <Image source={{ uri: selectedBook.cover }} style={styles.selectedBookCover} />
              <View style={styles.selectedBookDetails}>
                <Text style={styles.selectedBookTitle} numberOfLines={1}>
                  {selectedBook.title}
                </Text>
                <Text style={styles.selectedBookAuthor} numberOfLines={1}>
                  by {selectedBook.author}
                </Text>
                {selectedBook.currentPage && (
                  <Text style={styles.selectedBookPage}>
                    Page {selectedBook.currentPage} of {selectedBook.totalPages}
                  </Text>
                )}
              </View>
            </View>
          )}
          <View style={styles.timerDisplay}>
            <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.timerButton, 
              { backgroundColor: currentTheme.primary },
              isReading && { backgroundColor: '#EF4444' }
            ]}
            onPress={isReading ? handleStopReading : handleStartReading}
          >
            {isReading ? (
              <Pause size={24} color="#FFFFFF" />
            ) : (
              <Play size={24} color="#FFFFFF" />
            )}
            <Text style={styles.timerButtonText}>
              {isReading ? 'Finish Session' : 'Start Reading'}
            </Text>
          </TouchableOpacity>
          {!selectedBook && (
            <Text style={styles.goalCompleted}>Goal completed!</Text>
          )}
        </View>

        {/* Daily Goal Card */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <BookMarked size={20} color={currentTheme.primary} />
            <Text style={styles.goalTitle}>Today's Goal</Text>
          </View>
          
          <View style={styles.goalProgress}>
            <Text style={styles.goalTime}>{todayProgress} / {dailyGoal} minutes</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: currentTheme.primary }]} />
              </View>
            </View>
            {dailyGoal - todayProgress > 0 ? (
              <Text style={styles.goalRemaining}>
                {dailyGoal - todayProgress} minutes remaining
              </Text>
            ) : (
              <Text style={styles.goalCompleted}>🎉 Goal completed!</Text>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Book Selection Modal */}
      <Modal
        visible={showBookSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Book</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBookSelector(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={allBooks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bookOption}
                onPress={() => handleBookSelect(item)}
              >
                <Image source={{ uri: item.cover }} style={styles.bookOptionCover} />
                <View style={styles.bookOptionInfo}>
                  <Text style={styles.bookOptionTitle}>{item.title}</Text>
                  <Text style={styles.bookOptionAuthor}>by {item.author}</Text>
                  <View style={styles.bookStatusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={styles.bookStatus}>{getStatusLabel(item.status)}</Text>
                  </View>
                  {item.currentPage && item.currentPage > 0 ? (
                    <Text style={styles.bookOptionProgress}>
                      Page {item.currentPage} of {item.totalPages}
                    </Text>
                  ) : (
                    <Text style={styles.bookOptionNew}>Start from beginning</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.bookList}
            ListEmptyComponent={
              <View style={styles.emptyBookList}>
                <Text style={styles.emptyBookText}>No books in your reading list</Text>
                <TouchableOpacity 
                  style={styles.addFirstBookButton}
                  onPress={() => {
                    setShowBookSelector(false);
                    setShowBookSearch(true);
                  }}
                >
                  <Text style={styles.addFirstBookText}>Add Your First Book</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Page Input Modal */}
      <Modal
        visible={showPageInput}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.pageModalOverlay}>
          <View style={styles.pageModalContainer}>
            <Text style={styles.pageModalTitle}>
              What page did you finish on?
            </Text>
            <TextInput
              style={styles.pageInput}
              placeholder="Enter page number"
              value={endingPage}
              onChangeText={setEndingPage}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.pageModalButtons}>
              <TouchableOpacity
                style={styles.pageModalCancel}
                onPress={() => {
                  handleCancelSession();
                }}
              >
                <Text style={styles.pageModalCancelText}>
                  Cancel Session
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageModalConfirm, { backgroundColor: currentTheme.primary }]}
                onPress={handleEndingPageSubmit}
                disabled={isLoading}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.pageModalConfirmText}>
                  {isLoading ? 'Saving...' : 'Finish Session'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Book Search Modal */}
      <BookSearchModal
        visible={showBookSearch}
        onClose={() => setShowBookSearch(false)}
        onBookSelect={handleAddBookFromSearch}
      />
    </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#64748B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  weeklyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  weeklyCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayCompleted: {
  },
  dayIncomplete: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  dayMinutes: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  goalProgress: {
    alignItems: 'center',
  },
  goalTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  goalRemaining: {
    fontSize: 16,
    color: '#64748B',
  },
  goalCompleted: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  selectedBookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  selectedBookCover: {
    width: 40,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  selectedBookDetails: {
    flex: 1,
  },
  selectedBookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  selectedBookAuthor: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  selectedBookPage: {
    fontSize: 12,
    fontWeight: '500',
  },
  timerDisplay: {
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1E293B',
    fontFamily: 'System',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  selectBookHint: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
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
  bookList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  bookOptionCover: {
    width: 50,
    height: 75,
    borderRadius: 8,
    marginRight: 16,
  },
  bookOptionInfo: {
    flex: 1,
  },
  bookOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  bookOptionAuthor: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
  },
  bookOptionProgress: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  bookOptionNew: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  bookStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bookStatus: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyBookList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyBookText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  addFirstBookButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstBookText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width - 40,
    maxWidth: 400,
  },
  pageModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  pageInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
  },
  pageModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pageModalCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  pageModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  pageModalConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  pageModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  bottomPadding: {
    height: 20,
  },
});