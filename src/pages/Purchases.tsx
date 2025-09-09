// src/pages/Purchases.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingCart,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Package,
  DollarSign,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'received' | 'cancelled';
  order_date: string;
  expected_date: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  suppliers?: {
    name: string;
    contact_name: string;
    email: string;
  };
  purchase_order_items?: Array<{
    id: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  lead_time_days: number;
}

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  supplier_id: string;
  price_per_unit: number;
  moq_kg: number;
  current_stock_kg: number;
  safety_stock_kg: number;
}

export function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { profile } = useAppStore();
  const isAdmin = profile?.role === 'admin';

  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [] as Array<{
      material_id: string;
      quantity: number;
      unit_price: number;
    }>
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, suppliersRes, materialsRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers (name, contact_name, email),
            purchase_order_items (*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('suppliers')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('raw_materials')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
      if (materialsRes.data) setMaterials(materialsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}-${random}`;
  };

  const handleCreateOrder = async () => {
    try {
      const subtotal = formData.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      const tax = subtotal * 0.19; // 19% IVA
      const total = subtotal + tax;

      // Crear orden
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: generateOrderNumber(),
          supplier_id: formData.supplier_id,
          status: 'draft',
          order_date: new Date().toISOString().split('T')[0],
          expected_date: formData.expected_date,
          subtotal,
          tax,
          total,
          notes: formData.notes,
          created_by: profile?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear items de la orden
      if (orderData && formData.items.length > 0) {
        const items = formData.items.map(item => ({
          purchase_order_id: orderData.id,
          item_type: 'raw_material',
          item_id: item.material_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear la orden de compra');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'approved') {
        updateData.approved_by = profile?.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { material_id: '', quantity: 0, unit_price: 0 }
      ]
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    
    if (field === 'material_id') {
      const material = materials.find(m => m.id === value);
      if (material) {
        newItems[index] = {
          ...newItems[index],
          material_id: value,
          unit_price: material.price_per_unit,
          quantity: material.moq_kg
        };
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_date: '',
      notes: '',
      items: []
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      sent: 'bg-blue-100 text-blue-700',
      received: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'pending_approval': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;