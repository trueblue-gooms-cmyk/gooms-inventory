-- Complete the security fixes migration (part 2)
-- This addresses the remaining issues since the previous migration partially failed

-- Skip the already-created trigger
-- CREATE TRIGGER update_profiles_updated_at (already exists)

-- Continue with remaining security fixes that weren't applied

-- Remove the overly permissive policy on inventory_current that allows all users to view
DROP POLICY IF EXISTS "All authenticated users can view" ON public.inventory_current;

-- Add the security audit view with proper RLS
DROP VIEW IF EXISTS public.security_audit_summary CASCADE;

CREATE VIEW public.security_audit_summary AS
SELECT 
  table_name,
  action,
  COUNT(*) as action_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_action
FROM public.audit_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY table_name, action
ORDER BY last_action DESC;

-- Enable RLS on the security audit view
ALTER VIEW public.security_audit_summary SET ROW LEVEL SECURITY;

-- Create RLS policy for the security audit view
CREATE POLICY "Only admins can view security audit"
ON public.security_audit_summary
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure the view is accessible to authenticated users
GRANT SELECT ON public.security_audit_summary TO authenticated;