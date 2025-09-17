import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from "./App.tsx";
import "./index.css";
import { queryClient } from './lib/queryClient';

console.log('🚀 Gooms Inventory - Starting app...');

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
