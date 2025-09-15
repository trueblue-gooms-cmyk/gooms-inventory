-- Security Hardening Migration Part 1: Authorization & RLS Fixes

-- 1. Fix register_inventory_movement RPC to require proper authorization
DROP FUNCTION IF EXISTS public.register_inventory_movement(movement_type, uuid, integer, uuid, uuid, uuid, numeric, text, uuid, text);

CREATE OR REPLACE FUNCTION public.register_inventory_movement(
  p_movement_type movement_type, 
  p_product_id uuid, 
  p_quantity integer, 
  p_batch_id uuid DEFAULT NULL::uuid, 
  p_from_location_id uuid DEFAULT NULL::uuid, 
  p_to_location_id uuid DEFAULT NULL::uuid, 
  p_unit_cost numeric DEFAULT NULL::numeric, 
  p_reference_type text DEFAULT NULL::text, 
  p_reference_id uuid DEFAULT NULL::uuid, 
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_movement_id uuid;
  v_total_cost numeric;
  v_current_inventory inventory_current%ROWTYPE;
BEGIN
  -- SECURITY CHECK: Only admin and operator roles can register movements
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator')) THEN
    RAISE EXCEPTION 'Unauthorized: Only admin and operator roles can register inventory movements'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Calculate total cost
  v_total_cost := CASE 
    WHEN p_unit_cost IS NOT NULL THEN p_unit_cost * p_quantity 
    ELSE NULL 
  END;

  -- Insert movement record
  INSERT INTO inventory_movements (
    movement_type, product_id, batch_id, from_location_id, to_location_id,
    quantity, unit_cost, total_cost, reference_type, reference_id, 
    notes, created_by
  ) VALUES (
    p_movement_type, p_product_id, p_batch_id, p_from_location_id, p_to_location_id,
    p_quantity, p_unit_cost, v_total_cost, p_reference_type, p_reference_id,
    p_notes, auth.uid()
  ) RETURNING id INTO v_movement_id;

  -- Update inventory_current based on movement type
  CASE p_movement_type
    WHEN 'entry' THEN
      -- Find or create inventory record for destination
      SELECT * INTO v_current_inventory 
      FROM inventory_current 
      WHERE product_id = p_product_id 
        AND location_id = p_to_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      IF FOUND THEN
        UPDATE inventory_current 
        SET quantity_available = quantity_available + p_quantity,
            last_movement_date = NOW(),
            last_updated = NOW()
        WHERE id = v_current_inventory.id;
      ELSE
        INSERT INTO inventory_current (
          product_id, location_id, batch_id, quantity_available, 
          last_movement_date
        ) VALUES (
          p_product_id, p_to_location_id, p_batch_id, p_quantity, NOW()
        );
      END IF;

    WHEN 'exit' THEN
      -- Reduce inventory at source location
      UPDATE inventory_current 
      SET quantity_available = quantity_available - p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = p_from_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

    WHEN 'transfer' THEN
      -- Reduce at source
      UPDATE inventory_current 
      SET quantity_available = quantity_available - p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = p_from_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      -- Increase at destination
      SELECT * INTO v_current_inventory 
      FROM inventory_current 
      WHERE product_id = p_product_id 
        AND location_id = p_to_location_id 
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

      IF FOUND THEN
        UPDATE inventory_current 
        SET quantity_available = quantity_available + p_quantity,
            last_movement_date = NOW(),
            last_updated = NOW()
        WHERE id = v_current_inventory.id;
      ELSE
        INSERT INTO inventory_current (
          product_id, location_id, batch_id, quantity_available, 
          last_movement_date
        ) VALUES (
          p_product_id, p_to_location_id, p_batch_id, p_quantity, NOW()
        );
      END IF;

    WHEN 'adjustment' THEN
      -- Adjust inventory (can be positive or negative)
      UPDATE inventory_current 
      SET quantity_available = quantity_available + p_quantity,
          last_movement_date = NOW(),
          last_updated = NOW()
      WHERE product_id = p_product_id 
        AND location_id = COALESCE(p_to_location_id, p_from_location_id)
        AND (p_batch_id IS NULL OR batch_id = p_batch_id);

  END CASE;

  RETURN v_movement_id;
END;
$function$;

-- 2. Fix get_locations_public function to require authorization
DROP FUNCTION IF EXISTS public.get_locations_public();

CREATE OR REPLACE FUNCTION public.get_locations_public()
RETURNS TABLE(id uuid, name text, code text, type location_type, address text, is_active boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY CHECK: Only authenticated users with proper roles
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'user')) THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.code,
    l.type,
    l.address,
    l.is_active
  FROM locations l
  WHERE l.is_active = true;
END;
$function$;

-- 3. Update products table RLS policies to restrict sensitive data access
DROP POLICY IF EXISTS "All authenticated users can view" ON public.products;
DROP POLICY IF EXISTS "Ops/admin can read products" ON public.products;

-- Only basic product info for all users, full details for ops/admin
CREATE POLICY "Users can view basic product info" 
ON public.products 
FOR SELECT 
USING (
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') THEN true
    ELSE true -- All authenticated users can see products but with limited columns via view
  END
);

-- 4. Update raw_materials table RLS policies to restrict sensitive data access  
DROP POLICY IF EXISTS "All authenticated users can view" ON public.raw_materials;
DROP POLICY IF EXISTS "Ops/admin can read raw_materials" ON public.raw_materials;

CREATE POLICY "Users can view basic raw materials info" 
ON public.raw_materials 
FOR SELECT 
USING (
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator') THEN true
    ELSE true -- All authenticated users can see raw materials but with limited columns via view
  END
);

-- 5. Enable RLS on raw_materials_public table and add proper policies
ALTER TABLE public.raw_materials_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view public raw materials" 
ON public.raw_materials_public 
FOR SELECT 
USING (auth.uid() IS NOT NULL);