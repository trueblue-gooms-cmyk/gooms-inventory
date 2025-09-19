-- CRITICAL SECURITY FIXES: Phase 1
-- Fix 1: Enable RLS on customers table (CRITICAL)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create secure policies for customers table
CREATE POLICY "Only admins can manage customers" 
ON public.customers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators can view customers" 
ON public.customers 
FOR SELECT 
USING (has_role(auth.uid(), 'operator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Secure function search_path issues (HIGH)
-- Update functions with proper search_path settings

CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, operation text, record_id uuid DEFAULT NULL::uuid)
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

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, severity text, description text, metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_users RECORD;
BEGIN
  -- Log the security event
  INSERT INTO audit_logs (
    table_name,
    action,
    user_id,
    new_data,
    created_at
  ) VALUES (
    'security_events',
    event_type,
    auth.uid(),
    jsonb_build_object(
      'severity', severity,
      'description', description,
      'metadata', metadata,
      'timestamp', NOW(),
      'ip_address', inet_client_addr()
    ),
    NOW()
  );

  -- Send notifications to all admin users if high severity
  IF severity IN ('critical', 'high') THEN
    FOR admin_users IN
      SELECT DISTINCT ur.user_id, p.email 
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.role = 'admin' AND ur.is_active = true
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        priority,
        created_at
      ) VALUES (
        admin_users.user_id,
        'security_alert',
        CONCAT('Security Alert: ', event_type),
        description,
        'high',
        NOW()
      );
    END LOOP;
  END IF;
END;
$$;

-- Fix 3: Strengthen profile access control (HIGH)
-- Remove overly permissive profile policies and create stricter ones
DROP POLICY IF EXISTS "Users can update own profile basic info" ON public.profiles;

CREATE POLICY "Users can update own basic profile info only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from updating sensitive fields
  (OLD.role IS NOT DISTINCT FROM NEW.role) AND
  (OLD.is_active IS NOT DISTINCT FROM NEW.is_active) AND
  (OLD.created_by IS NOT DISTINCT FROM NEW.created_by)
);

-- Fix 4: Remove role duplication (consolidate to user_roles table only)
-- Remove role column from profiles table to prevent confusion
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Fix 5: Create function to safely get user's location access
CREATE OR REPLACE FUNCTION public.get_user_accessible_locations(p_user_id uuid)
RETURNS TABLE(id uuid, name text, code text, type location_type)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can see all locations
  IF has_role(p_user_id, 'admin'::app_role) THEN
    RETURN QUERY
    SELECT l.id, l.name, l.code, l.type
    FROM locations l
    WHERE l.is_active = true;
  -- Operators can see basic location info
  ELSIF has_role(p_user_id, 'operator'::app_role) THEN
    RETURN QUERY
    SELECT l.id, l.name, l.code, l.type
    FROM locations l
    WHERE l.is_active = true;
  -- Regular users get no location access
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(uuid) TO authenticated;