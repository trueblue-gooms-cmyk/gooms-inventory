-- Apply only missing critical security fixes

-- 1. Attach prevent_role_change trigger to profiles table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_role_change_trigger'
  ) THEN
    CREATE TRIGGER prevent_role_change_trigger
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_role_change();
  END IF;
END $$;

-- 2. Add unique constraint to user_roles to prevent duplicate assignments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_role'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);
  END IF;
END $$;

-- 3. Attach audit triggers to critical tables (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_profiles_trigger'
  ) THEN
    CREATE TRIGGER audit_profiles_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_suppliers_trigger'
  ) THEN
    CREATE TRIGGER audit_suppliers_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_purchase_orders_trigger'
  ) THEN
    CREATE TRIGGER audit_purchase_orders_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'audit_app_settings_trigger'
  ) THEN
    CREATE TRIGGER audit_app_settings_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.audit_trigger_function();
  END IF;
END $$;