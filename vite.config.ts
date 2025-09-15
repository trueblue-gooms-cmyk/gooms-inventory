import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libs
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI components
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          // Chart and data visualization
          'charts-vendor': ['recharts'],
          // Supabase and data
          'supabase-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'class-variance-authority', 'zod'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}));
