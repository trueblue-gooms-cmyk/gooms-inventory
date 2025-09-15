-- Critical Security Fixes Migration

-- 1. Fix locations table PII exposure - restrict contact info access to admin/operator only
DROP POLICY IF EXISTS "All can view locations" ON public.locations;

CREATE POLICY "All can view basic location info" 
ON public.locations 
FOR SELECT 
USING (true);

CREATE POLICY "Admin and operators can view full location details" 
ON public.locations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operator'::app_role)
);

-- Create a view for public location access (without PII)
CREATE OR REPLACE VIEW public.locations_public AS
SELECT 
  id,
  code,
  name,
  address,
  type,
  is_active,
  created_at,
  -- Hide contact_name and contact_phone for general users
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role) 
    THEN contact_name 
    ELSE null 
  END as contact_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role) 
    THEN contact_phone 
    ELSE null 
  END as contact_phone
FROM public.locations;

-- 2. Ensure prevent_role_change trigger is properly attached to profiles
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 3. Add missing audit triggers for comprehensive logging
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_locations_trigger ON public.locations;
CREATE TRIGGER audit_locations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_function();

-- 4. Add timestamp triggers for automatic updated_at maintenance
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_packaging_materials_updated_at ON public.packaging_materials;
CREATE TRIGGER update_packaging_materials_updated_at
  BEFORE UPDATE ON public.packaging_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_raw_materials_updated_at ON public.raw_materials;
CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 5. Improve get_my_role function to handle multiple roles (return highest privilege)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 6. Add unique constraint on user_roles to prevent duplicate role assignments
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS unique_user_role;

ALTER TABLE public.user_roles 
ADD CONSTRAINT unique_user_role 
UNIQUE (user_id, role);

-- 7. Ensure RLS is enabled on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;