import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences, NotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BellRing, Send, CreditCard, Wallet, Repeat, Target, Sparkles, Megaphone, AlertTriangle, Sun, CalendarDays, Activity, Compass, LucideIcon } from 'lucide-react';
import { PushDiagnostics } from './PushDiagnostics';
import { PushStatus } from './PushStatus';

type Row = {
  key: keyof NotificationPreferences;
  title: string;
  desc: string;
  icon: LucideIcon;
  locked?: boolean;
};

type Group = { label: string; hint?: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    label: 'Essenciais',
    hint: 'Avisos críticos sempre são entregues, mesmo em modo silencioso.',
    rows: [
      { key: 'alertas_criticos', title: 'Alertas críticos', desc: 'Saldo no vermelho, limite estourado, ações urgentes.', icon: AlertTriangle, locked: true },
    ],
  },
  {
    label: 'Cartões',
    rows: [
      { key: 'cartoes', title: 'Cartões de crédito', desc: 'Fechamento da fatura, vencimento, limite e compras relevantes.', icon: CreditCard },
      { key: 'vencimentos', title: 'Vencimentos', desc: 'Lembrete antes de contas e faturas vencerem.', icon: CalendarDays },
    ],
  },
  {
    label: 'Saldo & orçamento',
    rows: [
      { key: 'saldo_orcamento', title: 'Saldo e orçamento', desc: 'Saldo previsto negativo, gastos acima da média, limites do mês.', icon: Wallet },
    ],
  },
  {
    label: 'Recorrências',
    rows: [
      { key: 'recorrencias', title: 'Recorrências', desc: 'Cobranças amanhã, assinaturas e despesas automáticas.', icon: Repeat },
    ],
  },
  {
    label: 'Cofrinhos & metas',
    rows: [
      { key: 'metas_cofrinhos', title: 'Cofrinhos e metas', desc: 'Progresso relevante, meta próxima e objetivos alcançados.', icon: Target },
    ],
  },
  {
    label: 'Insights inteligentes',
    rows: [
      { key: 'insights', title: 'Insights financeiros', desc: 'Previsões, padrões e recomendações para economizar.', icon: Sparkles },
      { key: 'ritmo_financeiro', title: 'Ritmo financeiro', desc: 'Sinais discretos sobre a precisão da sua previsão e a consistência da sua rotina.', icon: Activity },
      { key: 'atualizacao_diaria', title: 'Atualização contextual', desc: 'Um lembrete sutil somente quando o FinZap perde visibilidade dos seus movimentos.', icon: Compass },
      { key: 'resumo_semanal', title: 'Resumo semanal', desc: 'Domingo à noite, um fechamento da semana.', icon: CalendarDays },
      { key: 'lembrete_diario', title: 'Lembrete diário', desc: 'Um aviso pela manhã para revisar suas finanças.', icon: Sun },
    ],
  },
  {
    label: 'Sistema & novidades',
    rows: [
      { key: 'sistema_novidades', title: 'Novidades e melhorias', desc: 'Atualizações do app, founders e manutenções programadas.', icon: Megaphone },
    ],
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function NotificationSettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { prefs, update } = useNotificationPreferences();
  const { user, isAdmin } = useAuth();
  const { permission, isSubscribed, supported, subscribe } = usePushNotifications();
  const [testing, setTesting] = useState(false);
  const location = useLocation();

  const debugMode = new URLSearchParams(location.search).get('debug') === 'true';
  const showDiagnostics = isAdmin || debugMode;

  const set = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    update.mutate({ [key]: value } as Partial<NotificationPreferences>);
  };

  const sendTest = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: user.id,
          title: '🔔 Notificação de teste',
          body: 'Tudo certo! Você está recebendo notificações do FinZap.',
          type: 'test',
          category: 'test',
          url: '/app',
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) toast.success('Notificação enviada!');
      else toast.message('Salvo no histórico — verifique se as permissões estão liberadas.');
    } catch (e) {
      toast.error('Falha ao enviar.');
    } finally { setTesting(false); }
  };

  if (!prefs) return null;
  const needsPermission = supported && permission !== 'granted';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" /> Notificações</SheetTitle>
          <SheetDescription>Escolha o que quer receber e quando.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!showDiagnostics && (
            <>
              {needsPermission ? (
                <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Ativar notificações neste dispositivo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permita para receber avisos de vencimentos, metas e alertas críticos.
                    </p>
                  </div>
                  <Button size="sm" onClick={subscribe}>Ativar agora</Button>
                </div>
              ) : (
                <PushStatus />
              )}
            </>
          )}

          <div className="space-y-6">
            {GROUPS.map((group) => (
              <section key={group.label} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
                    {group.label}
                  </p>
                </div>
                {group.hint && (
                  <p className="text-xs text-muted-foreground/80 -mt-1">{group.hint}</p>
                )}
                <div className="rounded-2xl border bg-card/50 divide-y">
                  {group.rows.map(({ key, title, desc, icon: Icon, locked }) => (
                    <div key={key} className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-muted/60 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-foreground/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium leading-tight">{title}</Label>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">{desc}</p>
                      </div>
                      <Switch
                        checked={Boolean(prefs[key])}
                        disabled={locked}
                        onCheckedChange={(v) => set(key, v as any)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Modo silencioso</p>
            <p className="text-xs text-muted-foreground">
              Notificações não-críticas ficam em silêncio neste período.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início</Label>
                <Select
                  value={String(prefs.quiet_hours_start)}
                  onValueChange={(v) => set('quiet_hours_start', Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fim</Label>
                <Select
                  value={String(prefs.quiet_hours_end)}
                  onValueChange={(v) => set('quiet_hours_end', Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2,'0')}:00</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showDiagnostics && (
            <>
              <Separator />
              <PushDiagnostics />
            </>
          )}
        </div>

        {showDiagnostics && (
          <div className="border-t p-4">
            <Button variant="outline" className="w-full" onClick={sendTest} disabled={testing || !isSubscribed}>
              <Send className="mr-2 h-4 w-4" /> {testing ? 'Enviando…' : 'Enviar notificação de teste'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}