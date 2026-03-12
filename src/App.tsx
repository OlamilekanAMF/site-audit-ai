import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import DashboardPricing from "./pages/DashboardPricing";
import Dashboard from "./pages/Dashboard";
import SEODashboard from "./pages/SEODashboard";
import Scanner from "./pages/Scanner";
import Report from "./pages/Report";
import Reports from "./pages/Reports";
import KeywordResearch from "./pages/KeywordResearch";
import RankingOpportunities from "./pages/RankingOpportunities";
import SEOReports from "./pages/SEOReports";
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/pricing" element={<ProtectedRoute><DashboardPricing /></ProtectedRoute>} />
              <Route path="/seo-dashboard" element={<ProtectedRoute><SEODashboard /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
              <Route path="/report/:id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/keywords" element={<ProtectedRoute><KeywordResearch /></ProtectedRoute>} />
              <Route path="/opportunities" element={<ProtectedRoute><RankingOpportunities /></ProtectedRoute>} />
              <Route path="/seo-reports" element={<ProtectedRoute><SEOReports /></ProtectedRoute>} />
              <Route path="/competitor-analysis" element={<ProtectedRoute><CompetitorAnalysis /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
