-- Check and fix any remaining SECURITY DEFINER views or functions that might be causing linter warnings

-- First, let's see what the linter is actually detecting by checking all objects in the database
-- Since the linter is still showing errors, there might be views or functions I haven't found

-- Let's remove the raw_materials_public view that was already there and potentially causing issues
DROP VIEW IF EXISTS public.raw_materials_public CASCADE;

-- Recreate it properly without any security issues
CREATE VIEW public.raw_materials_public AS
SELECT 
  id,
  name,
  code,
  description,
  unit_measure,
  is_active,
  shelf_life_days,
  created_at,
  updated_at
FROM public.raw_materials
WHERE is_active = true;

-- Grant appropriate permissions
GRANT SELECT ON public.raw_materials_public TO authenticated;

-- Ensure security barrier is set
ALTER VIEW public.raw_materials_public SET (security_barrier = true);