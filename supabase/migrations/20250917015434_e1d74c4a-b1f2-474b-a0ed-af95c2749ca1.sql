-- FASE 1: MIGRACIÓN CRÍTICA - ESTRUCTURA DE BASE DE DATOS
-- Crear enums para tipos de producto y movimiento

-- Crear enum para tipos de producto
CREATE TYPE public.product_type_enum AS ENUM (
  'materia_prima',
  'empaques', 
  'gomas_granel',
  'producto_final'
);

-- Crear enum para tipos de movimiento
CREATE TYPE public.movement_type_enum AS ENUM (
  'entrada',
  'transferencia', 
  'reemplazo',
  'transformacion'
);

-- Actualizar ubicaciones a las 4 específicas
UPDATE public.locations 
SET name = 'Bodega Central', code = 'bodega-central'
WHERE name ILIKE '%bodega%' OR name ILIKE '%central%' OR type = 'warehouse';

INSERT INTO public.locations (name, code, type, is_active) VALUES
('POS-Colina', 'pos-colina', 'store', true),
('POS-Fontanar', 'pos-fontanar', 'store', true), 
('POS-Eventos', 'pos-eventos', 'store', true),
('Bodega Central', 'bodega-central', 'warehouse', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true;

-- Crear tabla para recetas de productos (Módulo Laboratorio)
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_type text NOT NULL CHECK (ingredient_type IN ('materia_prima', 'empaques', 'gomas_granel')),
  ingredient_id uuid NOT NULL,
  quantity_needed numeric NOT NULL DEFAULT 0,
  unit_measure text NOT NULL DEFAULT 'unidad',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS en product_recipes
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

-- Política para product_recipes
CREATE POLICY "Admin and operators can manage recipes" 
ON public.product_recipes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Agregar columna product_type_enum a products si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_type') THEN
    ALTER TABLE public.products ADD COLUMN product_type product_type_enum DEFAULT 'producto_final';
  END IF;
END $$;

-- Actualizar movement_type en inventory_movements para usar el nuevo enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='movement_type' AND data_type='USER-DEFINED') THEN
    -- Si ya existe como enum, verificar que tenga los valores correctos
    ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'reemplazo';
    ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'transformacion';
  END IF;
END $$;

-- Agregar trigger para updated_at en product_recipes
CREATE TRIGGER update_product_recipes_updated_at
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Verificar y agregar timestamps faltantes donde sea necesario
DO $$
BEGIN
  -- Agregar created_at a tablas que no lo tengan
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_current' AND column_name='created_at') THEN
    ALTER TABLE public.inventory_current ADD COLUMN created_at timestamp with time zone DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_current' AND column_name='updated_at') THEN
    ALTER TABLE public.inventory_current ADD COLUMN updated_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Trigger para updated_at en inventory_current
DROP TRIGGER IF EXISTS update_inventory_current_updated_at ON public.inventory_current;
CREATE TRIGGER update_inventory_current_updated_at
  BEFORE UPDATE ON public.inventory_current
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();