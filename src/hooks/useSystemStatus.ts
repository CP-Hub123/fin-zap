import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSystemStatus = () => {
  const { data: status, isLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_status')
        .maybeSingle();
      return data?.value ?? 'active';
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    isMaintenanceMode: status === 'maintenance',
    isLoading,
  };
};
