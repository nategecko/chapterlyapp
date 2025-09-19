/*
  # Fix User Streaks Table

  1. New Tables
    - `user_streaks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date, unique per user)
      - `minutes_read` (integer, default 0)
      - `goal_met` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_streaks` table
    - Add policies for authenticated users to manage their own streak data

  3. Indexes
    - Index on user_id and date for efficient queries
    - Unique constraint on user_id + date combination
*/

-- Drop table if it exists to recreate properly
DROP TABLE IF EXISTS user_streaks CASCADE;

-- Create user_streaks table
CREATE TABLE user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  minutes_read integer DEFAULT 0 NOT NULL,
  goal_met boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indexes
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_user_date ON user_streaks(user_id, date);

-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own streaks"
  ON user_streaks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON user_streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
  ON user_streaks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);