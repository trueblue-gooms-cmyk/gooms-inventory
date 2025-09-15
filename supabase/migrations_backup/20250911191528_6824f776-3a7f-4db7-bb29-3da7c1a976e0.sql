-- Fix: Handle existing policies for user_profiles table
-- Drop existing policies first to avoid conflicts

-- Drop all existing policies for user_profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;

-- Now recreate the policies with proper security
-- Only admins can view user profiles (contains sensitive role/location data)
CREATE POLICY "Only admins can view user profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update profiles
CREATE POLICY "Only admins can update profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert profiles
CREATE POLICY "Only admins can insert profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;