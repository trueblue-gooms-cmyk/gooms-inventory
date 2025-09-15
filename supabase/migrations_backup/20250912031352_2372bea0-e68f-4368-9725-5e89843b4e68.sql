-- Performance optimization for Phase 4
-- Add indexes for frequently queried fields

-- Index for inventory_current table
CREATE INDEX IF NOT EXISTS idx_inventory_current_product_location 
ON inventory_current(product_id, location_id);

CREATE INDEX IF NOT EXISTS idx_inventory_current_last_updated 
ON inventory_current(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_current_quantity_available 
ON inventory_current(quantity_available);

-- Index for inventory_movements table
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at 
ON inventory_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id 
ON inventory_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_type 
ON inventory_movements(movement_type);

-- Index for sales_data table
CREATE INDEX IF NOT EXISTS idx_sales_data_date_product 
ON sales_data(sale_date DESC, product_id);

CREATE INDEX IF NOT EXISTS idx_sales_data_synced_at 
ON sales_data(synced_at DESC);

-- Index for purchase_orders table
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_date 
ON purchase_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id 
ON purchase_orders(supplier_id);

-- Index for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

-- Enable realtime for critical tables
ALTER TABLE inventory_current REPLICA IDENTITY FULL;
ALTER TABLE inventory_movements REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_current;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create function for automatic stock alerts
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stock alerts
DROP TRIGGER IF EXISTS trigger_stock_alert ON inventory_current;
CREATE TRIGGER trigger_stock_alert
    AFTER UPDATE OR INSERT ON inventory_current
    FOR EACH ROW
    WHEN (NEW.quantity_available IS NOT NULL)
    EXECUTE FUNCTION create_stock_alert();

-- Create function for updating inventory last_movement_date
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating last movement date
DROP TRIGGER IF EXISTS trigger_update_last_movement ON inventory_movements;
CREATE TRIGGER trigger_update_last_movement
    AFTER INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_last_movement();