-- PHASE 1: Complete data reset and new test data
-- PHASE 3: Fix backend for movements

-- First, add missing movement types to the enum
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'reemplazo';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'transformacion';

-- Clean all existing test data
DELETE FROM inventory_movements;
DELETE FROM inventory_current;
DELETE FROM sales_data;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM product_recipes;
DELETE FROM product_formulas;
DELETE FROM product_packaging;
DELETE FROM production_batches;
DELETE FROM products;
DELETE FROM raw_materials;
DELETE FROM packaging_materials;

-- Ensure we have the 4 real locations
DELETE FROM locations;
INSERT INTO locations (id, name, code, type, address, is_active) VALUES
(gen_random_uuid(), 'Bodega Central', 'BC001', 'warehouse', 'Bodega principal de almacenamiento', true),
(gen_random_uuid(), 'POS-Colina', 'PC001', 'store', 'Punto de venta Colina', true),
(gen_random_uuid(), 'POS-Fontanar', 'PF001', 'store', 'Punto de venta Fontanar', true),
(gen_random_uuid(), 'POS-Eventos', 'PE001', 'store', 'Punto de venta Eventos', true);

-- Insert 5 raw materials
INSERT INTO raw_materials (id, code, name, description, unit_measure, shelf_life_days, current_stock_kg, min_stock_units, price_per_unit, is_active) VALUES
(gen_random_uuid(), 'RM001', 'Azúcar Refinada', 'Azúcar blanca refinada para confitería', 'kg', 730, 500.0, 100, 2.50, true),
(gen_random_uuid(), 'RM002', 'Gelatina en Polvo', 'Gelatina sin sabor para gomas', 'kg', 1095, 150.0, 50, 12.00, true),
(gen_random_uuid(), 'RM003', 'Ácido Cítrico', 'Acidulante natural para sabor', 'kg', 1460, 75.0, 25, 8.50, true),
(gen_random_uuid(), 'RM004', 'Colorante Rojo', 'Colorante alimentario rojo', 'kg', 1095, 25.0, 10, 15.00, true),
(gen_random_uuid(), 'RM005', 'Saborizante Fresa', 'Esencia artificial de fresa', 'kg', 1095, 30.0, 15, 22.00, true);

-- Insert 5 packaging materials
INSERT INTO packaging_materials (id, code, name, type, unit_measure, current_stock_units, safety_stock_units, price_per_unit, is_active) VALUES
(gen_random_uuid(), 'PM001', 'Bolsas Plásticas 100g', 'bolsa', 'unidad', 5000, 1000, 0.15, true),
(gen_random_uuid(), 'PM002', 'Etiquetas Adhesivas', 'etiqueta', 'unidad', 10000, 2000, 0.05, true),
(gen_random_uuid(), 'PM003', 'Cajas Cartón Pequeñas', 'caja', 'unidad', 500, 100, 1.20, true),
(gen_random_uuid(), 'PM004', 'Film Plástico', 'film', 'metro', 1000, 200, 0.30, true),
(gen_random_uuid(), 'PM005', 'Bandejas Plásticas', 'bandeja', 'unidad', 800, 150, 0.80, true);

-- Insert 5 bulk gum products
INSERT INTO products (id, name, sku, type, product_type, weight_grams, shelf_life_days, units_per_box, min_stock_units, safety_stock_units, unit_cost, is_active) VALUES
(gen_random_uuid(), 'Gomas Rojas al Granel', 'GRG001', 'goma_granel', 'producto_intermedio', 1000, 180, 1, 50, 100, 5.50, true),
(gen_random_uuid(), 'Gomas Verdes al Granel', 'GVG002', 'goma_granel', 'producto_intermedio', 1000, 180, 1, 50, 100, 5.50, true),
(gen_random_uuid(), 'Gomas Amarillas al Granel', 'GAG003', 'goma_granel', 'producto_intermedio', 1000, 180, 1, 50, 100, 5.50, true),
(gen_random_uuid(), 'Gomas Azules al Granel', 'GBG004', 'goma_granel', 'producto_intermedio', 1000, 180, 1, 50, 100, 5.50, true),
(gen_random_uuid(), 'Gomas Mixtas al Granel', 'GMG005', 'goma_granel', 'producto_intermedio', 1000, 180, 1, 50, 100, 5.50, true);

-- Insert 5 final products
INSERT INTO products (id, name, sku, type, product_type, weight_grams, shelf_life_days, units_per_box, min_stock_units, safety_stock_units, unit_cost, is_active) VALUES
(gen_random_uuid(), 'Gomas Surtidas 100g', 'GS100', 'producto_final', 'producto_final', 100, 365, 20, 200, 300, 2.80, true),
(gen_random_uuid(), 'Gomas Fresa 150g', 'GF150', 'producto_final', 'producto_final', 150, 365, 15, 150, 250, 3.20, true),
(gen_random_uuid(), 'Gomas Ácidas 200g', 'GA200', 'producto_final', 'producto_final', 200, 365, 12, 100, 200, 4.50, true),
(gen_random_uuid(), 'Pack Gomas Mixto 500g', 'PM500', 'producto_final', 'producto_final', 500, 365, 8, 80, 150, 8.90, true),
(gen_random_uuid(), 'Gomas Premium 250g', 'GP250', 'producto_final', 'producto_final', 250, 365, 10, 120, 180, 6.75, true);

-- Insert realistic inventory data for all locations and products
WITH location_data AS (
  SELECT id, name FROM locations
),
product_data AS (
  SELECT id, name, min_stock_units, safety_stock_units FROM products
)
INSERT INTO inventory_current (product_id, location_id, quantity_available, quantity_reserved, last_movement_date)
SELECT 
  p.id,
  l.id,
  CASE 
    WHEN l.name = 'Bodega Central' THEN (p.safety_stock_units * 3)
    ELSE (p.min_stock_units + random() * p.safety_stock_units)::integer
  END,
  (random() * 10)::integer,
  NOW() - (random() * interval '30 days')
FROM product_data p
CROSS JOIN location_data l;

-- Insert some recent sales data
WITH products_for_sales AS (
  SELECT id, name FROM products WHERE type = 'producto_final'
)
INSERT INTO sales_data (product_id, quantity, unit_price, total, sale_date, customer_name, channel, source, order_number)
SELECT 
  p.id,
  (5 + random() * 20)::integer,
  (15 + random() * 10)::numeric(10,2),
  (5 + random() * 20)::integer * (15 + random() * 10)::numeric(10,2),
  CURRENT_DATE - (random() * 30)::integer,
  'Cliente ' || (1 + random() * 50)::integer,
  CASE WHEN random() > 0.5 THEN 'online' ELSE 'presencial' END,
  'manual',
  'ORD' || lpad((random() * 9999)::integer::text, 4, '0')
FROM products_for_sales p,
     generate_series(1, 10) -- 10 sales per product
;