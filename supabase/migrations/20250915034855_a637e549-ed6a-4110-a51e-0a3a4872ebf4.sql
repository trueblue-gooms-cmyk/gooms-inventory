-- Clean up duplicate and conflicting RLS policies on user_profiles table

-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can view user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles - update" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles - delete" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles - insert" ON public.user_profiles;

-- Create clean, non-conflicting policies using has_role function
CREATE POLICY "users_can_view_own_profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "admins_can_view_all_profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_insert_profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_update_profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_can_delete_profiles" 
ON public.user_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));