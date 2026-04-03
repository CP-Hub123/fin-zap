import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useAuth();
  const { isMaintenanceMode, isLoading: statusLoading } = useSystemStatus();

  if (isLoading || statusLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isMaintenanceMode && !isAdmin) return <Navigate to="/maintenance" replace />;
  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
