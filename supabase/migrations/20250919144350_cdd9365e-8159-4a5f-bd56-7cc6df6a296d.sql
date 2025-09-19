-- Fix role type mismatch for activate_user_role
BEGIN;

-- Drop old version with mismatched enum
DROP FUNCTION IF EXISTS public.activate_user_role(p_user_id uuid, p_new_role user_role, p_activated_by uuid);

-- Recreate with correct enum type app_role
CREATE OR REPLACE FUNCTION public.activate_user_role(
  p_user_id uuid,
  p_new_role app_role,
  p_activated_by uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Deactivate all roles for the user
  UPDATE user_roles 
  SET is_active = false 
  WHERE user_id = p_user_id;

  -- Activate the new role (create if not exists)
  INSERT INTO user_roles (user_id, role, is_active, activated_at, activated_by, created_at)
  VALUES (p_user_id, p_new_role, true, now(), p_activated_by, now())
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    is_active = true,
    activated_at = now(),
    activated_by = p_activated_by,
    updated_at = now();
    
  RETURN true;
END;
$function$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.activate_user_role(uuid, app_role, uuid) TO authenticated;

COMMIT;