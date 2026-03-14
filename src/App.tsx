import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import LibraryPage from "./pages/LibraryPage";
import KitDetail from "./pages/KitDetail";
import ProductIdeasPage from "./pages/ProductIdeasPage";
import SalesGenerator from "./pages/SalesGenerator";
import CatalogsPage from "./pages/CatalogsPage";
import CatalogDetailPage from "./pages/CatalogDetailPage";
import MockupSimulator from "./pages/MockupSimulator";
import ProfitCalculator from "./pages/ProfitCalculator";
import TrendInsights from "./pages/TrendInsights";
import FavoritesPage from "./pages/FavoritesPage";
import DownloadsPage from "./pages/DownloadsPage";
import Settings from "./pages/Settings";
import PricingPage from "./pages/PricingPage";
import PremiumKitsPage from "./pages/PremiumKitsPage";
import PremiumKitDetail from "./pages/PremiumKitDetail";
import EmbroideryViewerPage from "./pages/EmbroideryViewerPage";
import AdminPanel from "./pages/admin/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
            <Route path="/library/:id" element={<ProtectedRoute><KitDetail /></ProtectedRoute>} />
            <Route path="/product-ideas" element={<ProtectedRoute><ProductIdeasPage /></ProtectedRoute>} />
            <Route path="/sales-generator" element={<ProtectedRoute><SalesGenerator /></ProtectedRoute>} />
            <Route path="/catalogs" element={<ProtectedRoute><CatalogsPage /></ProtectedRoute>} />
            <Route path="/catalogs/:id" element={<ProtectedRoute><CatalogDetailPage /></ProtectedRoute>} />
            <Route path="/mockup-simulator" element={<ProtectedRoute><MockupSimulator /></ProtectedRoute>} />
            <Route path="/embroidery-viewer" element={<ProtectedRoute><EmbroideryViewerPage /></ProtectedRoute>} />
            <Route path="/profit-calculator" element={<ProtectedRoute><ProfitCalculator /></ProtectedRoute>} />
            <Route path="/trends" element={<ProtectedRoute><TrendInsights /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/kits" element={<ProtectedRoute><PremiumKitsPage /></ProtectedRoute>} />
            <Route path="/kits/:id" element={<ProtectedRoute><PremiumKitDetail /></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute><KitsPage /></ProtectedRoute>} />
            <Route path="/collections/:id" element={<ProtectedRoute><KitCollectionDetail /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
