import React, { useState, useEffect } from 'react';
import { Plus, Beaker, Package, ChefHat, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Recipe {
  id: string;
  product_id: string;
  ingredient_type: 'materia_prima' | 'empaques' | 'gomas_granel';
  ingredient_id: string;
  quantity_needed: number;
  unit_measure: string;
  notes?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  ingredient?: {
    id: string;
    name: string;
    code?: string;
    sku?: string;
  };
}

export default function Laboratory() {
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [recipeForm, setRecipeForm] = useState({
    ingredient_type: 'materia_prima' as 'materia_prima' | 'empaques' | 'gomas_granel',
    ingredient_id: '',
    quantity_needed: '',
    unit_measure: 'kg',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadRecipes();
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (recipeForm.ingredient_type) {
      loadIngredients();
    }
  }, [recipeForm.ingredient_type]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar productos finales
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, type, product_type')
        .or('type.eq.producto_final,product_type.eq.producto_final')
        .eq('is_active', true)
        .order('name');

      if (productsError) {
        console.error('Error loading products:', productsError);
        // Usar datos de demostración
        setProducts([
          { id: 'demo-1', sku: 'PF-001', name: 'Gomas Ácidas Premium 100g', type: 'producto_final' },
          { id: 'demo-2', sku: 'PF-002', name: 'Gomas Dulces Mix 150g', type: 'producto_final' },
          { id: 'demo-3', sku: 'PF-003', name: 'Gomas Frutas Exóticas 200g', type: 'producto_final' }
        ]);
      } else {
        setProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setProducts([
        { id: 'demo-1', sku: 'PF-001', name: 'Gomas Ácidas Premium 100g', type: 'producto_final' },
        { id: 'demo-2', sku: 'PF-002', name: 'Gomas Dulces Mix 150g', type: 'producto_final' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      let data: any[] = [];
      
      if (recipeForm.ingredient_type === 'materia_prima') {
        const { data: rawMaterials, error } = await supabase
          .from('raw_materials')
          .select('id, name, code, unit_measure')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error loading raw materials:', error);
          data = [
            { id: 'rm-1', name: 'Ácido Cítrico', code: 'MP-001', unit_measure: 'kg' },
            { id: 'rm-2', name: 'Colorante Rojo', code: 'MP-002', unit_measure: 'kg' },
            { id: 'rm-3', name: 'Saborizante Fresa', code: 'MP-003', unit_measure: 'ml' }
          ];
        } else {
          data = rawMaterials || [];
        }
      } else if (recipeForm.ingredient_type === 'empaques') {
        const { data: packaging, error } = await supabase
          .from('packaging_materials')
          .select('id, name, code, unit_measure')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error loading packaging:', error);
          data = [
            { id: 'pkg-1', name: 'Bolsa Transparente 100g', code: 'EMP-001', unit_measure: 'unidad' },
            { id: 'pkg-2', name: 'Etiqueta Principal', code: 'EMP-002', unit_measure: 'unidad' }
          ];
        } else {
          data = packaging || [];
        }
      } else {
        // gomas_granel - buscar en productos
        const { data: gomas, error } = await supabase
          .from('products')
          .select('id, sku, name')
          .eq('type', 'gomas_granel')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error loading gomas granel:', error);
          data = [
            { id: 'gb-1', sku: 'GB-001', name: 'Gomas Base Naranja', unit_measure: 'gramos' },
            { id: 'gb-2', sku: 'GB-002', name: 'Gomas Base Verde', unit_measure: 'gramos' }
          ];
        } else {
          data = gomas || [];
        }
      }

      setIngredients(data);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setIngredients([]);
    }
  };

  const loadRecipes = async () => {
    try {
      // Load recipes with proper ingredient data
      const { data, error } = await supabase
        .from('product_recipes')
        .select(`
          id,
          ingredient_type,
          ingredient_id,
          quantity_needed,
          unit_measure,
          notes
        `)
        .eq('product_id', selectedProduct);

      if (error) throw error;

      // For each recipe, fetch the ingredient details based on type
      const recipesWithIngredients = await Promise.all(
        (data || []).map(async (recipe: any) => {
          let ingredientData = null;

          try {
            if (recipe.ingredient_type === 'materia_prima') {
              const { data: ingredient } = await supabase
                .from('raw_materials')
                .select('id, name, code')
                .eq('id', recipe.ingredient_id)
                .single();
              ingredientData = ingredient;
            } else if (recipe.ingredient_type === 'empaques') {
              const { data: ingredient } = await supabase
                .from('packaging_materials')
                .select('id, name, code')
                .eq('id', recipe.ingredient_id)
                .single();
              ingredientData = ingredient;
            } else if (recipe.ingredient_type === 'gomas_granel') {
              const { data: ingredient } = await supabase
                .from('products')
                .select('id, name, sku')
                .eq('id', recipe.ingredient_id)
                .single();
              ingredientData = ingredient;
            }
          } catch (err) {
            console.error(`Error loading ingredient for recipe ${recipe.id}:`, err);
          }

          return {
            ...recipe,
            ingredient: ingredientData || { id: recipe.ingredient_id, name: 'Ingrediente desconocido', sku: 'N/A' }
          };
        })
      );

      setRecipes(recipesWithIngredients);

    } catch (error) {
      console.error('Error loading recipes:', error);
      setRecipes([]);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedProduct || !recipeForm.ingredient_id || !recipeForm.quantity_needed) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      const recipeData = {
        product_id: selectedProduct,
        ingredient_type: recipeForm.ingredient_type,
        ingredient_id: recipeForm.ingredient_id,
        quantity_needed: Number(recipeForm.quantity_needed),
        unit_measure: recipeForm.unit_measure,
        notes: recipeForm.notes || null
      };

      const { error } = await supabase
        .from('product_recipes')
        .insert([recipeData]);

      if (error) throw error;

      toast({
        title: "Ingrediente agregado",
        description: "El ingrediente se ha agregado a la receta correctamente",
        variant: "default"
      });

      setRecipeForm({
        ingredient_type: 'materia_prima',
        ingredient_id: '',
        quantity_needed: '',
        unit_measure: 'kg',
        notes: ''
      });

      setShowRecipeModal(false);
      loadRecipes();
    } catch (error: any) {
      console.error('Error adding ingredient:', error);
      toast({
        title: "Error",
        description: error.message || "Error al agregar ingrediente",
        variant: "destructive"
      });
    }
  };

  const handleDeleteIngredient = async (recipeId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente de la receta?')) return;

    try {
      const { error } = await supabase
        .from('product_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;

      toast({
        title: "Ingrediente eliminado",
        description: "El ingrediente se ha eliminado de la receta",
        variant: "default"
      });

      loadRecipes();
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar ingrediente",
        variant: "destructive"
      });
    }
  };

  const getIngredientTypeLabel = (type: string) => {
    const types = {
      materia_prima: 'Materia Prima',
      empaques: 'Empaques',
      gomas_granel: 'Gomas al Granel'
    };
    return types[type as keyof typeof types] || type;
  };

  const getIngredientTypeColor = (type: string) => {
    const colors = {
      materia_prima: 'bg-blue-100 text-blue-700',
      empaques: 'bg-green-100 text-green-700',
      gomas_granel: 'bg-purple-100 text-purple-700'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Beaker className="w-8 h-8 text-orange-600" />
            Laboratorio
          </h1>
          <p className="text-gray-600 mt-1">Gestión de recetas y fórmulas de productos</p>
        </div>
      </div>

      {/* Selector de producto */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Producto Final</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedProduct === product.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
              onClick={() => setSelectedProduct(product.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.sku}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receta del producto seleccionado */}
      {selectedProduct && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-600" />
              Receta del Producto
            </h2>
            <button
              onClick={() => setShowRecipeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Ingrediente
            </button>
          </div>

          {recipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ingredientes definidos</h3>
              <p className="text-gray-600 mb-4">Define los ingredientes necesarios para producir este producto</p>
              <button
                onClick={() => setShowRecipeModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Definir Primer Ingrediente
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getIngredientTypeColor(recipe.ingredient_type)}`}>
                        {getIngredientTypeLabel(recipe.ingredient_type)}
                      </span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {recipe.ingredient?.name || 'Ingrediente desconocido'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {recipe.ingredient?.sku || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {recipe.quantity_needed} {recipe.unit_measure}
                        </p>
                        {recipe.notes && (
                          <p className="text-sm text-gray-600">{recipe.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteIngredient(recipe.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para agregar ingrediente */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Agregar Ingrediente</h2>
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo de ingrediente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Ingrediente <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'materia_prima', label: 'Materia Prima' },
                    { value: 'empaques', label: 'Empaques' },
                    { value: 'gomas_granel', label: 'Gomas Granel' }
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`p-2 text-sm rounded-lg border-2 transition-all ${
                        recipeForm.ingredient_type === type.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                      onClick={() => setRecipeForm(prev => ({ ...prev, ingredient_type: type.value as any, ingredient_id: '' }))}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingrediente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingrediente <span className="text-red-500">*</span>
                </label>
                <select
                  value={recipeForm.ingredient_id}
                  onChange={(e) => setRecipeForm(prev => ({ ...prev, ingredient_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccionar ingrediente</option>
                  {ingredients.map(ingredient => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.sku || ingredient.code || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={recipeForm.quantity_needed}
                    onChange={(e) => setRecipeForm(prev => ({ ...prev, quantity_needed: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                {/* Unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={recipeForm.unit_measure}
                    onChange={(e) => setRecipeForm(prev => ({ ...prev, unit_measure: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="kg">Kilogramos</option>
                    <option value="g">Gramos</option>
                    <option value="ml">Mililitros</option>
                    <option value="l">Litros</option>
                    <option value="unidad">Unidades</option>
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                <textarea
                  value={recipeForm.notes}
                  onChange={(e) => setRecipeForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Notas adicionales sobre este ingrediente..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddIngredient}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Agregar Ingrediente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}