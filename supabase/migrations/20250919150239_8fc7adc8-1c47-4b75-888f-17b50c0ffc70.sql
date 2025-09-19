-- Create intermediate_products table for "Gomas al Granel"
CREATE TABLE public.intermediate_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit_measure TEXT DEFAULT 'kg',
  shelf_life_days INTEGER DEFAULT 365,
  min_stock_units INTEGER DEFAULT 0,
  current_stock_units INTEGER DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Enable RLS on intermediate_products
ALTER TABLE public.intermediate_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for intermediate_products
CREATE POLICY "Admin and operators can manage intermediate products"
ON public.intermediate_products
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Update product_recipes table to support intermediate products
ALTER TABLE public.product_recipes 
ADD COLUMN IF NOT EXISTS ingredient_type TEXT NOT NULL DEFAULT 'raw_material';

-- Update the ingredient_type to support all 4 categories
COMMENT ON COLUMN public.product_recipes.ingredient_type IS 'Type of ingredient: raw_material, packaging_material, intermediate_product, or product';

-- Create function to get intermediate products safely
CREATE OR REPLACE FUNCTION public.get_intermediate_products_safe()
RETURNS TABLE(
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  unit_measure TEXT,
  shelf_life_days INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    ip.id,
    ip.code,
    ip.name,
    ip.description,
    ip.unit_measure,
    ip.shelf_life_days,
    ip.is_active,
    ip.created_at
  FROM intermediate_products ip
  WHERE ip.is_active = true;
$function$;

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_intermediate_products_updated_at
BEFORE UPDATE ON public.intermediate_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_intermediate_products
AFTER INSERT OR UPDATE OR DELETE ON public.intermediate_products
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_function();