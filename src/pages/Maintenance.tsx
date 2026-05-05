import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const Maintenance = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);

  const { data: globalMessage } = useQuery({
    queryKey: ['system-global-message'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'global_message')
        .eq('is_public', true)
        .maybeSingle();
      return data?.value ?? null;
    },
  });

  const handleRetry = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['system-status'] });
      await queryClient.refetchQueries({ queryKey: ['system-status'] });
    } finally {
      setIsChecking(false);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <Logo />
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Sistema em manutenção</h1>
          <p className="text-muted-foreground">
            Estamos realizando melhorias para você. Voltamos em breve.
          </p>
          {globalMessage && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {globalMessage}
            </p>
          )}
        </div>
        <Button onClick={handleRetry} disabled={isChecking} className="min-h-[44px]">
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando sistema...
            </>
          ) : (
            'Tentar novamente'
          )}
        </Button>
      </div>
    </div>
  );
};

export default Maintenance;
