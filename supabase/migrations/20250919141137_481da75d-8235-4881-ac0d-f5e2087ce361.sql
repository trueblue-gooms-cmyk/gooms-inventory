-- Fix database issues
-- 1. The inventory_current table is missing the last_updated column that's being used in the code

-- Add missing last_updated column to inventory_current
ALTER TABLE public.inventory_current 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to auto-update last_updated when inventory_current changes
CREATE OR REPLACE FUNCTION public.update_inventory_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_inventory_last_updated ON public.inventory_current;
CREATE TRIGGER trigger_update_inventory_last_updated
    BEFORE UPDATE ON public.inventory_current
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_last_updated();