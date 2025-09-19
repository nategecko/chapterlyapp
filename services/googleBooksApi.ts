export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    categories?: string[];
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
  description?: string;
  publishedDate?: string;
  categories?: string[];
  isbn?: string;
}

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

export class GoogleBooksService {
  static async searchBooks(query: string, maxResults: number = 20): Promise<Book[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${GOOGLE_BOOKS_API_BASE}?q=${encodedQuery}&maxResults=${maxResults}&printType=books`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items) {
        return [];
      }
      
      return data.items.map((item: GoogleBook) => this.transformGoogleBook(item));
    } catch (error) {
      console.error('Error searching books:', error);
      throw new Error('Failed to search books. Please try again.');
    }
  }

  static async getBookById(bookId: string): Promise<Book | null> {
    try {
      const url = `${GOOGLE_BOOKS_API_BASE}/${bookId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Google Books API error: ${response.status}`);
      }
      
      const data: GoogleBook = await response.json();
      return this.transformGoogleBook(data);
    } catch (error) {
      console.error('Error fetching book:', error);
      throw new Error('Failed to fetch book details. Please try again.');
    }
  }

  private static transformGoogleBook(googleBook: GoogleBook): Book {
    const { volumeInfo } = googleBook;
    
    // Get the best available cover image
    const cover = volumeInfo.imageLinks?.thumbnail || 
                 volumeInfo.imageLinks?.smallThumbnail || 
                 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400';
    
    // Get ISBN if available
    const isbn = volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier;
    
    return {
      id: googleBook.id,
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      cover: cover.replace('http://', 'https://'), // Ensure HTTPS
      totalPages: volumeInfo.pageCount || 0,
      description: volumeInfo.description,
      publishedDate: volumeInfo.publishedDate,
      categories: volumeInfo.categories,
      isbn,
    };
  }

  static async searchByISBN(isbn: string): Promise<Book | null> {
    try {
      const books = await this.searchBooks(`isbn:${isbn}`, 1);
      return books.length > 0 ? books[0] : null;
    } catch (error) {
      console.error('Error searching by ISBN:', error);
      return null;
    }
  }

  static async getPopularBooks(category?: string): Promise<Book[]> {
    try {
      const query = category ? `subject:${category}` : 'bestseller';
      return await this.searchBooks(query, 10);
    } catch (error) {
      console.error('Error fetching popular books:', error);
      return [];
    }
  }
}