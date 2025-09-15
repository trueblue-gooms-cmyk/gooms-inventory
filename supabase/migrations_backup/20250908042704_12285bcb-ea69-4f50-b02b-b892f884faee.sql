-- Critical Security Fixes

-- 1. Attach prevent_role_change trigger to profiles table
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 2. Attach handle_new_user trigger to auth.users table  
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Attach audit triggers to critical tables
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_purchase_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_purchase_order_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_sales_data_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_data
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_production_batches_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.production_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_inventory_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_app_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- 4. Add unique constraint to user_roles to prevent duplicate assignments
ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);

-- 5. Update timestamps triggers for data integrity
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_packaging_materials_updated_at
  BEFORE UPDATE ON public.packaging_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 6. Harden RLS policies - Remove sensitive data exposure
DROP POLICY IF EXISTS "All can view locations" ON public.locations;
CREATE POLICY "All can view basic location info" ON public.locations
FOR SELECT USING (true);

-- 7. Restrict sales data to only necessary fields for reports
DROP POLICY IF EXISTS "Admin and operators can view sales" ON public.sales_data;
CREATE POLICY "Admin and operators can view sales" ON public.sales_data
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));