-- Phase 1: Database Cleanup - Remove safety_stock_units and add test data

-- Remove safety_stock_units from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS safety_stock_units;

-- Remove safety_stock_units from raw_materials table  
ALTER TABLE public.raw_materials DROP COLUMN IF EXISTS safety_stock_kg;

-- Remove safety_stock_units from packaging_materials table
ALTER TABLE public.packaging_materials DROP COLUMN IF EXISTS safety_stock_units;

-- Add more test suppliers
INSERT INTO public.suppliers (name, code, contact_name, phone, email, address, payment_terms, lead_time_days, min_order_value, is_active) VALUES
('Distribuidora Central', 'DIST001', 'Carlos Ramirez', '+57-300-1234567', 'carlos@distribuidora.com', 'Calle 50 #25-30, Bogotá', '30 días', 7, 500000, true),
('Insumos del Norte', 'INS002', 'María López', '+57-310-2345678', 'maria@insumosnorte.com', 'Carrera 15 #80-45, Barranquilla', '15 días', 10, 300000, true),
('Proveedora Nacional', 'PROV003', 'Luis García', '+57-320-3456789', 'luis@provnacional.com', 'Avenida 68 #15-20, Medellín', '45 días', 14, 750000, true),
('Materias Primas SAS', 'MAT004', 'Ana Torres', '+57-315-4567890', 'ana@materiasprimas.com', 'Zona Industrial, Cali', '30 días', 12, 400000, true),
('Empaque y Más', 'EMP005', 'Jorge Morales', '+57-305-5678901', 'jorge@empaquemas.com', 'Carrera 30 #45-60, Bucaramanga', '20 días', 8, 200000, true),
('Químicos Especiales', 'QUIM006', 'Patricia Silva', '+57-312-6789012', 'patricia@quimespeciales.com', 'Calle 100 #20-15, Bogotá', '60 días', 21, 1000000, true);

-- Add more test products
INSERT INTO public.products (name, sku, type, product_type, weight_grams, shelf_life_days, units_per_box, min_stock_units, unit_cost, is_active) VALUES
('Goma de Mascar Fresa 50g', 'GMF-50G', 'goma_mascar', 'producto_final', 50, 365, 24, 100, 2500, true),
('Goma de Mascar Menta 50g', 'GMM-50G', 'goma_mascar', 'producto_final', 50, 365, 24, 100, 2500, true),
('Goma de Mascar Tutti Frutti 50g', 'GMT-50G', 'goma_mascar', 'producto_final', 50, 365, 24, 80, 2500, true),
('Chicle Globo Azul 25g', 'CGB-25G', 'chicle', 'producto_final', 25, 365, 48, 150, 1800, true),
('Chicle Globo Rosa 25g', 'CGR-25G', 'chicle', 'producto_final', 25, 365, 48, 150, 1800, true),
('Base de Goma Natural', 'BGN-001', 'base_goma', 'materia_prima', 1000, 730, 20, 50, 15000, true),
('Edulcorante Sorbitol', 'EDU-SOR', 'edulcorante', 'materia_prima', 500, 1095, 40, 30, 8500, true),
('Saborizante Fresa Artificial', 'SAB-FRE', 'saborizante', 'materia_prima', 100, 545, 100, 20, 12000, true),
('Saborizante Menta Natural', 'SAB-MEN', 'saborizante', 'materia_prima', 100, 545, 100, 20, 14000, true),
('Colorante Rojo Carmín', 'COL-ROJ', 'colorante', 'materia_prima', 50, 730, 200, 15, 18000, true),
('Colorante Azul Brillante', 'COL-AZU', 'colorante', 'materia_prima', 50, 730, 200, 15, 18000, true),
('Empaque Individual Metalizado', 'EMP-IND', 'empaque_primario', 'empaques', 1, 1095, 5000, 10000, 50, true),
('Caja Display 24 unidades', 'CAJ-DIS', 'empaque_secundario', 'empaques', 200, 730, 50, 200, 1200, true),
('Etiqueta Nutricional', 'ETI-NUT', 'etiqueta', 'empaques', 1, 365, 10000, 5000, 25, true);

-- Add test raw materials
INSERT INTO public.raw_materials (code, name, description, unit_measure, shelf_life_days, current_stock_kg, min_stock_units, is_active) VALUES
('GEL-001', 'Gelatina Sin Sabor', 'Gelatina neutra para textura', 'kg', 730, 150.5, 50, true),
('AZU-002', 'Azúcar Refinada', 'Azúcar blanca cristalizada', 'kg', 365, 500.0, 200, true),
('GLU-003', 'Glucosa Líquida', 'Jarabe de glucosa para dulces', 'kg', 545, 200.3, 100, true),
('CIT-004', 'Ácido Cítrico', 'Acidulante natural', 'kg', 1095, 25.8, 10, true),
('LEC-005', 'Lecitina de Soya', 'Emulsificante natural', 'kg', 730, 15.2, 5, true),
('CAR-006', 'Carboximetilcelulosa', 'Espesante y estabilizante', 'kg', 1095, 8.5, 3, true),
('VAI-007', 'Extracto de Vainilla', 'Saborizante natural de vainilla', 'litros', 730, 12.0, 5, true),
('ALM-008', 'Almidón de Maíz', 'Espesante vegetal', 'kg', 545, 80.5, 30, true);

-- Add test packaging materials
INSERT INTO public.packaging_materials (code, name, type, unit_measure, current_stock_units, lead_time_days, moq_units, price_per_unit, is_active) VALUES
('PLA-001', 'Film Plástico Transparente', 'film_plastico', 'metros', 5000, 15, 1000, 850, true),
('CAR-002', 'Cartón Corrugado', 'carton', 'hojas', 2500, 10, 500, 1200, true),
('ALU-003', 'Papel Aluminio', 'papel_aluminio', 'metros', 3000, 20, 800, 2500, true),
('BOL-004', 'Bolsas Polietileno', 'bolsa_plastica', 'unidades', 15000, 12, 5000, 120, true),
('TIN-005', 'Tinta para Impresión', 'tinta', 'litros', 50, 25, 10, 45000, true),
('ADH-006', 'Adhesivo Hot Melt', 'adhesivo', 'kg', 25, 18, 5, 25000, true),
('CIN-007', 'Cinta de Sellado', 'cinta', 'rollos', 200, 8, 50, 3500, true),
('GRA-008', 'Grapas Metálicas', 'grapa', 'cajas', 100, 7, 20, 8500, true);