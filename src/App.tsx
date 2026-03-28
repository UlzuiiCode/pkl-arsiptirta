import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import VouchersPage from "@/pages/VouchersPage";
import ArchivePage from "@/pages/ArchivePage";
import CategoriesPage from "@/pages/CategoriesPage";
import UsersPage from "@/pages/UsersPage";
import LogsPage from "@/pages/LogsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/vouchers" element={<ProtectedRoute><VouchersPage /></ProtectedRoute>} />
            <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute adminOnly><CategoriesPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
