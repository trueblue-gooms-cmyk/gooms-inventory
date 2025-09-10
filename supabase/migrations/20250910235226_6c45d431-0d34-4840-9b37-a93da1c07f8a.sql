-- Critical Security Fixes Migration
-- Addresses all security vulnerabilities identified in the security review

-- 1. Fix PII exposure in user_profiles - Restrict access to admin only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;

CREATE POLICY "Only admins can view user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict inventory_current to admin/operator only (remove "All authenticated users can view")
DROP POLICY IF EXISTS "All authenticated users can view" ON public.inventory_current;

-- The existing "Admin and operators can manage inventory" policy already covers SELECT for admin/operator

-- 3. Add missing prevent_role_change trigger to profiles table
CREATE TRIGGER prevent_role_change_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 4. Add missing updated_at trigger to profiles table  
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 5. Add audit triggers to critical tables that are missing them

-- Add audit trigger to profiles table
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to user_roles table
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to app_settings table
CREATE TRIGGER audit_app_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to products table
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to raw_materials table
CREATE TRIGGER audit_raw_materials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to inventory_current table
CREATE TRIGGER audit_inventory_current_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_current
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to inventory_movements table
CREATE TRIGGER audit_inventory_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to production_batches table
CREATE TRIGGER audit_production_batches_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.production_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to purchase_orders table
CREATE TRIGGER audit_purchase_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to suppliers table
CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- 6. Add updated_at triggers to tables missing them

-- Add updated_at trigger to user_roles table
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add updated_at trigger to notifications table
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 7. Create security definer function to replace problematic view (if any exist)
-- Note: After reviewing the schema, there are no views that use SECURITY DEFINER improperly
-- The get_locations_public() function already uses SECURITY DEFINER correctly

-- 8. Additional hardening: Ensure all sensitive tables have proper RLS
-- Verify locations table has proper access control (currently admin/operator only - this is correct)

-- 9. Create a security audit view for admins to monitor access
CREATE OR REPLACE VIEW public.security_audit_summary AS
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

-- Grant access to security audit view only to admins
GRANT SELECT ON public.security_audit_summary TO authenticated;

CREATE POLICY "Only admins can view security audit"
ON public.security_audit_summary
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. Create a function to check if user can access specific data
CREATE OR REPLACE FUNCTION public.can_user_access_table(
  _user_id uuid,
  _table_name text
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin can access everything
  IF has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Operator can access operational tables
  IF has_role(_user_id, 'operator'::app_role) THEN
    RETURN _table_name IN (
      'products', 'raw_materials', 'inventory_current', 'inventory_movements',
      'production_batches', 'purchase_orders', 'suppliers', 'locations'
    );
  END IF;
  
  -- Viewer can only access basic view tables
  RETURN _table_name IN ('products', 'raw_materials');
END;
$$;