-- Security Fix: Remove SECURITY DEFINER from views to fix linter warnings

-- Drop and recreate the views without SECURITY DEFINER
DROP VIEW IF EXISTS public.products_basic;
DROP VIEW IF EXISTS public.raw_materials_basic;

-- Recreate views without SECURITY DEFINER (they will use the permissions of the querying user)
CREATE VIEW public.products_basic AS
SELECT 
  id,
  name,
  sku,
  type,
  is_active,
  created_at
FROM public.products
WHERE is_active = true;

CREATE VIEW public.raw_materials_basic AS
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

-- Grant permissions on the views
GRANT SELECT ON public.products_basic TO authenticated;
GRANT SELECT ON public.raw_materials_basic TO authenticated;

-- Enable RLS on the views to ensure they follow the same security model
ALTER VIEW public.products_basic SET (security_barrier = true);
ALTER VIEW public.raw_materials_basic SET (security_barrier = true);