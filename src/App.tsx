import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import AppPage from "./pages/AppPage";
import Tutorials from "./pages/Tutorials";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Upgrade from "./pages/Upgrade";
import Maintenance from "./pages/Maintenance";
import CreditCards from "./pages/CreditCards";
import Account from "./pages/Account";
import Download from "./pages/Download";
import Months from "./pages/Months";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Consent from "./pages/legal/Consent";
import CookiesPage from "./pages/legal/Cookies";
import Security from "./pages/legal/Security";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // 30s: evita refetch a cada navegação
      gcTime: 5 * 60_000,           // 5min: mantém em cache após desmontar
      refetchOnWindowFocus: false,  // sem refetch agressivo ao voltar pra aba
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/legal/privacidade" element={<Privacy />} />
            <Route path="/legal/termos" element={<Terms />} />
            <Route path="/legal/consentimento" element={<Consent />} />
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="/legal/seguranca" element={<Security />} />
            <Route path="/download" element={<Download />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
            <Route path="/cartoes" element={<ProtectedRoute><CreditCards /></ProtectedRoute>} />
            <Route path="/conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/tutorials" element={<ProtectedRoute><Tutorials /></ProtectedRoute>} />
            <Route path="/meses" element={<ProtectedRoute><Months /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
            <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
