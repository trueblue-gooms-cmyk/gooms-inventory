-- FASE 1: MIGRACIÓN CRÍTICA SEGURA - ESTRUCTURA DE BASE DE DATOS

-- Crear enum para tipos de producto
DO $$ BEGIN
    CREATE TYPE public.product_type_enum AS ENUM (
        'materia_prima',
        'empaques', 
        'gomas_granel',
        'producto_final'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear enum para tipos de movimiento  
DO $$ BEGIN
    CREATE TYPE public.movement_type_enum AS ENUM (
        'entrada',
        'transferencia', 
        'reemplazo',
        'transformacion'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actualizar ubicaciones existentes sin eliminar (más seguro)
-- Verificar que existan las ubicaciones requeridas
INSERT INTO public.locations (name, code, type, is_active) VALUES
('Bodega Central', 'bodega-central', 'oficina', true),
('POS-Colina', 'pos-colina', 'punto_venta', true),
('POS-Fontanar', 'pos-fontanar', 'punto_venta', true), 
('POS-Eventos', 'pos-eventos', 'punto_venta', true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
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

-- Enable RLS en product_recipes si no está habilitado
DO $$ BEGIN
    ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Crear política para product_recipes si no existe
DO $$ BEGIN
    CREATE POLICY "Admin and operators can manage recipes" 
    ON public.product_recipes 
    FOR ALL 
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Agregar columna product_type_enum a products si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_type') THEN
    ALTER TABLE public.products ADD COLUMN product_type product_type_enum DEFAULT 'producto_final';
  END IF;
END $$;

-- Agregar trigger para updated_at en product_recipes si no existe
DO $$ BEGIN
    CREATE TRIGGER update_product_recipes_updated_at
    BEFORE UPDATE ON public.product_recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verificar y agregar timestamps faltantes donde sea necesario
DO $$
BEGIN
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