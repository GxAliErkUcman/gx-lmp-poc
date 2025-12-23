import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthCodeExchange } from "@/components/AuthCodeExchange";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";
import ServiceUserHome from "./pages/ServiceUserHome";
import ClientDashboard from "./pages/ClientDashboard";
import ClientAdminPanel from "./pages/ClientAdminPanel";
import StoreOwnerDashboard from "./pages/StoreOwnerDashboard";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthCodeExchange />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/service-user-home" element={<ServiceUserHome />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/client-admin" element={<ClientAdminPanel />} />
            <Route path="/store-owner" element={<StoreOwnerDashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password/*" element={<SetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

