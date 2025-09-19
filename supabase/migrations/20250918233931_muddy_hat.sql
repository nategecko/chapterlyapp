/*
  # Add Theme Color Column to User Profiles

  1. Changes
    - Add `theme_color` column to user_profiles table
    - Set default theme to 'emerald'
    - Add constraint to ensure valid theme values
    - Update existing users to have default theme

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
    
    -- Update existing users to have the default theme
    UPDATE user_profiles SET theme_color = 'emerald' WHERE theme_color IS NULL;
  END IF;
END $$;