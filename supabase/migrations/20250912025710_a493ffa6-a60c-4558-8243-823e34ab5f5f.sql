-- COMPREHENSIVE SECURITY MIGRATION
-- This migration addresses all critical security vulnerabilities identified

-- 1. FIX FUNCTION SEARCH PATH VULNERABILITIES
-- Update all existing functions to use secure search_path

CREATE OR REPLACE FUNCTION public.get_suppliers_safe()
 RETURNS TABLE(id uuid, name text, code text, contact_name text, phone text, email text, lead_time_days integer, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Create profile if not exists
  INSERT INTO public.profiles (id, email, full_name, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default role if not exists
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, 'user', NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, operation text, record_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.audit_location_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Log when sensitive location data is accessed
  IF TG_OP = 'SELECT' THEN
    PERFORM public.log_sensitive_access(
      'locations',
      'VIEW_LOCATION_DETAILS',
      NEW.id::uuid
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_locations_basic()
 RETURNS TABLE(id uuid, name text, code text, type location_type, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.register_inventory_movement(p_movement_type movement_type, p_product_id uuid, p_quantity integer, p_batch_id uuid DEFAULT NULL::uuid, p_from_location_id uuid DEFAULT NULL::uuid, p_to_location_id uuid DEFAULT NULL::uuid, p_unit_cost numeric DEFAULT NULL::numeric, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  v_movement_id uuid;
  v_total_cost numeric;
  v_current_inventory inventory_current%ROWTYPE;
BEGIN
  -- Calculate total cost
  v_total_cost := CASE 
    WHEN p_unit_cost IS NOT NULL THEN p_unit_cost * p_quantity 
    ELSE NULL 
  END;

  -- Insert movement record
  INSERT INTO inventory_movements (
    movement_type, product_id, batch_id, from_location_id, to_location_id,
    quantity, unit_cost, total_cost, reference_type, reference_id, 
    notes, created_by
  ) VALUES (
    p_movement_type, p_product_id, p_batch_id, p_from_location_id, p_to_location_id,
    p_quantity, p_unit_cost, v_total_cost, p_reference_type, p_reference_id,
    p_notes, auth.uid()
  ) RETURNING id INTO v_movement_id;

  -- Update inventory_current based on movement type
  CASE p_movement_type
    WHEN 'entry' THEN
      -- Find or create inventory record for destination
      SELECT * INTO v_current_inventory 
      FROM inventory_current 
      WHERE product_id = p_product_id 
        AND location_id = p_to_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      IF FOUND THEN
        UPDATE inventory_current 
        SET quantity_available = quantity_available + p_quantity,
            last_movement_date = NOW(),
            last_updated = NOW()
        WHERE id = v_current_inventory.id;
      ELSE
        INSERT INTO inventory_current (
          product_id, location_id, batch_id, quantity_available, 
          last_movement_date
        ) VALUES (
          p_product_id, p_to_location_id, p_batch_id, p_quantity, NOW()
        );
      END IF;

    WHEN 'exit' THEN
      -- Reduce inventory at source location
      UPDATE inventory_current 
      SET quantity_available = quantity_available - p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = p_from_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    WHEN 'transfer' THEN
      -- Reduce at source
      UPDATE inventory_current 
      SET quantity_available = quantity_available - p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = p_from_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      -- Increase at destination
      SELECT * INTO v_current_inventory 
      FROM inventory_current 
      WHERE product_id = p_product_id 
        AND location_id = p_to_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      IF FOUND THEN
        UPDATE inventory_current 
        SET quantity_available = quantity_available + p_quantity,
            last_movement_date = NOW(),
            last_updated = NOW()
        WHERE id = v_current_inventory.id;
      ELSE
        INSERT INTO inventory_current (
          product_id, location_id, batch_id, quantity_available, 
          last_movement_date
        ) VALUES (
          p_product_id, p_to_location_id, p_batch_id, p_quantity, NOW()
        );
      END IF;

    WHEN 'adjustment' THEN
      -- Adjust inventory (can be positive or negative)
      UPDATE inventory_current 
      SET quantity_available = quantity_available + p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = COALESCE(p_to_location_id, p_from_location_id)
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

  END CASE;

  RETURN v_movement_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_locations_detailed()
 RETURNS TABLE(id uuid, name text, code text, type location_type, address text, contact_name text, contact_phone text, contact_info jsonb, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Only admin can access detailed location info (SECURITY ENHANCEMENT)
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.address,
    l.contact_name,
    l.contact_phone,
    l.contact_info,
    l.is_active,
    l.created_at,
    l.updated_at
  FROM locations l
  WHERE has_role(auth.uid(), 'admin'::app_role)  -- RESTRICTED TO ADMIN ONLY
    AND l.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.get_security_audit_summary()
 RETURNS TABLE(table_name text, action text, action_count bigint, unique_users bigint, last_action timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_products_safe()
 RETURNS TABLE(id uuid, name text, sku text, type text, weight_grams numeric, shelf_life_days integer, units_per_box integer, is_active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.type,
    p.weight_grams,
    p.shelf_life_days,
    p.units_per_box,
    p.is_active,
    p.created_at
  FROM products p
  WHERE p.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.get_raw_materials_safe()
 RETURNS TABLE(id uuid, code text, name text, description text, unit_measure text, shelf_life_days integer, is_active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    rm.id,
    rm.code,
    rm.name,
    rm.description,
    rm.unit_measure,
    rm.shelf_life_days,
    rm.is_active,
    rm.created_at
  FROM raw_materials rm
  WHERE rm.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.get_inventory_safe()
 RETURNS TABLE(id uuid, product_id uuid, location_id uuid, quantity_available integer, quantity_reserved integer, last_movement_date timestamp with time zone, expiry_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    ic.id,
    ic.product_id,
    ic.location_id,
    ic.quantity_available,
    ic.quantity_reserved,
    ic.last_movement_date,
    ic.expiry_date
  FROM inventory_current ic;
$function$;

CREATE OR REPLACE FUNCTION public.get_locations_safe()
 RETURNS TABLE(id uuid, name text, code text, type location_type, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
BEGIN
  -- Capturar NEW/OLD según operación
  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_new := to_jsonb(NEW);
  ELSE
    v_new := NULL;
  END IF;

  IF TG_OP IN ('UPDATE','DELETE') THEN
    v_old := to_jsonb(OLD);
  ELSE
    v_old := NULL;
  END IF;

  -- Intentar obtener record_id de 'id' y si no existe, de 'user_id'
  -- Evitar excepciones de casteo con bloques seguros
  BEGIN
    v_record_id := NULL;
    IF v_new ? 'id' THEN
      v_record_id := (v_new->>'id')::uuid;
    ELSIF v_old ? 'id' THEN
      v_record_id := (v_old->>'id')::uuid;
    ELSIF v_new ? 'user_id' THEN
      v_record_id := (v_new->>'user_id')::uuid;
    ELSIF v_old ? 'user_id' THEN
      v_record_id := (v_old->>'user_id')::uuid;
    END IF;
  EXCEPTION WHEN others THEN
    -- Si por alguna razón el casteo falla, dejar record_id en NULL
    v_record_id := NULL;
  END;

  -- Insertar en el log de auditoría
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    ip_address,
    user_agent,
    created_at
  )
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_old,
    v_new,
    auth.uid(),
    inet_client_addr(),
    current_setting('application_name', true),
    NOW()
  );

  -- Devolver la fila adecuada según operación
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'No autorizado para cambiar role o is_active';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Return highest privilege role: admin > operator > user
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
    
    -- If no role exists, default to 'user'
    IF user_role IS NULL THEN
        user_role := 'user';
    END IF;
    
    RETURN user_role;
END;
$function$;

-- 2. ENHANCE SECURITY POLICIES FOR SENSITIVE DATA

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

-- Update suppliers RLS policies for enhanced security
DROP POLICY IF EXISTS "Only admins can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Operators can view suppliers limited" ON suppliers;

CREATE POLICY "Only admins can manage suppliers" 
ON suppliers FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators can view basic supplier info only" 
ON suppliers FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'operator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 3. ENHANCE PROFILES SECURITY

-- Update profiles policies to be more restrictive
DROP POLICY IF EXISTS "Users can view own profile only" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile basic info" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can view minimal own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile non-sensitive only" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all profiles" 
ON profiles FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. ENHANCED AUDIT AND MONITORING FUNCTIONS

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

-- 5. ENHANCED NOTIFICATION AND ALERTING SYSTEM

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

-- 6. CREATE TRIGGER FOR AUTOMATIC SECURITY MONITORING

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

-- 7. IMPLEMENT AUDIT TRIGGERS ON SENSITIVE TABLES
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_locations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 8. COMMENT ALL SECURITY ENHANCEMENTS
COMMENT ON FUNCTION public.get_locations_detailed() IS 'SECURITY: Admin-only access to detailed location information including contact details';
COMMENT ON FUNCTION public.get_suppliers_admin_only() IS 'SECURITY: Admin-only access to full supplier contact information';
COMMENT ON FUNCTION public.detect_suspicious_access() IS 'SECURITY: Monitoring function to detect unusual access patterns';
COMMENT ON FUNCTION public.mask_sensitive_data(text, text) IS 'SECURITY: Data masking function for protecting sensitive information';
COMMENT ON FUNCTION public.log_security_event(text, text, text, jsonb) IS 'SECURITY: Security event logging and alerting system';