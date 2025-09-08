import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Box, ArrowRight, Shield, BarChart3, Package2 } from 'lucide-react';

export function Login() {
  const { user, signIn, isLoading } = useAppStore();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Package2,
      title: 'Control Total de Inventario',
      description: 'Gestiona materias primas, producción y producto terminado en tiempo real',
    },
    {
      icon: BarChart3,
      title: 'Proyecciones Inteligentes',
      description: 'Predice demanda y genera órdenes de compra automáticamente',
    },
    {
      icon: Shield,
      title: 'Seguro y Confiable',
      description: 'Trazabilidad completa con registro de cada movimiento',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Gooms Inventory</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-screen">
        {/* Left side - Login form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Welcome text */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Bienvenido de vuelta
                </h1>
                <p className="text-gray-600">
                  Gestiona tu inventario de forma inteligente
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={signIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-700 font-medium">Conectando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-700 font-medium">Continuar con Google</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {/* Security note */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Conexión segura</p>
                    <p className="text-green-700">
                      Tu información está protegida con encriptación de extremo a extremo
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <p className="mt-6 text-xs text-center text-gray-500">
                Al continuar, aceptas nuestros{' '}
                <a href="#" className="text-orange-600 hover:text-orange-700">
                  Términos de Servicio
                </a>{' '}
                y{' '}
                <a href="#" className="text-orange-600 hover:text-orange-700">
                  Política de Privacidad
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Features */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 p-12">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold text-white mb-8">
              Sistema de inventario diseñado para crecer con tu negocio
            </h2>
            
            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-orange-100">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-orange-100 mt-1">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">256-bit</div>
                <div className="text-sm text-orange-100 mt-1">Encriptación</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-orange-100 mt-1">Monitoreo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}