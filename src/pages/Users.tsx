// src/pages/Users.tsx
// REEMPLAZAR TODO EL CONTENIDO DEL ARCHIVO Users.tsx CON ESTE CÓDIGO

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Mail,
  Check,
  AlertCircle,
  Eye,
  Building
} from 'lucide-react';

// Tipos del sistema
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_access: string;
  locations?: string[];
}

interface InviteUserData {
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'viewer';
  locations: string[];
}

const LOCATIONS = [
  'Bodega Central',
  'POS-Colina', 
  'POS-Fontanar',
  'POS-Eventos'
];

const ROLE_PERMISSIONS = {
  admin: {
    label: 'Administrador',
    color: 'bg-purple-100 text-purple-700',
    permissions: [
      'Acceso total al sistema',
      'Gestión de usuarios',
      'Configuración del sistema',
      'Aprobación de órdenes',
      'Reportes avanzados'
    ]
  },
  operator: {
    label: 'Operador',
    color: 'bg-blue-100 text-blue-700',
    permissions: [
      'Gestión de inventario',
      'Creación de órdenes',
      'Registro de producción',
      'Movimientos entre ubicaciones',
      'Reportes básicos'
    ]
  },
  viewer: {
    label: 'Visualizador',
    color: 'bg-gray-100 text-gray-700',
    permissions: [
      'Ver dashboard',
      'Ver inventario',
      'Ver reportes básicos',
      'Acceso de solo lectura'
    ]
  }
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState<InviteUserData>({
    email: '',
    full_name: '',
    role: 'operator',
    locations: []
  });
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Cargar usuarios
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Simulación de carga de datos
      setTimeout(() => {
        setUsers([
          {
            id: '1',
            email: 'sebastian@trueblue.pet',
            full_name: 'Sebastian Canal',
            role: 'admin',
            status: 'active',
            created_at: '2025-01-01',
            last_access: '2025-09-10',
            locations: ['Bodega Central', 'POS-Colina']
          },
          {
            id: '2',
            email: 'sebastian.alape@trueblue.pet',
            full_name: 'Sebastian Alape',
            role: 'admin',
            status: 'active',
            created_at: '2025-01-01',
            last_access: '2025-09-09',
            locations: ['Bodega Central']
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'operator' | 'viewer') => {
    try {
      // Actualizar en el estado local
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setMessage({ type: 'success', text: 'Rol actualizado correctamente' });
      setEditingUser(null);
      
      // Aquí iría la llamada a la API
      // await updateUserRole(userId, newRole);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el rol' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.email || !inviteData.full_name) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setInviting(true);
    try {
      // Simulación de envío de invitación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Agregar usuario pendiente a la lista
      const newUser: User = {
        id: String(users.length + 1),
        email: inviteData.email,
        full_name: inviteData.full_name,
        role: inviteData.role,
        status: 'pending',
        created_at: new Date().toISOString().split('T')[0],
        last_access: '-',
        locations: inviteData.locations
      };
      
      setUsers(prev => [...prev, newUser]);
      setShowInviteModal(false);
      setInviteData({ email: '', full_name: '', role: 'operator', locations: [] });
      setMessage({ type: 'success', text: 'Invitación enviada correctamente' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar la invitación' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      setUsers(prev => prev.filter(user => user.id !== userId));
      setMessage({ type: 'success', text: 'Usuario eliminado correctamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar el usuario' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700'
    };
    const labels = {
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // Estadísticas
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    operators: users.filter(u => u.role === 'operator').length,
    viewers: users.filter(u => u.role === 'viewer').length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-gray-600 mt-1">Administra los accesos y permisos del sistema</p>
      </div>

      {/* Mensaje de notificación */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Operadores</p>
              <p className="text-2xl font-bold text-blue-600">{stats.operators}</p>
            </div>
            <Edit2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visualizadores</p>
              <p className="text-2xl font-bold text-gray-600">{stats.viewers}</p>
            </div>
            <Eye className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Botón de invitar usuario */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invitar Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((user) => (