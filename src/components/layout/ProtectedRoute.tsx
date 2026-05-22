import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { supabase } from '@/integrations/supabase/client';

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

  // Server-side verification: never trust client-derived isAdmin alone.
  const { data: serverIsAdmin, isLoading: checkLoading } = useQuery({
    queryKey: ['is-admin-server', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) return false;
      return data === true;
    },
  });

  if (isLoading || (user && checkLoading)) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin || serverIsAdmin === false) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
