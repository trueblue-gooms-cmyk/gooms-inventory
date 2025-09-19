import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export const DataImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<string>('');

  // Raw data from CSV files
  const rawMaterials = [
    { name: 'Premezcla Novavit QG-1 V2', supplier: 'Color Química', moq: 20, unit: 'KG', cost: 84108, leadTime: 90 },
    { name: 'Premezcla Novavit QG-2 V2', supplier: 'Color Química', moq: 20, unit: 'KG', cost: 173763, leadTime: 90 },
    { name: 'Premezcla Novavit QG-3 V3', supplier: 'Color Química', moq: 20, unit: 'KG', cost: 102211, leadTime: 90 },
    { name: 'BIOTINA 2%', supplier: 'Color Química', moq: 20, unit: 'KG', cost: 152822, leadTime: 60 },
    { name: 'Azul Natural', supplier: 'J&M', moq: 2, unit: 'KG', cost: 1830553, leadTime: 30 },
    { name: 'Curcumina', supplier: 'Polyaromas', moq: 5, unit: 'KG', cost: 1100000, leadTime: 60 },
    { name: 'SABOR MANZANA NATURAL', supplier: 'Polyaromas', moq: 1, unit: 'KG', cost: 150000, leadTime: 15 },
    { name: 'SABOR ARÁNDANO NATURAL', supplier: 'Polyaromas', moq: 2, unit: 'KG', cost: 145000, leadTime: 15 },
    { name: 'SABOR LIMÓN NATURAL', supplier: 'Polyaromas', moq: 1, unit: 'KG', cost: 140000, leadTime: 15 },
    { name: 'SABOR NARANJA NATURAL', supplier: 'Polyaromas', moq: 1, unit: 'KG', cost: 158000, leadTime: 15 },
    { name: 'EXTRACTO DE JENGIBRE FCA 22590', supplier: 'Polyaromas', moq: 1, unit: 'KG', cost: 344000, leadTime: 15 },
    { name: 'EXTRACTO RED BEET FCA 18698', supplier: 'Polyaromas', moq: 5, unit: 'KG', cost: 147000, leadTime: 15 },
    { name: 'DOLCIA PRIMA® LS LA Allulose Syrup', supplier: 'IPF', moq: 22.68, unit: 'KG', cost: 30100, leadTime: 7 },
    { name: 'FIBRULINE S30', supplier: 'IPF', moq: 20, unit: 'KG', cost: 23220, leadTime: 7 },
    { name: 'COLAGENO', supplier: 'IPF', moq: 20, unit: 'KG', cost: 38000, leadTime: 7 },
    { name: 'SABOR FRESA ACIDA NATURAL 60-85 C', supplier: 'La Tour', moq: 4.1, unit: 'KG', cost: 170000, leadTime: 10 },
    { name: 'SABOR KIWI 55-50 C', supplier: 'La Tour', moq: 4.1, unit: 'KG', cost: 83500, leadTime: 10 },
    { name: 'SABOR FRUTOS ROJOS NATURAL 67-67 C', supplier: 'La Tour', moq: 4.1, unit: 'KG', cost: 113155, leadTime: 10 },
    { name: 'SABOR BLUE BERRY NATURAL IDENTICO 52-116 K', supplier: 'La Tour', moq: 4.1, unit: 'KG', cost: 148625, leadTime: 10 },
    { name: 'PANAX GINSENG ROOT PE 2% WS', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 137300, leadTime: 5 },
    { name: 'Chamomile LE WS', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 76100, leadTime: 5 },
    { name: 'Guaraná PE 22%Caffeine', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 62500, leadTime: 5 },
    { name: 'Extracto de Melisa (Toronjil)', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 95500, leadTime: 5 },
    { name: 'Extracto de Passiflora Incarnata', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 100400, leadTime: 5 },
    { name: 'Extracto de Alcachofa', supplier: 'Phitother', moq: 1, unit: 'KG', cost: 74700, leadTime: 5 },
    { name: 'Melena de León FG', supplier: 'Aitia', moq: 1, unit: 'KG', cost: 393000, leadTime: 12 },
    { name: 'Reishi FG (Ganoderma Lucidum)', supplier: 'Aitia', moq: 1, unit: 'KG', cost: 393000, leadTime: 12 },
    { name: 'Omega 3 Polvo', supplier: 'Factores&Mercado', moq: 2, unit: 'KG', cost: 54000, leadTime: 10 },
    { name: 'Extracto de Té verde Matcha Polvo', supplier: 'Factores&Mercado', moq: 1, unit: 'KG', cost: 75000, leadTime: 10 },
    { name: 'Extracto de Granada 20% Punicalagina', supplier: 'Factores&Mercado', moq: 1, unit: 'KG', cost: 171097, leadTime: 20 },
    { name: 'Citrato de Magnesio', supplier: 'Factores&Mercado', moq: 25, unit: 'KG', cost: 10500, leadTime: 10 },
    { name: 'Vinagre de Manzana Madre', supplier: 'Casa vinagreta Gallo', moq: 1, unit: 'KG', cost: 21153, leadTime: 5 }
  ];

  const packagingMaterials = [
    { name: 'ME Tarro Dynamic Boost', sku: 'TDB' },
    { name: 'ME Tarro How Pretty', sku: 'THP' },
    { name: 'ME Tarro Everyday Wellness', sku: 'TEW' },
    { name: 'ME Tarro Mental Ease', sku: 'TME' },
    { name: 'ME Tarro Gut Health', sku: 'TGH' },
    { name: 'ME Tarro Lights Out', sku: 'TLO' },
    { name: 'ME Tarro Apple Cider', sku: 'TAC' },
    { name: 'ME Tarro Fun Vites', sku: 'TFV' },
    { name: 'Me Tarro Game On', sku: 'TGO' },
    { name: 'ME Refill Dynamic Boost', sku: 'RDB' },
    { name: 'ME Refill How Pretty', sku: 'RHP' },
    { name: 'ME Refill Everyday Wellness', sku: 'REW' },
    { name: 'ME Refill Mental Ease', sku: 'RME' },
    { name: 'ME Refill Gut Health', sku: 'RGH' },
    { name: 'ME Refill Lights Out', sku: 'RLO' },
    { name: 'ME Doypack Lights Out', sku: 'DLO' },
    { name: 'ME DoyPack Apple Cider 150g', sku: 'DAC' },
    { name: 'ME DoyPack Fun Vites 150g', sku: 'DKD' },
    { name: 'ME DoyPack Game On 150g', sku: 'DGO' },
    { name: 'ME Sachet x2 Dynamic Boost', sku: 'SDBX2' },
    { name: 'ME Sachet x2 How Pretty', sku: 'SHPX2' },
    { name: 'ME Sachet x2 Everyday Wellness', sku: 'SEWX2' },
    { name: 'ME Sachet x2 Mental Ease', sku: 'SMEX2' },
    { name: 'ME Sachet x2 Gut Health', sku: 'SGHX2' },
    { name: 'ME Sachet x2 Lights Out', sku: 'SLOX2' },
    { name: 'ME Sachetx2 Apple Cider', sku: 'SACX2' },
    { name: 'ME Sachetx2 Fun Vites: Kids', sku: 'SKDX2' },
    { name: 'ME Sachetx2 Game On: Sport', sku: 'SGOX2' },
    { name: 'ME Sachet x10 Dynamic Boost', sku: 'SDBX10' },
    { name: 'ME Sachet x10 How Pretty', sku: 'SHPX10' },
    { name: 'ME Sachet x10 Everyday Wellness', sku: 'SEWX10' },
    { name: 'ME Sachet x10 Mental Ease', sku: 'SMEX10' },
    { name: 'ME Sachet x10 Gut Health', sku: 'SGHX10' },
    { name: 'ME Sachet x10 Lights Out', sku: 'SLOX10' },
    { name: 'ME Sachetx10 Apple Cider', sku: 'SACX10' },
    { name: 'ME Sachetx10 Fun Vites: Kids', sku: 'SKDX10' },
    { name: 'ME Sachetx10 Game On: Sport', sku: 'SGOX10' },
    { name: 'ME Mentas CITRUS', sku: 'TMC' },
    { name: 'ME Mentas TROPICAL ICE', sku: 'TMTI' },
    { name: 'ME Mentas PEPPERMINT', sku: 'TMPP' }
  ];

  const intermediateProducts = [
    { name: 'Goma Granel Dynamic Boost', code: 'GGDB' },
    { name: 'Goma Granel How Pretty', code: 'GGHP' },
    { name: 'Goma Granel Everyday Wellness', code: 'GGEW' },
    { name: 'Goma Granel Mental Ease', code: 'GGME' },
    { name: 'Goma Granel Gut Health', code: 'GGGH' },
    { name: 'Goma Granel Lights Out', code: 'GGLO' },
    { name: 'Goma Granel Apple Cider', code: 'GGAC' },
    { name: 'Goma Granel Fun Vites', code: 'GGFV' },
    { name: 'Goma Granel Game ON', code: 'GGGO' }
  ];

  const finishedProducts = [
    { name: 'Dynamic Boost: Energía 150 gr', sku: '764451006638', weight: 150 },
    { name: 'How Pretty: Belleza 150 gr', sku: '764451006621', weight: 150 },
    { name: 'Every Day Wellness: Multivitamínico 150 gr', sku: '764451006669', weight: 150 },
    { name: 'Mental Ease: Focus 150 gr', sku: '764451006676', weight: 150 },
    { name: 'Gut Health: Digestión 150 gr', sku: '764451006645', weight: 150 },
    { name: 'Lights Out: Dormir 150 gr', sku: '764451006652', weight: 150 },
    { name: 'Apple Cider : Vinagre de Manzana 150g', sku: '793969686896', weight: 150 },
    { name: 'Fun Vites: Kids 150g', sku: '793969686919', weight: 150 },
    { name: 'Game On: Sport 150g', sku: '793969686902', weight: 150 },
    { name: 'REFILL Dynamic Boost: Energía 150 gr', sku: '764451856110', weight: 150 },
    { name: 'REFILL How Pretty: Belleza 150 gr', sku: '764451856134', weight: 150 },
    { name: 'REFILL Every Day Wellness: Multivitamínico 150 gr', sku: '764451856103', weight: 150 },
    { name: 'REFILL Mental Ease: Focus 150 gr', sku: '764451856127', weight: 150 },
    { name: 'REFILL Gut Health: Digestión 150 gr', sku: '764451856141', weight: 150 },
    { name: 'REFILL Lights Out: Dormir 150 gr', sku: '764451856158', weight: 150 },
    { name: 'DoyPack Lights Out: Dormir 150 gr', sku: '764451856165', weight: 150 },
    { name: 'DoyPack Apple Cider 150g', sku: '793969687008', weight: 150 },
    { name: 'DoyPack Fun Vites 150g', sku: '793969686995', weight: 150 },
    { name: 'DoyPack Game On 150g', sku: '793969686988', weight: 150 },
    { name: 'Sachet x2 Dynamic Boost', sku: '731416396790', weight: 5 },
    { name: 'Sachet x2 How Pretty', sku: '731416396820', weight: 5 },
    { name: 'Sachet x2 Everyday Wellness', sku: '731416396868', weight: 5 },
    { name: 'Sachet x2 Mental Ease', sku: '731416396776', weight: 5 },
    { name: 'Sachet x2 Gut Health', sku: '731416396851', weight: 5 },
    { name: 'Sachet x2 Lights Out', sku: '731416396783', weight: 5 },
    { name: 'Sachet x2 Apple Cider', sku: '609143709247', weight: 5 },
    { name: 'Sachet x2 Fun Vites', sku: '609143709261', weight: 5 },
    { name: 'Sachet x2 Game On', sku: '609143709254', weight: 5 },
    { name: 'Sachet x10 Dynamic Boost', sku: '731416396806', weight: 25 },
    { name: 'Sachet x10 How Pretty', sku: '764451856189', weight: 25 },
    { name: 'Sachet x10 Everyday Wellness', sku: '731416396813', weight: 25 },
    { name: 'Sachet x10 Mental Ease', sku: '731416396837', weight: 25 },
    { name: 'Sachet x10 Gut Health', sku: '764451856172', weight: 25 },
    { name: 'Sachet x10 Lights Out', sku: '731416396844', weight: 25 },
    { name: 'Sachet x10 Apple Cider', sku: '793969686957', weight: 25 },
    { name: 'Sachet x10 Fun Vites', sku: '793969686971', weight: 25 },
    { name: 'Sachet x10 Game On', sku: '793969686964', weight: 25 },
    { name: 'Mentas CITRUS', sku: '609143709292', weight: 10 },
    { name: 'Mentas TROPICAL ICE', sku: '609143709278', weight: 10 },
    { name: 'Mentas PEPPERMINT', sku: '609143709285', weight: 10 }
  ];

  const productCompositions = [
    { productName: 'Dynamic Boost: Energía 150 gr', packageSku: 'TDB', intermediateCode: 'GGDB' },
    { productName: 'How Pretty: Belleza 150 gr', packageSku: 'THP', intermediateCode: 'GGHP' },
    { productName: 'Every Day Wellness: Multivitamínico 150 gr', packageSku: 'TEW', intermediateCode: 'GGEW' },
    { productName: 'Mental Ease: Focus 150 gr', packageSku: 'TME', intermediateCode: 'GGME' },
    { productName: 'Gut Health: Digestión 150 gr', packageSku: 'TGH', intermediateCode: 'GGGH' },
    { productName: 'Lights Out: Dormir 150 gr', packageSku: 'TLO', intermediateCode: 'GGLO' },
    { productName: 'Apple Cider : Vinagre de Manzana 150g', packageSku: 'TAC', intermediateCode: 'GGAC' },
    { productName: 'Fun Vites: Kids 150g', packageSku: 'TFV', intermediateCode: 'GGFV' },
    { productName: 'Game On: Sport 150g', packageSku: 'TGO', intermediateCode: 'GGGO' },
    // Mentas only have packaging, no intermediate products
    { productName: 'Mentas CITRUS', packageSku: 'TMC', intermediateCode: null },
    { productName: 'Mentas TROPICAL ICE', packageSku: 'TMTI', intermediateCode: null },
    { productName: 'Mentas PEPPERMINT', packageSku: 'TMPP', intermediateCode: null }
  ];

  const importData = async () => {
    try {
      setIsImporting(true);
      setProgress('Iniciando importación...');

      // 1. Clear existing incorrect data
      setProgress('Limpiando datos incorrectos...');
      await supabase.from('product_recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('raw_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('packaging_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('intermediate_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Import suppliers (deterministic, sin colisiones)
      setProgress('Importando proveedores...');
      const uniqueSuppliers = [...new Set(rawMaterials.map(rm => rm.supplier))];

      // Obtener existentes para mantener códigos y evitar conflictos
      const { data: existingSuppliers, error: existingSuppliersError } = await supabase
        .from('suppliers')
        .select('id, name, code');
      if (existingSuppliersError) throw existingSuppliersError;

      const codeSet = new Set((existingSuppliers || []).map(s => s.code));
      const nameMap = new Map((existingSuppliers || []).map(s => [s.name, s]));

      // Función para crear un código determinístico a partir del nombre
      const makeBaseCode = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'SUPPLIER';

      const newSuppliers = [] as { name: string; code: string; is_active: boolean }[];
      for (const supplierName of uniqueSuppliers) {
        if (nameMap.has(supplierName)) continue; // Ya existe, no insertar
        let base = makeBaseCode(supplierName);
        let candidate = base;
        let i = 1;
        while (codeSet.has(candidate)) {
          const suffix = String(i).padStart(3, '0');
          candidate = (base + suffix).slice(0, 20);
          i++;
        }
        codeSet.add(candidate);
        newSuppliers.push({ name: supplierName, code: candidate, is_active: true });
      }

      if (newSuppliers.length) {
        const { error: suppliersInsertError } = await supabase
          .from('suppliers')
          .upsert(newSuppliers, { onConflict: 'code', ignoreDuplicates: true });
        if (suppliersInsertError) throw suppliersInsertError;
      }

      // Volver a leer proveedores ya consolidados
      const { data: suppliersResult, error: suppliersFetchError } = await supabase
        .from('suppliers')
        .select('id, name, code');
      if (suppliersFetchError) throw suppliersFetchError;

      // 3. Import raw materials
      setProgress('Importando materias primas...');
      const rawMaterialsToInsert = rawMaterials.map((rm, index) => {
        const supplier = suppliersResult?.find(s => s.name === rm.supplier);
        return {
          name: rm.name,
          code: `RM${(index + 1).toString().padStart(3, '0')}`,
          description: `${rm.name} - ${rm.supplier}`,
          unit_measure: rm.unit.toLowerCase(),
          shelf_life_days: 365,
          price_per_unit: rm.cost,
          moq_kg: rm.moq,
          lead_time_days: rm.leadTime,
          supplier_id: supplier?.id,
          is_active: true
        };
      });

      const { error: rawMaterialsError } = await supabase
        .from('raw_materials')
        .insert(rawMaterialsToInsert);

      if (rawMaterialsError) throw rawMaterialsError;

      // 4. Import packaging materials
      setProgress('Importando materiales de empaque...');
      const packagingToInsert = packagingMaterials.map(pm => ({
        name: pm.name,
        code: pm.sku,
        unit_measure: 'unidad',
        type: 'container' as const,
        is_active: true
      }));

      const { error: packagingError } = await supabase
        .from('packaging_materials')
        .upsert(packagingToInsert, { onConflict: 'code' });

      if (packagingError) throw packagingError;

      // 5. Import intermediate products (Gomas al Granel)
      setProgress('Importando gomas al granel...');
      const intermediateToInsert = intermediateProducts.map(ip => ({
        name: ip.name,
        code: ip.code,
        description: `Producto intermedio: ${ip.name}`,
        unit_measure: 'kg',
        shelf_life_days: 365,
        is_active: true
      }));

      const { error: intermediateError } = await supabase
        .from('intermediate_products')
        .upsert(intermediateToInsert, { onConflict: 'code' });

      if (intermediateError) throw intermediateError;

      // 6. Import finished products
      setProgress('Importando productos terminados...');
      const productsToInsert = finishedProducts.map(fp => ({
        name: fp.name,
        sku: fp.sku,
        type: 'producto_final',
        weight_grams: fp.weight,
        shelf_life_days: 365,
        units_per_box: 1,
        is_active: true
      }));

      const { error: productsError } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'sku' });

      if (productsError) throw productsError;

      // 7. Create BOM relationships
      setProgress('Creando relaciones BOM...');
      
      // Get all inserted data for referencing
      const { data: products } = await supabase.from('products').select('*');
      const { data: packaging } = await supabase.from('packaging_materials').select('*');
      const { data: intermediate } = await supabase.from('intermediate_products').select('*');

      const bomRecipes = [];

      for (const composition of productCompositions) {
        const product = products?.find(p => p.name === composition.productName);
        const packageMaterial = packaging?.find(pm => pm.code === composition.packageSku);
        
        if (product && packageMaterial) {
          // Add packaging relationship
          bomRecipes.push({
            product_id: product.id,
            ingredient_type: 'packaging_material',
            ingredient_id: packageMaterial.id,
            quantity_needed: 1,
            unit_measure: 'unidad',
            notes: 'Empaque principal del producto'
          });

          // Add intermediate product relationship if exists
          if (composition.intermediateCode) {
            const intermediateProduct = intermediate?.find(ip => ip.code === composition.intermediateCode);
            if (intermediateProduct) {
              bomRecipes.push({
                product_id: product.id,
                ingredient_type: 'intermediate_product',
                ingredient_id: intermediateProduct.id,
                quantity_needed: product.weight_grams || 150,
                unit_measure: 'gramos',
                notes: 'Goma al granel del producto'
              });
            }
          }
        }
      }

      const { error: bomError } = await supabase
        .from('product_recipes')
        .insert(bomRecipes);

      if (bomError) throw bomError;

      setProgress('¡Importación completada exitosamente!');
      toast.success('Datos importados correctamente en las 4 categorías');

    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Error al importar datos: ' + (error as Error).message);
      setProgress('Error en la importación');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Importador de Datos CSV</h2>
      <p className="text-gray-600 mb-6">
        Este componente importará los datos de los CSV organizándolos correctamente en las 4 categorías:
      </p>
      <ul className="list-disc list-inside mb-6 space-y-1">
        <li><strong>Materia Prima</strong> → tabla raw_materials (33 items)</li>
        <li><strong>Empaque</strong> → tabla packaging_materials (41 items)</li>
        <li><strong>Gomas al Granel</strong> → tabla intermediate_products (9 items)</li>
        <li><strong>Producto Final</strong> → tabla products (41 items)</li>
      </ul>
      
      {progress && (
        <div className="bg-blue-50 p-4 rounded mb-4">
          <p className="text-blue-800">{progress}</p>
        </div>
      )}

      <Button 
        onClick={importData} 
        disabled={isImporting}
        className="w-full"
      >
        {isImporting ? 'Importando...' : 'Importar Datos CSV'}
      </Button>
    </Card>
  );
};