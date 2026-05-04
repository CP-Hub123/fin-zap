import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Landmark, Plug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OpenFinanceService } from '@/integrations/open-finance/OpenFinanceService';
import type { ConnectedAccount } from '@/integrations/open-finance/OpenFinanceProvider';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const ConnectedAccountsCard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  useEffect(() => {
    if (!user) return;
    OpenFinanceService.listConnectedAccounts(user.id).then(setAccounts).catch(() => setAccounts([]));
  }, [user]);

  const available = OpenFinanceService.isAvailable();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          Contas conectadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum banco conectado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Em breve você poderá importar transações automaticamente.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!available}
              onClick={() => toast.info('Conexão com bancos em breve.')}
            >
              Conectar banco (em breve)
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {accounts.map(a => (
              <li key={a.id} className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">{a.bankName}</p>
                  <p className="text-xs text-muted-foreground">•••• {a.accountMask}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
