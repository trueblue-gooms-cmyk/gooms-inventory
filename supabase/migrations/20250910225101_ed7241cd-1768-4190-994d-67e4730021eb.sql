-- Security Hardening Migration Part 3: Complete Missing Components

-- 1. Add audit triggers to remaining tables (skip ones that might already exist)
DO $$
BEGIN
  -- Only create triggers if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_user_roles_trigger') THEN
    CREATE TRIGGER audit_user_roles_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_products_trigger') THEN
    CREATE TRIGGER audit_products_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_raw_materials_trigger') THEN
    CREATE TRIGGER audit_raw_materials_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.raw_materials
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_locations_trigger') THEN
    CREATE TRIGGER audit_locations_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.locations
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_suppliers_trigger') THEN
    CREATE TRIGGER audit_suppliers_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_inventory_movements_trigger') THEN
    CREATE TRIGGER audit_inventory_movements_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_inventory_current_trigger') THEN
    CREATE TRIGGER audit_inventory_current_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.inventory_current
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;
END $$;

-- 2. Add missing updated_at columns and triggers
-- Add updated_at to user_roles if not exists
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to locations if not exists  
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to inventory_movements if not exists
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to production_batches if not exists
ALTER TABLE public.production_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to purchase_orders if not exists
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Add updated_at triggers conditionally
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_roles_updated_at') THEN
    CREATE TRIGGER update_user_roles_updated_at
      BEFORE UPDATE ON public.user_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_locations_updated_at') THEN
    CREATE TRIGGER update_locations_updated_at
      BEFORE UPDATE ON public.locations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_inventory_movements_updated_at') THEN
    CREATE TRIGGER update_inventory_movements_updated_at
      BEFORE UPDATE ON public.inventory_movements
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_production_batches_updated_at') THEN
    CREATE TRIGGER update_production_batches_updated_at
      BEFORE UPDATE ON public.production_batches
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_purchase_orders_updated_at') THEN
    CREATE TRIGGER update_purchase_orders_updated_at
      BEFORE UPDATE ON public.purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- 4. Create secure views for products and raw_materials to limit data exposure for regular users
CREATE OR REPLACE VIEW public.products_basic AS
SELECT 
  id,
  name,
  sku,
  type,
  is_active,
  created_at
FROM public.products
WHERE is_active = true;

CREATE OR REPLACE VIEW public.raw_materials_basic AS
SELECT 
  id,
  name,
  code,
  description,
  unit_measure,
  is_active,
  created_at
FROM public.raw_materials
WHERE is_active = true;

-- 5. Grant appropriate permissions on these views
GRANT SELECT ON public.products_basic TO authenticated;
GRANT SELECT ON public.raw_materials_basic TO authenticated;

-- 6. Comment on the raw_materials_public view security
COMMENT ON VIEW public.raw_materials_public IS 'Public view of raw materials - consider access restrictions based on business requirements';