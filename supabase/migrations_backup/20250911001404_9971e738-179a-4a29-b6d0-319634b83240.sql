-- Comprehensive Security Fixes Migration
-- Fix 1: Restrict sensitive data access in base tables

-- Remove overly permissive policies that expose sensitive cost/supplier data
DROP POLICY IF EXISTS "All authenticated users can view" ON public.products;
DROP POLICY IF EXISTS "All authenticated users can view" ON public.raw_materials;

-- Create restrictive policies for sensitive base tables
CREATE POLICY "Admin and operators can view full product details"
ON public.products
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admin and operators can view full raw materials details"  
ON public.raw_materials
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Fix 2: Create safe public views for general users (without sensitive data)
CREATE OR REPLACE VIEW public.products_safe AS
SELECT 
  id,
  name,
  sku,
  type,
  weight_grams,
  shelf_life_days,
  units_per_box,
  is_active,
  created_at
FROM public.products
WHERE is_active = true;

CREATE OR REPLACE VIEW public.raw_materials_safe AS
SELECT 
  id,
  code,
  name,
  description,
  unit_measure,
  shelf_life_days,
  is_active,
  created_at
FROM public.raw_materials  
WHERE is_active = true;

-- Enable RLS on safe views (though they don't contain sensitive data)
-- These views can be accessed by all authenticated users
CREATE POLICY "All authenticated users can view safe product data"
ON public.products_safe
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can view safe raw materials data"
ON public.raw_materials_safe  
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Secure supplier and cost data
CREATE POLICY "Admin and operators can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Fix 4: Ensure audit logs are properly secured
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 5: Secure packaging materials
CREATE POLICY "Admin and operators can view packaging"
ON public.packaging_materials
FOR SELECT
TO authenticated  
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Fix 6: Create a secure function to get basic product info for general users
CREATE OR REPLACE FUNCTION public.get_products_basic()
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  type text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.type,
    p.is_active,
    p.created_at
  FROM products p
  WHERE p.is_active = true;
$$;

-- Grant execute to authenticated users for basic product info
GRANT EXECUTE ON FUNCTION public.get_products_basic() TO authenticated;

-- Fix 7: Create secure function for basic raw materials info
CREATE OR REPLACE FUNCTION public.get_raw_materials_basic()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  unit_measure text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rm.id,
    rm.code,
    rm.name,
    rm.description,
    rm.unit_measure,
    rm.is_active,
    rm.created_at
  FROM raw_materials rm
  WHERE rm.is_active = true;
$$;

-- Grant execute to authenticated users for basic raw materials info
GRANT EXECUTE ON FUNCTION public.get_raw_materials_basic() TO authenticated;