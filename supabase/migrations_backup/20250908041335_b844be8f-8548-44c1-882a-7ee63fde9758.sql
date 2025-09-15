-- Security Fix 1: Attach missing triggers to enforce database protections

-- 1. Attach handle_new_user trigger to auth.users for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Attach prevent_role_change trigger to profiles to prevent privilege escalation
DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- 3. Attach update_updated_at triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS trg_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_products_updated_at ON public.products;
CREATE TRIGGER trg_update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_raw_materials_updated_at ON public.raw_materials;
CREATE TRIGGER trg_update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_packaging_materials_updated_at ON public.packaging_materials;
CREATE TRIGGER trg_update_packaging_materials_updated_at
  BEFORE UPDATE ON public.packaging_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Attach audit triggers to critical tables
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_suppliers ON public.suppliers;
CREATE TRIGGER trg_audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_purchase_orders ON public.purchase_orders;
CREATE TRIGGER trg_audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_purchase_order_items ON public.purchase_order_items;
CREATE TRIGGER trg_audit_purchase_order_items
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_sales_data ON public.sales_data;
CREATE TRIGGER trg_audit_sales_data
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_production_batches ON public.production_batches;
CREATE TRIGGER trg_audit_production_batches
  AFTER INSERT OR UPDATE OR DELETE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_inventory_movements ON public.inventory_movements;
CREATE TRIGGER trg_audit_inventory_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS trg_audit_app_settings ON public.app_settings;
CREATE TRIGGER trg_audit_app_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Security Fix 2: Add unique constraint to user_roles to prevent duplicate role assignments
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);