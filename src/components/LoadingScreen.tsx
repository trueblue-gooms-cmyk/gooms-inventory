import { Box } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Box className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gooms Inventory</h2>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}