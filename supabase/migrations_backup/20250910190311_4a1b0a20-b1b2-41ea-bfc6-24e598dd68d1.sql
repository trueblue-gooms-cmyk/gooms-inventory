-- Fix user provisioning trigger to ensure user_roles are created properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile if not exists
  INSERT INTO public.profiles (id, email, full_name, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default role if not exists
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, 'user', NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_raw_materials_updated_at ON raw_materials;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS update_packaging_materials_updated_at ON packaging_materials;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_packaging_materials_updated_at
  BEFORE UPDATE ON packaging_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_inventory_movements ON inventory_movements;
DROP TRIGGER IF EXISTS audit_production_batches ON production_batches;
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
DROP TRIGGER IF EXISTS audit_user_roles ON user_roles;

CREATE TRIGGER audit_inventory_movements
  AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_production_batches
  AFTER INSERT OR UPDATE OR DELETE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create transactional inventory movement function
CREATE OR REPLACE FUNCTION public.register_inventory_movement(
  p_movement_type inventory_movement_type,
  p_product_id uuid,
  p_quantity integer,
  p_batch_id uuid DEFAULT NULL,
  p_from_location_id uuid DEFAULT NULL,
  p_to_location_id uuid DEFAULT NULL,
  p_unit_cost numeric DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_movement_id uuid;
  v_total_cost numeric;
  v_current_inventory inventory_current%ROWTYPE;
BEGIN
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
$$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('stock_low', 'expiring', 'purchase_approval', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only admins and operators can create notifications
CREATE POLICY "Admins and operators can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Add updated_at trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update RLS policies to allow proper operations
-- Fix inventory_movements to allow INSERT/UPDATE for admins and operators
DROP POLICY IF EXISTS "Admin and operators can view movements" ON inventory_movements;
DROP POLICY IF EXISTS "Admin and operators can manage movements" ON inventory_movements;

CREATE POLICY "Admin and operators can view movements" 
ON inventory_movements 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admin and operators can manage movements" 
ON inventory_movements 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Fix inventory_current to allow updates
DROP POLICY IF EXISTS "All authenticated users can view" ON inventory_current;
DROP POLICY IF EXISTS "Admin and operators can manage inventory" ON inventory_current;

CREATE POLICY "All authenticated users can view" 
ON inventory_current 
FOR SELECT 
USING (true);

CREATE POLICY "Admin and operators can manage inventory" 
ON inventory_current 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));