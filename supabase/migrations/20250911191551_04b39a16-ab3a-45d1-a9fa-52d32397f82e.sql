-- Fix user_profiles policies - remove problematic recursive policies
-- These policies cause infinite recursion by checking the same table they protect

-- Drop all problematic policies that reference user_profiles.role directly
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.user_profiles; 
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.user_profiles;

-- Keep the existing "Only admins can view user profiles" policy as it uses has_role() correctly

-- Create new non-recursive policies using the secure has_role function
CREATE POLICY "Admins can manage user profiles - insert" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage user profiles - update" 
ON public.user_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage user profiles - delete" 
ON public.user_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));