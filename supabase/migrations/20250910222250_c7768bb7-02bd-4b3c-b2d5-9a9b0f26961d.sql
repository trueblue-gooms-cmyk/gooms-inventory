-- Security Hardening Migration Part 2: Audit Triggers & Role Protection

-- 1. Wire up the prevent_role_change trigger to the profiles table
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 2. Add audit triggers to critical tables that are missing them
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

-- Add audit trigger to locations table
CREATE TRIGGER audit_locations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to suppliers table
CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to inventory_movements table
CREATE TRIGGER audit_inventory_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- Add audit trigger to inventory_current table
CREATE TRIGGER audit_inventory_current_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_current
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

-- Add audit trigger to app_settings table
CREATE TRIGGER audit_app_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- 3. Add updated_at triggers to tables that are missing them
-- Add to profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to user_roles table (first add updated_at column)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to suppliers table
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to locations table (first add updated_at column)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to inventory_movements table (first add updated_at column)
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_inventory_movements_updated_at
  BEFORE UPDATE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to production_batches table (first add updated_at column)
ALTER TABLE public.production_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_production_batches_updated_at
  BEFORE UPDATE ON public.production_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add to purchase_orders table (first add updated_at column)
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();