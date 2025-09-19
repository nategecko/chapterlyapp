/*
  # Create user_streaks table

  1. New Tables
    - `user_streaks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date, for tracking daily streaks)
      - `minutes_read` (integer, total minutes read that day)
      - `goal_met` (boolean, whether daily goal was achieved)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_streaks` table
    - Add policies for authenticated users to manage their own streaks

  3. Indexes
    - Add index on user_id and date for efficient queries
    - Add unique constraint on user_id + date combination
*/

CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  minutes_read integer DEFAULT 0 NOT NULL,
  goal_met boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate entries for same user/date
ALTER TABLE user_streaks ADD CONSTRAINT user_streaks_user_date_unique UNIQUE (user_id, date);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_date ON user_streaks (user_id, date);

-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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