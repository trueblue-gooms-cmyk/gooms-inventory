// src/pages/Users.tsx
// REEMPLAZAR TODO EL CONTENIDO DEL ARCHIVO Users.tsx CON ESTE CÓDIGO

import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
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
            <UsersIcon className="w-8 h-8 text-orange-500" />
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
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="viewer">Visualizador</option>
                            <option value="operator">Operador</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_PERMISSIONS[user.role].color}`}>
                            {ROLE_PERMISSIONS[user.role].label}
                          </span>
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.locations?.join(', ') || 'Sin asignar'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_access}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de invitar usuario */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invitar Usuario</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={inviteData.full_name}
                  onChange={(e) => setInviteData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nombre y apellido"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicaciones
                </label>
                <div className="space-y-2">
                  {LOCATIONS.map(location => (
                    <label key={location} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={inviteData.locations.includes(location)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteData(prev => ({ 
                              ...prev, 
                              locations: [...prev.locations, location] 
                            }));
                          } else {
                            setInviteData(prev => ({ 
                              ...prev, 
                              locations: prev.locations.filter(l => l !== location) 
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleInviteUser}
                disabled={inviting}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {inviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Enviar Invitación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}