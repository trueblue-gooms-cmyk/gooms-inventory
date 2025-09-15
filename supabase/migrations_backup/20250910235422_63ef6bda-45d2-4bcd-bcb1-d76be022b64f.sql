-- Security fixes migration (part 3) - Fix the view approach
-- Since views don't support RLS directly, we'll use a function instead

-- Drop the problematic view
DROP VIEW IF EXISTS public.security_audit_summary CASCADE;

-- Create a security definer function instead that respects permissions
CREATE OR REPLACE FUNCTION public.get_security_audit_summary()
RETURNS TABLE (
  table_name text,
  action text,
  action_count bigint,
  unique_users bigint,
  last_action timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access this data
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    al.table_name,
    al.action,
    COUNT(*) as action_count,
    COUNT(DISTINCT al.user_id) as unique_users,
    MAX(al.created_at) as last_action
  FROM public.audit_logs al
  WHERE al.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY al.table_name, al.action
  ORDER BY MAX(al.created_at) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_security_audit_summary() TO authenticated;

-- Ensure all critical security fixes are properly applied
-- Verify user_profiles access is restricted
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

CREATE POLICY "Only admins can view user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Remove overly permissive inventory access
DROP POLICY IF EXISTS "All authenticated users can view" ON public.inventory_current;