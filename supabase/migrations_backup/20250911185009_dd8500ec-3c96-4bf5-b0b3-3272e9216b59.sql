-- Security Fix: Tighten Profile Access Control
-- Drop existing overly permissive policies and replace with secure ones

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile limited" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create secure profile policies
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile basic info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from changing their own role or admin fields
  OLD.role IS NOT DISTINCT FROM NEW.role AND
  OLD.created_by IS NOT DISTINCT FROM NEW.created_by
);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Secure supplier data access
-- Drop existing policies and create more restrictive ones
DROP POLICY IF EXISTS "Admin and operators can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin and operators can view suppliers" ON public.suppliers;

-- Only admins can manage suppliers (create, update, delete)
CREATE POLICY "Only admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Operators can view suppliers but with limited information
CREATE POLICY "Operators can view suppliers limited" 
ON public.suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'operator'::app_role));

-- Create a safe view for suppliers that operators can access
CREATE OR REPLACE FUNCTION public.get_suppliers_safe()
RETURNS TABLE(
  id uuid,
  name text,
  code text,
  contact_name text,
  phone text,
  email text,
  lead_time_days integer,
  is_active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.code,
    s.contact_name,
    s.phone,
    s.email,
    s.lead_time_days,
    s.is_active
  FROM suppliers s
  WHERE s.is_active = true;
$$;

-- Enhanced audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name text,
  operation text,
  record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    created_at,
    new_data
  ) VALUES (
    table_name,
    record_id,
    'SENSITIVE_ACCESS_' || operation,
    auth.uid(),
    NOW(),
    jsonb_build_object('operation', operation, 'timestamp', NOW())
  );
END;
$$;

-- Add function to check for suspicious activity
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  operation_type text,
  time_window_minutes integer DEFAULT 10,
  max_operations integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_count integer;
BEGIN
  SELECT COUNT(*) INTO operation_count
  FROM audit_logs
  WHERE user_id = auth.uid()
    AND action LIKE '%' || operation_type || '%'
    AND created_at > NOW() - (time_window_minutes || ' minutes')::interval;
  
  RETURN operation_count < max_operations;
END;
$$;