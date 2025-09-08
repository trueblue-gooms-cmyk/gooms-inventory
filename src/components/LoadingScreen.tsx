import { Box } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Box className="w-10 h-10 text-white" />
          </div>
          {/* Rotating ring */}
          <div className="absolute inset-0 -m-2">
            <div className="w-24 h-24 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        </div>
        
        {/* Loading text */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gooms Inventory</h2>
        <p className="text-gray-600">Cargando tu espacio de trabajo...</p>
        
        {/* Loading dots */}
        <div className="flex items-center justify-center gap-1 mt-6">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}