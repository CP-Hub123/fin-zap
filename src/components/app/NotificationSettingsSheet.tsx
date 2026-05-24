import { useState } from 'react';
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
import { BellRing, Send } from 'lucide-react';
import { PushDiagnostics } from './PushDiagnostics';

const ROWS: Array<{ key: keyof NotificationPreferences; title: string; desc: string }> = [
  { key: 'alertas_criticos', title: 'Alertas críticos', desc: 'Sempre entregue, mesmo no modo silencioso.' },
  { key: 'vencimentos', title: 'Vencimentos', desc: 'Avisos antes de contas e cartões vencerem.' },
  { key: 'recorrencias', title: 'Recorrências', desc: 'Lançamentos automáticos de receitas e despesas.' },
  { key: 'metas_cofrinhos', title: 'Metas e cofrinhos', desc: 'Progresso e conquistas das suas metas.' },
  { key: 'insights', title: 'Insights financeiros', desc: 'Padrões e oportunidades detectados.' },
  { key: 'lembrete_diario', title: 'Lembrete diário', desc: 'Um aviso pela manhã para revisar suas finanças.' },
  { key: 'resumo_semanal', title: 'Resumo semanal', desc: 'Domingo à noite, fechamento da semana.' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function NotificationSettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { prefs, update } = useNotificationPreferences();
  const { user } = useAuth();
  const { permission, isSubscribed, supported, subscribe } = usePushNotifications();
  const [testing, setTesting] = useState(false);

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
          {needsPermission && (
            <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Ativar notificações neste dispositivo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permita para receber avisos de vencimentos, metas e alertas críticos.
                </p>
              </div>
              <Button size="sm" onClick={subscribe}>Ativar agora</Button>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Categorias</p>
            {ROWS.map(({ key, title, desc }) => (
              <div key={key} className="flex items-start justify-between gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium">{title}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={Boolean(prefs[key])}
                  onCheckedChange={(v) => set(key, v as any)}
                />
              </div>
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

          <Separator />

          <PushDiagnostics />
        </div>

        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={sendTest} disabled={testing || !isSubscribed}>
            <Send className="mr-2 h-4 w-4" /> {testing ? 'Enviando…' : 'Enviar notificação de teste'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}