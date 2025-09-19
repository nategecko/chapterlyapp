export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          daily_goal_minutes: number;
          theme_color?: string;
          onboarding_completed: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          daily_goal_minutes?: number;
          theme_color?: string | null;
          onboarding_completed?: boolean;
          avatar_url?: string | null;
        };
        Update: {
          username?: string | null;
          daily_goal_minutes?: number;
          theme_color?: string | null;
          onboarding_completed?: boolean;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          google_book_id: string;
          title: string;
          author: string;
          cover: string;
          total_pages: number;
          current_page: number;
          progress: number;
          status: 'reading' | 'read' | 'want-to-read';
          description: string;
          published_date: string;
          categories: string[];
          isbn: string;
          date_added: string;
          date_started: string | null;
          date_finished: string | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_book_id: string;
          title: string;
          author?: string;
          cover?: string;
          total_pages?: number;
          current_page?: number;
          progress?: number;
          status?: 'reading' | 'read' | 'want-to-read';
          description?: string;
          published_date?: string;
          categories?: string[];
          isbn?: string;
          date_added?: string;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_book_id?: string;
          title?: string;
          author?: string;
          cover?: string;
          total_pages?: number;
          current_page?: number;
          progress?: number;
          status?: 'reading' | 'read' | 'want-to-read';
          description?: string;
          published_date?: string;
          categories?: string[];
          isbn?: string;
          date_added?: string;
          date_started?: string | null;
          date_finished?: string | null;
          notes?: string;
          updated_at?: string;
        };
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          starting_page: number;
          ending_page: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          start_time: string;
          end_time: string;
          duration_minutes?: number;
          starting_page?: number;
          ending_page?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          starting_page?: number;
          ending_page?: number;
        };
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          minutes_read: number;
          goal_met: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          minutes_read?: number;
          goal_met?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          minutes_read?: number;
          goal_met?: boolean;
        };
      };
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          status?: 'pending' | 'accepted' | 'declined';
        };
        Update: {
          status?: 'pending' | 'accepted' | 'declined';
        };
      };
      friendships: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
        };
        Update: {
          user1_id?: string;
          user2_id?: string;
        };
      };
    };
  };
}