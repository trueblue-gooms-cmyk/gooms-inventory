-- SECURITY MIGRATION - PART 2 (Excluding existing triggers)
-- Fix the remaining security issues without duplicate triggers

-- 1. CREATE MISSING SECURITY FUNCTIONS (avoiding existing triggers)

-- Create secure supplier access function (ADMIN ONLY for sensitive data)
CREATE OR REPLACE FUNCTION public.get_suppliers_admin_only()
 RETURNS TABLE(
   id uuid, name text, code text, contact_name text, 
   phone text, email text, address text, payment_terms text,
   lead_time_days integer, min_order_value numeric, is_active boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- SECURITY: Only admins can access full supplier contact details
  SELECT 
    s.id, s.name, s.code, s.contact_name,
    s.phone, s.email, s.address, s.payment_terms,
    s.lead_time_days, s.min_order_value, s.is_active
  FROM suppliers s
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND s.is_active = true;
$function$;

-- 2. ENHANCED AUDIT AND MONITORING FUNCTIONS

-- Create function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_access()
 RETURNS TABLE(
   user_id uuid, 
   suspicious_activity text,
   activity_count bigint,
   first_occurrence timestamp with time zone,
   last_occurrence timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can access security monitoring
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH suspicious_patterns AS (
    SELECT 
      al.user_id,
      al.table_name,
      al.action,
      COUNT(*) as activity_count,
      MIN(al.created_at) as first_occurrence,
      MAX(al.created_at) as last_occurrence
    FROM audit_logs al
    WHERE al.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY al.user_id, al.table_name, al.action
    HAVING COUNT(*) > 100  -- Threshold for suspicious activity
  )
  SELECT 
    sp.user_id,
    CONCAT('High frequency access to ', sp.table_name, ' (', sp.action, ')') as suspicious_activity,
    sp.activity_count,
    sp.first_occurrence,
    sp.last_occurrence
  FROM suspicious_patterns sp
  ORDER BY sp.activity_count DESC;
END;
$function$;

-- Create function for secure data masking
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data_type text, original_value text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  CASE data_type
    WHEN 'email' THEN
      -- Mask email: example@domain.com -> ex****@domain.com
      RETURN CONCAT(
        LEFT(original_value, 2),
        '****',
        RIGHT(original_value, LENGTH(original_value) - POSITION('@' IN original_value) + 1)
      );
    WHEN 'phone' THEN
      -- Mask phone: keep first 3 and last 2 digits
      RETURN CONCAT(
        LEFT(original_value, 3),
        REPEAT('*', LENGTH(original_value) - 5),
        RIGHT(original_value, 2)
      );
    WHEN 'address' THEN
      -- Mask address: show only city/country
      RETURN CONCAT('*** ', SPLIT_PART(original_value, ',', -1));
    ELSE
      RETURN '***MASKED***';
  END CASE;
END;
$function$;

-- 3. ENHANCED NOTIFICATION AND ALERTING SYSTEM

-- Create function to send security alerts
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
      WHERE ur.role = 'admin'
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
$function$;

-- 4. CREATE TRIGGER FOR AUTOMATIC SECURITY MONITORING

-- Create trigger to monitor failed authentication attempts
CREATE OR REPLACE FUNCTION public.monitor_auth_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Monitor suspicious authentication patterns
  IF NEW.action LIKE '%SIGN_IN%' AND NEW.new_data->>'error' IS NOT NULL THEN
    PERFORM log_security_event(
      'failed_authentication',
      'medium',
      CONCAT('Failed authentication attempt for user: ', COALESCE(NEW.user_id::text, 'unknown')),
      jsonb_build_object(
        'error', NEW.new_data->>'error',
        'ip_address', NEW.ip_address,
        'user_agent', NEW.user_agent
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. ADD SECURITY COMMENTS
COMMENT ON FUNCTION public.get_locations_detailed() IS 'SECURITY: Admin-only access to detailed location information including contact details';
COMMENT ON FUNCTION public.get_suppliers_admin_only() IS 'SECURITY: Admin-only access to full supplier contact information';
COMMENT ON FUNCTION public.detect_suspicious_access() IS 'SECURITY: Monitoring function to detect unusual access patterns';
COMMENT ON FUNCTION public.mask_sensitive_data(text, text) IS 'SECURITY: Data masking function for protecting sensitive information';
COMMENT ON FUNCTION public.log_security_event(text, text, text, jsonb) IS 'SECURITY: Security event logging and alerting system';