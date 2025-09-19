-- CRITICAL SECURITY FIXES: Phase 1 (Fixed)
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

-- Fix 3: Remove role duplication (consolidate to user_roles table only)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Fix 4: Create function to safely get user's location access
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

GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(uuid) TO authenticated;