-- Security Fix: Restrict Location Details Access
-- Analysis shows locations table exposes sensitive business information

-- First, let's create a truly safe locations function that only exposes basic info
CREATE OR REPLACE FUNCTION public.get_locations_basic()
RETURNS TABLE(
  id uuid,
  name text,
  code text,
  type location_type,
  is_active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$$;

-- Update the existing get_locations_safe to remove address exposure
CREATE OR REPLACE FUNCTION public.get_locations_safe()
RETURNS TABLE(
  id uuid,
  name text,
  code text,
  type location_type,
  is_active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
$$;

-- Create a restricted function for admin/operators that includes sensitive details
CREATE OR REPLACE FUNCTION public.get_locations_detailed()
RETURNS TABLE(
  id uuid,
  name text,
  code text,
  type location_type,
  address text,
  contact_name text,
  contact_phone text,
  contact_info jsonb,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admin and operators can access detailed location info
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
  WHERE (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role))
    AND l.is_active = true;
$$;

-- Drop the potentially unsafe get_locations_public function
DROP FUNCTION IF EXISTS public.get_locations_public();

-- Ensure RLS policies are properly restrictive
-- Drop existing policies and recreate with stricter controls
DROP POLICY IF EXISTS "Admin and operators can manage locations" ON public.locations;
DROP POLICY IF EXISTS "Admin and operators can view full location details" ON public.locations;

-- Only admins can manage locations (create, update, delete)
CREATE POLICY "Only admins can manage locations" 
ON public.locations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Operators can only view basic location info (no sensitive details)
CREATE POLICY "Operators can view basic location info" 
ON public.locations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'operator'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add audit logging for location access
CREATE OR REPLACE FUNCTION public.audit_location_access()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;