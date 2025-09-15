-- CRITICAL SECURITY FIX: Remove dangerous user profile exposure
-- Drop the policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

-- Create secure policies for user_profiles table
-- Users can only view their own profile
CREATE POLICY "Users can view own profile only" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Only admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- SECURITY FIX: Restrict location contact information access
-- Create function for basic location info (no sensitive contact details)
CREATE OR REPLACE FUNCTION public.get_locations_basic_secure()
RETURNS TABLE(id uuid, name text, code text, type location_type, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$$;

-- Update existing basic locations function to be more restrictive
CREATE OR REPLACE FUNCTION public.get_locations_safe()
RETURNS TABLE(id uuid, name text, code text, type location_type, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$$;

-- SECURITY HARDENING: Add search_path protection to existing functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role::text INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid()
    ORDER BY 
      CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'operator' THEN 2  
        WHEN 'user' THEN 3
        ELSE 4
      END
    LIMIT 1;
    
    IF user_role IS NULL THEN
        user_role := 'user';
    END IF;
    
    RETURN user_role;
END;
$$;

-- SECURITY HARDENING: Update has_role function with search_path protection
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$$;

-- SECURITY MONITORING: Create function to log admin access to sensitive data
CREATE OR REPLACE FUNCTION public.log_admin_access(operation_type text, table_accessed text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if user is admin performing sensitive operations
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO audit_logs (
      table_name,
      action,
      user_id,
      new_data,
      created_at
    ) VALUES (
      table_accessed,
      CONCAT('ADMIN_ACCESS_', operation_type),
      auth.uid(),
      jsonb_build_object(
        'operation', operation_type,
        'timestamp', NOW(),
        'ip_address', inet_client_addr()
      ),
      NOW()
    );
  END IF;
END;
$$;

-- Add comments for security documentation
COMMENT ON POLICY "Users can view own profile only" ON public.user_profiles IS 
'SECURITY: Users can only access their own profile data to prevent data leakage';

COMMENT ON POLICY "Admins can view all profiles" ON public.user_profiles IS 
'SECURITY: Only admin users can view all profiles for user management purposes';

COMMENT ON FUNCTION public.get_locations_safe() IS 
'SECURITY: Returns only basic location information without sensitive contact details';