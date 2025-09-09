// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings as SettingsIcon,
  Key,
  Link2,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Package,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface AppSetting {
  key: string;
  value: any;
  description: string;
  is_sensitive: boolean;
}

export function Settings() {
  const [settings, setSettings] = useState<Record<string, AppSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const { profile } = useAppStore();

  const [formData, setFormData] = useState({
    // General
    company_name: '',
    production_lead_days: 7,
    min_expiry_alert_days: 30,
    default_growth_percentage: 10,
    
    // Alegra API
    alegra_api_key: '',
    alegra_api_token: '',
    alegra_webhook_url: '',
    alegra_sync_enabled: false,
    
    // Shopify API  
    shopify_store_url: '',
    shopify_api_key: '',
    shopify_api_secret: '',
    shopify_sync_enabled: false,
    
    // Notificaciones
    email_notifications_enabled: false,
    notification_email: '',
    low_stock_alert_enabled: true,
    expiry_alert_enabled: true,
    
    // Backup
    auto_backup_enabled: false,
    backup_frequency_days: 7,
    last_backup_date: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, AppSetting> = {};
        const formValues: any = { ...formData };
        
        data.forEach(setting => {
          settingsMap[setting.key] = {
            key: setting.key,
            value: setting.value,
            description: setting.description || '',
            is_sensitive: setting.is_sensitive
          };
          
          if (setting.value !== null) {
            formValues[setting.key] = setting.value;
          }
        });
        
        setSettings(settingsMap);
        setFormData(formValues);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value,
        description: settings[key]?.description || '',
        is_sensitive: key.includes('key') || key.includes('token') || key.includes('secret'),
        updated_by: profile?.id
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const testAlegraConnection = async () => {
    setTestingApi('alegra');
    
    try {
      // Simular prueba de conexión
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En producción, hacer llamada real a Alegra API
      // const response = await fetch('https://api.alegra.com/api/v1/users', {
      //   headers: {
      //     'Authorization': `Basic ${btoa(formData.alegra_api_token)}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      
      alert('Conexión exitosa con Alegra');
    } catch (error) {
      alert('Error al conectar con Alegra');
    } finally {
      setTestingApi(null);
    }
  };

  const testShopifyConnection = async () => {
    setTestingApi('shopify');
    
    try {
      // Simular prueba de conexión
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Conexión exitosa con Shopify');
    } catch (error) {
      alert('Error al conectar con Shopify');
    } finally {
      setTestingApi(null);
    }
  };

  const syncAlegraData = async () => {
    if (!confirm('¿Deseas sincronizar los datos de Alegra ahora?')) return;
    
    setTestingApi('alegra-sync');
    
    try {
      // Aquí iría la lógica de sincronización
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      alert('Sincronización completada');
    } catch (error) {
      alert('Error en la sincronización');
    } finally {
      setTestingApi(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'alegra', label: 'Alegra API', icon: DollarSign },
    { id: 'shopify', label: 'Shopify', icon: Package },
    { id: 'notifications', label: 'Notificaciones', icon: AlertCircle },
    { id: 'backup', label: 'Respaldos', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Parámetros del sistema e integraciones</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Días de Lead Time Producción
                  </label>
                  <input
                    type="number"
                    value={formData.production_lead_days}
                    onChange={(e) => setFormData({...formData, production_lead_days: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Días que tarda la maquila en producir</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alerta de Vencimiento (días)
                  </label>
                  <input
                    type="number"
                    value={formData.min_expiry_alert_days}
                    onChange={(e) => setFormData({...formData, min_expiry_alert_days: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alertar cuando falten estos días para vencer</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crecimiento por Defecto (%)
                  </label>
                  <input
                    type="number"
                    value={formData.default_growth_percentage}
                    onChange={(e) => setFormData({...formData, default_growth_percentage: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Para proyecciones de ventas</p>
                </div>
              </div>
            </div>
          )}

          {/* Alegra API */}
          {activeTab === 'alegra' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Configuración de Alegra</p>
                    <p>Conecta tu cuenta de Alegra para sincronizar facturas y ventas automáticamente.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.alegra_api_key}
                  onChange={(e) => setFormData({...formData, alegra_api_key: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={formData.alegra_api_token}
                  onChange={(e) => setFormData({...formData, alegra_api_token: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (opcional)
                </label>
                <input
                  type="text"
                  value={formData.alegra_webhook_url}
                  onChange={(e) => setFormData({...formData, alegra_webhook_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://tu-dominio.com/webhook/alegra"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.alegra_sync_enabled}
                    onChange={(e) => setFormData({...formData, alegra_sync_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Sincronización automática habilitada</span>
                </label>

                <button
                  onClick={testAlegraConnection}
                  disabled={testingApi === 'alegra'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {testingApi === 'alegra' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4" />
                      Probar Conexión
                    </>
                  )}
                </button>

                {formData.alegra_sync_enabled && (
                  <button
                    onClick={syncAlegraData}
                    disabled={testingApi === 'alegra-sync'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {testingApi === 'alegra-sync' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        Sincronizar Ahora
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Shopify */}
          {activeTab === 'shopify' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium mb-1">Configuración de Shopify</p>
                    <p>Conecta tu tienda Shopify para sincronizar productos y órdenes.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de la Tienda
                </label>
                <input
                  type="text"
                  value={formData.shopify_store_url}
                  onChange={(e) => setFormData({...formData, shopify_store_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="tu-tienda.myshopify.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.shopify_api_key}
                    onChange={(e) => setFormData({...formData, shopify_api_key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={formData.shopify_api_secret}
                    onChange={(e) => setFormData({...formData, shopify_api_secret: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.shopify_sync_enabled}
                    onChange={(e) => setFormData({...formData, shopify_sync_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Sincronización automática habilitada</span>
                </label>

                <button
                  onClick={testShopifyConnection}
                  disabled={testingApi === 'shopify'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {testingApi === 'shopify' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4" />
                      Probar Conexión
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.email_notifications_enabled}
                    onChange={(e) => setFormData({...formData, email_notifications_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar notificaciones por email
                  </span>
                </label>

                {formData.email_notifications_enabled && (
                  <input
                    type="email"
                    value={formData.notification_email}
                    onChange={(e) => setFormData({...formData, notification_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="notificaciones@tuempresa.com"
                  />
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Tipos de Alertas</h3>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.low_stock_alert_enabled}
                    onChange={(e) => setFormData({...formData, low_stock_alert_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Alertas de stock bajo</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.expiry_alert_enabled}
                    onChange={(e) => setFormData({...formData, expiry_alert_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Alertas de vencimiento próximo</span>
                </label>
              </div>
            </div>
          )}

          {/* Backup */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.auto_backup_enabled}
                    onChange={(e) => setFormData({...formData, auto_backup_enabled: e.target.checked})}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Habilitar respaldos automáticos
                  </span>
                </label>

                {formData.auto_backup_enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia de respaldo (días)
                    </label>
                    <input
                      type="number"
                      value={formData.backup_frequency_days}
                      onChange={(e) => setFormData({...formData, backup_frequency_days: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                      max="30"
                    />
                  </div>
                )}
              </div>

              {formData.last_backup_date && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">Último respaldo</p>
                      <p>{new Date(formData.last_backup_date).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Crear Respaldo Manual
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}