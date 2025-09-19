/*
  # Fix Theme Color Column Migration

  1. Changes
    - Add `theme_color` column to user_profiles table if it doesn't exist
    - Set default theme to 'emerald'
    - Add constraint to ensure valid theme values
    - Update existing users to have default theme

  2. Security
    - No changes to RLS policies needed
    - Users can update their own theme preference
*/

-- Check if theme_color column exists and add it if it doesn't
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'theme_color'
  ) THEN
    -- Add the column with default value and constraint
    ALTER TABLE public.user_profiles 
    ADD COLUMN theme_color text DEFAULT 'emerald';
    
    -- Add check constraint for valid theme values
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_theme_color_check 
    CHECK (theme_color IN ('emerald', 'pink', 'red', 'blue', 'orange', 'purple'));
    
    -- Update any existing users to have the default theme
    UPDATE public.user_profiles 
    SET theme_color = 'emerald' 
    WHERE theme_color IS NULL;
    
    RAISE NOTICE 'Added theme_color column to user_profiles table';
  ELSE
    RAISE NOTICE 'theme_color column already exists in user_profiles table';
  END IF;
END $$;