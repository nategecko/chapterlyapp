import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Book } from '@/services/googleBooksApi';

export interface UserBook extends Book {
  id: string;
  user_id: string;
  status: 'reading' | 'read' | 'want-to-read';
  currentPage?: number;
  progress?: number;
  dateAdded: string;
  dateStarted?: string;
  dateFinished?: string;
  notes?: string;
}

export function useBooks() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const { user } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      // Add small delay to prevent blocking initial render
      const timer = setTimeout(() => {
        loadBooks();
      }, 100);
      return () => {
        clearTimeout(timer);
        isMounted.current = false;
      };
    } else {
      if (isMounted.current) {
        setBooks([]);
        setIsLoading(false);
      }
    }
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const loadBooks = async () => {
    if (!user) return;
    
    try {
      if (isMounted.current) {
        setIsLoading(true);
      }
      const { data, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userBooks: UserBook[] = data.map(book => ({
        id: book.id,
        user_id: book.user_id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        totalPages: book.total_pages,
        currentPage: book.current_page,
        progress: book.progress,
        status: book.status,
        description: book.description,
        publishedDate: book.published_date,
        categories: book.categories,
        isbn: book.isbn,
        dateAdded: book.date_added,
        dateStarted: book.date_started,
        dateFinished: book.date_finished,
        notes: book.notes,
      }));

      if (isMounted.current) {
        setBooks(userBooks);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const addBook = async (book: Book, status: UserBook['status'] = 'want-to-read') => {
    if (!user) throw new Error('User not authenticated');

    // Check if book already exists
    const existingBook = books.find(b => b.id === book.id);
    if (existingBook) {
      throw new Error('This book is already in your library');
    }

    try {
      const bookData = {
        user_id: user.id,
        google_book_id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        total_pages: book.totalPages,
        status,
        description: book.description || '',
        published_date: book.publishedDate || '',
        categories: book.categories || [],
        isbn: book.isbn || '',
        date_started: status === 'reading' ? new Date().toISOString() : null,
        date_finished: status === 'read' ? new Date().toISOString() : null,
        progress: status === 'read' ? 100 : 0,
        current_page: status === 'read' ? book.totalPages : 0,
      };

      const { data, error } = await supabase
        .from('user_books')
        .insert(bookData)
        .select()
        .single();

      if (error) throw error;

      const newUserBook: UserBook = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        author: data.author,
        cover: data.cover,
        totalPages: data.total_pages,
        currentPage: data.current_page,
        progress: data.progress,
        status: data.status,
        description: data.description,
        publishedDate: data.published_date,
        categories: data.categories,
        isbn: data.isbn,
        dateAdded: data.date_added,
        dateStarted: data.date_started,
        dateFinished: data.date_finished,
        notes: data.notes,
      };

      // Use a more defensive state update
      if (isMounted.current) {
        setBooks(prev => {
          // Check if the book is already in the array to prevent duplicates
          if (prev.some(b => b.id === newUserBook.id)) {
            console.log('Book already exists in state, not adding duplicate');
            return prev;
          }
          return [newUserBook, ...prev];
        });
      }
      
      return newUserBook;
    } catch (error) {
      console.error('Error adding book:', error);
      throw new Error('Failed to add book to library');
    }
  };

  const updateBook = async (bookId: string, updates: Partial<UserBook>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const dbUpdates: any = {};
      
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.currentPage !== undefined) dbUpdates.current_page = updates.currentPage;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.dateStarted !== undefined) dbUpdates.date_started = updates.dateStarted;
      if (updates.dateFinished !== undefined) dbUpdates.date_finished = updates.dateFinished;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase
        .from('user_books')
        .update(dbUpdates)
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (isMounted.current) {
        setBooks(prev => {
          const updatedBooks = prev.map(book => 
            book.id === bookId ? { ...book, ...updates } : book
          );
          
          // Log the update for debugging
          console.log(`Updated book ${bookId} with:`, updates);
          
          return updatedBooks;
        });
      }
    } catch (error) {
      console.error('Error updating book:', error);
      throw new Error('Failed to update book');
    }
  };

  const removeBook = async (bookId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('Removing book:', bookId);
      
      const { error } = await supabase
        .from('user_books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('Book removed from database, updating state...');
      
      // Use a more defensive state update
      if (isMounted.current) {
        setBooks(prev => {
          if (!prev || !Array.isArray(prev)) {
            console.warn('Books state is invalid, resetting to empty array');
            return [];
          }
          
          const filtered = prev.filter(book => book.id !== bookId);
          console.log(`State updated: ${prev.length} -> ${filtered.length} books`);
          return filtered;
        });
      }
      
      console.log('Book removal completed successfully');
    } catch (error) {
      console.error('Error removing book:', error);
      throw new Error('Failed to remove book');
    }
  };

  const updateProgress = async (bookId: string, currentPage: number) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Calculate progress correctly
    let progress = 0;
    if (book.totalPages > 0 && currentPage > 0) {
      progress = Math.round((currentPage / book.totalPages) * 100);
      progress = Math.min(progress, 100); // Cap at 100%
    }
    
    const updates: Partial<UserBook> = {
      currentPage,
      progress,
    };

    // If they've finished the book
    if (currentPage >= book.totalPages) {
      updates.status = 'read';
      updates.dateFinished = new Date().toISOString();
    } else if (book.status === 'want-to-read' && currentPage > 0) {
      // If they started reading a "want to read" book
      updates.status = 'reading';
      updates.dateStarted = new Date().toISOString();
    }

    await updateBook(bookId, updates);
  };

  const addReadingSession = async (
    bookId: string,
    startTime: Date,
    endTime: Date,
    startingPage: number,
    endingPage: number
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      const { error } = await supabase
        .from('reading_sessions')
        .insert({
          user_id: user.id,
          book_id: bookId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          starting_page: startingPage,
          ending_page: endingPage,
        });

      if (error) throw error;
      
      console.log('Reading session saved successfully:', {
        bookId,
        durationMinutes,
        startingPage,
        endingPage
      });
    } catch (error) {
      console.error('Error adding reading session:', error);
      throw new Error('Failed to save reading session');
    }
  };

  const getBooksByStatus = (status: UserBook['status']) => {
    return books.filter(book => book.status === status);
  };

  const getBookById = (bookId: string) => {
    return books.find(book => book.id === bookId);
  };

  const getTodayReadingTime = async () => {
    if (!user) return 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      if (error) throw error;

      return data.reduce((total, session) => total + session.duration_minutes, 0);
    } catch (error) {
      console.error('Error getting today reading time:', error);
      return 0;
    }
  };

  const getWeeklyReadingTime = async () => {
    if (!user) return 0;

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('reading_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('start_time', weekAgo.toISOString());

      if (error) throw error;

      return data.reduce((total, session) => total + session.duration_minutes, 0);
    } catch (error) {
      console.error('Error getting weekly reading time:', error);
      return 0;
    }
  };

  const recalculateProgress = async (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book || !book.currentPage || !book.totalPages) return;

    // Recalculate progress
    let progress = 0;
    if (book.totalPages > 0 && book.currentPage > 0) {
      progress = Math.round((book.currentPage / book.totalPages) * 100);
      progress = Math.min(progress, 100);
    }

    await updateBook(bookId, { progress });
  };

  // Auto-fix any books with incorrect progress on load - DISABLED due to potential infinite loops
  // useEffect(() => {
  //   let isMounted = true;
  //   
  //   const fixIncorrectProgress = async () => {
  //     if (!isMounted) return;
  //     
  //     for (const book of books) {
  //       if (!isMounted) return;
  //       
  //       if (book.currentPage && book.totalPages && book.currentPage < book.totalPages && book.progress === 100) {
  //         // This book has incorrect 100% progress, fix it
  //         const correctProgress = Math.round((book.currentPage / book.totalPages) * 100);
  //         try {
  //           await updateBook(book.id, { progress: correctProgress });
  //         } catch (error) {
  //           console.error('Error fixing book progress:', error);
  //         }
  //       }
  //     }
  //   };
  //   
  //   if (books.length > 0) {
  //     fixIncorrectProgress();
  //   }
  //   
  //   return () => {
  //     isMounted = false;
  //   };
  // }, []); // Only run once on mount

  return {
    books,
    isLoading,
    addBook,
    updateBook,
    updateProgress,
    recalculateProgress,
    addReadingSession,
    getBooksByStatus,
    getBookById,
    getTodayReadingTime,
    getWeeklyReadingTime,
    removeBook,
    refreshBooks: loadBooks,
  };
}