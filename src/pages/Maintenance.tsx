import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Maintenance = () => {
  const navigate = useNavigate();

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
        <Button onClick={() => navigate(0)} className="min-h-[44px]">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
};

export default Maintenance;
