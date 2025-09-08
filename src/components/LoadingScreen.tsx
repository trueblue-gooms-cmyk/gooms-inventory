import { Box } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Static logo */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Box className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        
        {/* Welcome text */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Gooms Inventory
          </h1>
          <p className="text-muted-foreground text-lg">
            Bienvenido a tu sistema de gestión
          </p>
          <div className="w-16 h-1 bg-primary rounded-full mx-auto opacity-60" />
        </div>
      </div>
    </div>
  );
}