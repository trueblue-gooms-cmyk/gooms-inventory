-- Fix security warnings by adding search_path to functions created in last migration

-- Fix create_stock_alert function
CREATE OR REPLACE FUNCTION create_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
    product_record RECORD;
    min_stock INTEGER;
    alert_type TEXT;
    alert_title TEXT;
    alert_message TEXT;
    alert_priority TEXT;
BEGIN
    -- Get product details
    SELECT p.name, p.sku, p.min_stock_units
    INTO product_record
    FROM products p
    WHERE p.id = NEW.product_id;
    
    min_stock := COALESCE(product_record.min_stock_units, 0);
    
    -- Check if stock is critical or low
    IF NEW.quantity_available <= min_stock * 0.5 THEN
        alert_type := 'stock_critical';
        alert_title := '🚨 Stock Crítico';
        alert_message := product_record.name || ': ' || NEW.quantity_available || ' unidades (Mínimo: ' || min_stock || ')';
        alert_priority := 'critical';
    ELSIF NEW.quantity_available <= min_stock THEN
        alert_type := 'stock_low';
        alert_title := '⚠️ Stock Bajo';
        alert_message := product_record.name || ': ' || NEW.quantity_available || ' unidades (Mínimo: ' || min_stock || ')';
        alert_priority := 'high';
    ELSE
        -- No alert needed
        RETURN NEW;
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (
        type, 
        title, 
        message, 
        priority,
        user_id
    )
    SELECT 
        alert_type,
        alert_title,
        alert_message,
        alert_priority,
        ur.user_id
    FROM user_roles ur 
    WHERE ur.role IN ('admin', 'operator')
    ON CONFLICT DO NOTHING; -- Avoid duplicate notifications
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Fix update_inventory_last_movement function
CREATE OR REPLACE FUNCTION update_inventory_last_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory_current 
    SET 
        last_movement_date = NEW.created_at,
        last_updated = now()
    WHERE product_id = NEW.product_id
    AND (location_id = NEW.from_location_id OR location_id = NEW.to_location_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';