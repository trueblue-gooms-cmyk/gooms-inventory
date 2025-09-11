-- Comprehensive Security Fixes Migration (Fixed)
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

-- Fix 2: Create secure functions for general users (without sensitive data)
CREATE OR REPLACE FUNCTION public.get_products_safe()
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  type text,
  weight_grams numeric,
  shelf_life_days integer,
  units_per_box integer,
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
    p.weight_grams,
    p.shelf_life_days,
    p.units_per_box,
    p.is_active,
    p.created_at
  FROM products p
  WHERE p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_raw_materials_safe()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  description text,
  unit_measure text,
  shelf_life_days integer,
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
    rm.shelf_life_days,
    rm.is_active,
    rm.created_at
  FROM raw_materials rm
  WHERE rm.is_active = true;
$$;

-- Grant execute to all authenticated users for safe data access
GRANT EXECUTE ON FUNCTION public.get_products_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_raw_materials_safe() TO authenticated;

-- Fix 3: Secure supplier and cost data (only admin/operators can view)
DROP POLICY IF EXISTS "Admin and operators can view suppliers" ON public.suppliers;
CREATE POLICY "Admin and operators can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Fix 4: Ensure audit logs are properly secured
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;

-- Fix 5: Secure packaging materials (already has correct policy)
-- This is already correctly secured

-- Fix 6: Create a secure function for basic inventory info (without costs)
CREATE OR REPLACE FUNCTION public.get_inventory_safe()
RETURNS TABLE (
  id uuid,
  product_id uuid,
  location_id uuid,
  quantity_available integer,
  quantity_reserved integer,
  last_movement_date timestamp with time zone,
  expiry_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ic.id,
    ic.product_id,
    ic.location_id,
    ic.quantity_available,
    ic.quantity_reserved,
    ic.last_movement_date,
    ic.expiry_date
  FROM inventory_current ic;
$$;

-- Grant execute to all authenticated users for safe inventory data
GRANT EXECUTE ON FUNCTION public.get_inventory_safe() TO authenticated;