-- SECURITY FIXES: Phase 2 - Fix remaining function search_path issues
-- Update all remaining functions with proper search_path settings

CREATE OR REPLACE FUNCTION public.activate_user_role(p_user_id uuid, p_new_role user_role, p_activated_by uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desactivar todos los roles del usuario
  UPDATE user_roles 
  SET is_active = false 
  WHERE user_id = p_user_id;
  
  -- Activar el nuevo rol (crear si no existe)
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
$$;

CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'No autorizado para cambiar role o is_active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;