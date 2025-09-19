/*
  # Add Theme Support to User Profiles

  1. Changes
    - Add `theme_color` field to user_profiles table
    - Set default theme to 'emerald' (current green)
    - Add constraint to ensure valid theme values

  2. Security
    - No changes to RLS policies needed
    - Users can update their own theme preference
*/

-- Add theme_color column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN theme_color text DEFAULT 'emerald' CHECK (theme_color IN ('emerald', 'pink', 'red', 'blue', 'orange', 'purple'));
  END IF;
END $$;