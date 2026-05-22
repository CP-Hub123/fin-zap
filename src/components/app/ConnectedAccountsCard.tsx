import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Landmark, Plug, RefreshCw, Loader2, Trash2, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { OpenFinanceService, type ConnectedAccountRow } from '@/integrations/open-finance/OpenFinanceService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PluggyConnect } from 'react-pluggy-connect';
import { useQueryClient } from '@tanstack/react-query';
import openFinanceLogo from '@/assets/openfinance-logo.png';
import finzapLogo from '@/assets/logo.png';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtRelative = (iso: string | null) => {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
};

export const ConnectedAccountsCard = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          Contas conectadas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <img
              src={openFinanceLogo}
              alt="Logotipo Open Finance"
              className="relative h-20 w-20 object-contain"
            />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Em breve
            </div>
            <p className="text-sm font-semibold">Open Finance chegando</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Em breve você poderá conectar seu banco e importar contas e transações automaticamente, com a segurança regulamentada pelo Banco Central.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Legacy implementation kept for future re-enable
const _LegacyConnectedAccountsCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await OpenFinanceService.listConnectedAccounts(user.id);
      setAccounts(list);
    } catch {
      setAccounts([]);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleConnect = async () => {
    setLoadingToken(true);
    try {
      const t = await OpenFinanceService.createConnectToken();
      setToken(t);
    } catch (e: any) {
      toast.error('Não foi possível iniciar a conexão', { description: e?.message });
    } finally {
      setLoadingToken(false);
    }
  };

  const handleSuccess = async (itemData: { item: { id: string } }) => {
    setToken(null);
    const itemId = itemData?.item?.id;
    if (!itemId) return;
    toast.loading('Importando contas e transações…', { id: 'sync' });
    try {
      const r = await OpenFinanceService.syncItem(itemId);
      toast.success(`${r.accounts} conta(s) conectadas`, {
        id: 'sync',
        description: `${r.imported} transação(ões) importadas`,
      });
      await refresh();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (e: any) {
      toast.error('Falha ao sincronizar', { id: 'sync', description: e?.message });
    }
  };

  const handleSync = async (acc: ConnectedAccountRow) => {
    setSyncingId(acc.id);
    try {
      const r = await OpenFinanceService.syncItem(acc.pluggy_item_id);
      toast.success('Sincronizado', { description: `${r.imported} novas transações` });
      await refresh();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (e: any) {
      toast.error('Falha ao sincronizar', { description: e?.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (acc: ConnectedAccountRow) => {
    if (!confirm(`Remover conexão com ${acc.bank_name}?`)) return;
    try {
      await OpenFinanceService.disconnect(acc.id);
      toast.success('Banco desconectado');
      await refresh();
    } catch (e: any) {
      toast.error('Erro ao desconectar', { description: e?.message });
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            Contas conectadas
          </CardTitle>
          {accounts.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleConnect} disabled={loadingToken}>
              {loadingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Conectar</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-semibold">Conecte seu banco com segurança</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Importe contas e transações automaticamente via Open Finance regulamentado pelo Banco Central.
                </p>
              </div>
              <Button onClick={handleConnect} disabled={loadingToken} className="gap-2">
                {loadingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                Conectar banco
              </Button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="group relative overflow-hidden rounded-xl border bg-card p-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                      {a.bank_logo ? (
                        <img src={a.bank_logo} alt={`Logotipo do banco ${a.bank_name ?? ''}`.trim()} className="h-full w-full object-contain" />
                      ) : (
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{a.bank_name ?? 'Banco'}</p>
                        <p className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">
                          {fmtBRL(Number(a.balance))}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground truncate">
                          {a.account_type ?? 'Conta'} · sincronizado {fmtRelative(a.last_sync)}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSync(a)}
                            disabled={syncingId === a.id}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                            aria-label="Sincronizar"
                          >
                            {syncingId === a.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDisconnect(a)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label="Desconectar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={false}
          onSuccess={handleSuccess}
          onError={(err) => {
            toast.error('Erro na conexão', { description: (err as any)?.message });
            setToken(null);
          }}
          onClose={() => setToken(null)}
        />
      )}
    </>
  );
};
