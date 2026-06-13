import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { OAuthBootstrap } from "@/components/OAuthBootstrap";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";

// Todas as páginas são lazy — cada uma vira um chunk separado. Vendor
// libs (react, supabase, radix) são agrupadas em chunks dedicados via
// vite.config.ts → rollupOptions.manualChunks pra caching estável.
const Login = lazy(() => import("./pages/Login"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const KitDetail = lazy(() => import("./pages/KitDetail"));
const ProductIdeasPage = lazy(() => import("./pages/ProductIdeasPage"));
const CatalogsPage = lazy(() => import("./pages/CatalogsPage"));
const CatalogDetailPage = lazy(() => import("./pages/CatalogDetailPage"));
const CatalogGeneratorPage = lazy(() => import("./pages/CatalogGeneratorPage"));
const ProfitCalculator = lazy(() => import("./pages/ProfitCalculator"));
const TrendInsights = lazy(() => import("./pages/TrendInsights"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const DownloadsPage = lazy(() => import("./pages/DownloadsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const PremiumKitsPage = lazy(() => import("./pages/PremiumKitsPage"));
const PremiumKitDetail = lazy(() => import("./pages/PremiumKitDetail"));
const MinhaContaPage = lazy(() => import("./pages/MinhaContaPage"));
const EmbroideryViewerPage = lazy(() => import("./pages/EmbroideryViewerPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const Termos = lazy(() => import("./pages/Termos"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const Ativar = lazy(() => import("./pages/Ativar"));
const GanheDinheiro = lazy(() => import("./pages/GanheDinheiro"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,         // 1 min — evita refetch em navegação rápida
      gcTime: 5 * 60 * 1000,        // 5 min — cache fica em memória
      retry: 1,                      // 1 retry em erro de rede
      refetchOnWindowFocus: false,   // não refetch ao voltar pra aba — UX melhor
    },
  },
});

// Loader cheio de viewport mostrado entre rotas lazy-loaded (Suspense
// fallback). Usa inline styles + injeção de @keyframes via <style> pra
// renderizar mesmo se o CSS principal ainda não tiver carregado.
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#FAF7F2",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "3px solid #EDE3D4",
        borderTopColor: "#7C3AED",
        animation: "borda-spin 0.8s linear infinite",
      }}
    />
    <style>{`@keyframes borda-spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

const App = () => {
  // Preload silencioso das rotas mais acessadas após o primeiro paint —
  // navegação subsequente fica instantânea. requestIdleCallback espera o
  // browser ficar ocioso; fallback de 2s pra Safari (que ainda não suporta).
  useEffect(() => {
    const preloadHotRoutes = () => {
      void import("./pages/Dashboard");
      void import("./pages/LibraryPage");
    };
    type WindowWithIdle = Window & { requestIdleCallback?: (cb: () => void) => number };
    const w = window as WindowWithIdle;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(preloadHotRoutes);
    } else {
      setTimeout(preloadHotRoutes, 2000);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RecoveryRedirect />
          <OAuthBootstrap />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Redirects PT-BR — links de email, WhatsApp, marketing e
                  qualquer URL em português caem nas rotas canônicas em EN.
                  Preserva ?query e #hash via Navigate replace. Marketing
                  pode usar borda.pro/biblioteca, borda.pro/favoritos, etc.
                  /comunidade e /minha-conta já são canônicas em PT-BR. */}
              <Route path="/biblioteca" element={<Navigate to="/library" replace />} />
              <Route path="/favoritos" element={<Navigate to="/favorites" replace />} />
              <Route path="/tendencias" element={<Navigate to="/trends" replace />} />
              <Route path="/calculadora" element={<Navigate to="/profit-calculator" replace />} />
              <Route path="/catalogos" element={<Navigate to="/catalogs" replace />} />
              <Route path="/visualizador" element={<Navigate to="/embroidery-viewer" replace />} />
              <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
              <Route path="/ideias" element={<Navigate to="/product-ideas" replace />} />
              <Route path="/configuracoes" element={<Navigate to="/settings" replace />} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/politica-de-privacidade" element={<Privacidade />} />
              <Route path="/ativar" element={<Ativar />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/library/:id" element={<ProtectedRoute><KitDetail /></ProtectedRoute>} />
              <Route path="/product-ideas" element={<ProtectedRoute><ProductIdeasPage /></ProtectedRoute>} />
              <Route path="/catalogs" element={<ProtectedRoute><CatalogsPage /></ProtectedRoute>} />
              <Route path="/catalogs/:id" element={<ProtectedRoute><CatalogDetailPage /></ProtectedRoute>} />
              <Route path="/catalogs/:id/generate" element={<ProtectedRoute><CatalogGeneratorPage /></ProtectedRoute>} />
              <Route path="/embroidery-viewer" element={<ProtectedRoute><EmbroideryViewerPage /></ProtectedRoute>} />
              <Route path="/comunidade" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
              <Route path="/profit-calculator" element={<ProtectedRoute><ProfitCalculator /></ProtectedRoute>} />
              <Route path="/trends" element={<ProtectedRoute><TrendInsights /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
              <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/minha-conta" element={<ProtectedRoute><MinhaContaPage /></ProtectedRoute>} />
              <Route path="/ganhe-dinheiro" element={<ProtectedRoute><GanheDinheiro /></ProtectedRoute>} />
              <Route path="/kits" element={<ProtectedRoute><PremiumKitsPage /></ProtectedRoute>} />
              <Route path="/kits/:id" element={<ProtectedRoute><PremiumKitDetail /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
