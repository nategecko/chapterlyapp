/*
  # Create Friends System

  1. New Tables
    - `friend_requests`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references user_profiles)
      - `receiver_id` (uuid, references user_profiles)
      - `status` (enum: pending, accepted, declined)
      - `created_at` (timestamp)
    - `friendships`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references user_profiles)
      - `user2_id` (uuid, references user_profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own friend requests and friendships

  3. Changes
    - Add unique constraint to usernames in user_profiles
    - Add function to check username availability
*/

-- Add unique constraint to usernames (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_username_key' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received friend requests"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Friendships policies
CREATE POLICY "Users can view their friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to search users by username
CREATE OR REPLACE FUNCTION search_users_by_username(search_term text)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_friend boolean,
  request_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.avatar_url,
    CASE 
      WHEN f.id IS NOT NULL THEN true
      ELSE false
    END as is_friend,
    COALESCE(fr.status, 'none') as request_status
  FROM user_profiles up
  LEFT JOIN friendships f ON (
    (f.user1_id = auth.uid() AND f.user2_id = up.id) OR
    (f.user2_id = auth.uid() AND f.user1_id = up.id)
  )
  LEFT JOIN friend_requests fr ON (
    (fr.sender_id = auth.uid() AND fr.receiver_id = up.id) OR
    (fr.receiver_id = auth.uid() AND fr.sender_id = up.id)
  )
  WHERE 
    up.id != auth.uid() 
    AND up.username IS NOT NULL
    AND LOWER(up.username) LIKE LOWER('%' || search_term || '%')
  ORDER BY up.username;
END;
$$;

-- Function to get user's friends with reading stats
CREATE OR REPLACE FUNCTION get_user_friends_with_stats()
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  weekly_minutes bigint,
  current_streak bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.avatar_url,
    COALESCE(weekly_stats.total_minutes, 0) as weekly_minutes,
    COALESCE(streak_stats.current_streak, 0) as current_streak
  FROM user_profiles up
  INNER JOIN friendships f ON (
    (f.user1_id = auth.uid() AND f.user2_id = up.id) OR
    (f.user2_id = auth.uid() AND f.user1_id = up.id)
  )
  LEFT JOIN (
    SELECT 
      rs.user_id,
      SUM(rs.duration_minutes) as total_minutes
    FROM reading_sessions rs
    WHERE rs.start_time >= (CURRENT_DATE - INTERVAL '7 days')
    GROUP BY rs.user_id
  ) weekly_stats ON weekly_stats.user_id = up.id
  LEFT JOIN (
    SELECT 
      us.user_id,
      COUNT(*) as current_streak
    FROM user_streaks us
    WHERE us.goal_met = true
      AND us.date >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY us.user_id
  ) streak_stats ON streak_stats.user_id = up.id
  WHERE up.id != auth.uid()
  ORDER BY weekly_minutes DESC, up.username;
END;
$$;