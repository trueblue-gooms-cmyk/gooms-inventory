-- Fix Security Definer View issues by replacing views with functions
-- Drop existing problematic views that may be causing security warnings
DROP VIEW IF EXISTS public.products_basic CASCADE;
DROP VIEW IF EXISTS public.raw_materials_basic CASCADE; 
DROP VIEW IF EXISTS public.raw_materials_public CASCADE;

-- These functions we already created are the secure replacements:
-- get_products_safe() - replaces products_basic view
-- get_raw_materials_safe() - replaces raw_materials_basic/public views

-- Create additional security function for location access
CREATE OR REPLACE FUNCTION public.get_locations_safe()
RETURNS TABLE (
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

-- Grant execute to all authenticated users for basic location data
GRANT EXECUTE ON FUNCTION public.get_locations_safe() TO authenticated;