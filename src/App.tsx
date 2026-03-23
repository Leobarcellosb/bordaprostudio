import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";

// Lazy-loaded pages — only downloaded when navigated to
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<LandingPage />} />
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

export default App;
