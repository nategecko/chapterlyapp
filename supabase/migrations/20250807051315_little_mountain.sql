/*
  # Create user books and reading sessions tables

  1. New Tables
    - `user_books`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `google_book_id` (text, the Google Books API ID)
      - `title` (text)
      - `author` (text)
      - `cover` (text, image URL)
      - `total_pages` (integer)
      - `current_page` (integer)
      - `progress` (integer, percentage)
      - `status` (text, reading/read/want-to-read)
      - `description` (text)
      - `published_date` (text)
      - `categories` (text array)
      - `isbn` (text)
      - `date_added` (timestamptz)
      - `date_started` (timestamptz)
      - `date_finished` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `reading_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `book_id` (uuid, references user_books)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `duration_minutes` (integer)
      - `starting_page` (integer)
      - `ending_page` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data only
*/

-- Create user_books table
CREATE TABLE IF NOT EXISTS user_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_book_id text NOT NULL,
  title text NOT NULL,
  author text NOT NULL DEFAULT '',
  cover text NOT NULL DEFAULT '',
  total_pages integer DEFAULT 0,
  current_page integer DEFAULT 0,
  progress integer DEFAULT 0,
  status text NOT NULL DEFAULT 'want-to-read' CHECK (status IN ('reading', 'read', 'want-to-read')),
  description text DEFAULT '',
  published_date text DEFAULT '',
  categories text[] DEFAULT '{}',
  isbn text DEFAULT '',
  date_added timestamptz DEFAULT now(),
  date_started timestamptz,
  date_finished timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reading_sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES user_books(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  starting_page integer DEFAULT 0,
  ending_page integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_books
CREATE POLICY "Users can view their own books"
  ON user_books
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own books"
  ON user_books
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON user_books
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON user_books
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for reading_sessions
CREATE POLICY "Users can view their own reading sessions"
  ON reading_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading sessions"
  ON reading_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading sessions"
  ON reading_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading sessions"
  ON reading_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions(book_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_books
DROP TRIGGER IF EXISTS update_user_books_updated_at ON user_books;
CREATE TRIGGER update_user_books_updated_at
  BEFORE UPDATE ON user_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();