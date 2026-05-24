import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, BellRing, Smartphone, ShieldCheck, AlertTriangle } from 'lucide-react';

export function PushStatus() {
  const { permission, isSubscribed, supported, subscribe } = usePushNotifications();

  if (!supported) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Notificações indisponíveis</p>
            <p className="text-xs text-muted-foreground">Este navegador não suporta notificações push.</p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <BellOff className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">Permissão negada</p>
            <p className="text-xs text-muted-foreground">
              Você bloqueou as notificações. Libere nas configurações do navegador para ativar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/15 p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Notificações ativas</p>
            <p className="text-xs text-muted-foreground">
              Você receberá alertas de vencimentos, metas e lembretes neste dispositivo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
            <Smartphone className="h-3 w-3 mr-1" /> Push ativo
          </Badge>
        </div>
      </div>
    );
  }

  if (permission === 'granted' && !isSubscribed) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Permissão concedida</p>
            <p className="text-xs text-muted-foreground">
              Permissão liberada, mas ainda não inscrito. Ative para receber notificações.
            </p>
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={subscribe}>
          <BellRing className="mr-2 h-3.5 w-3.5" /> Ativar notificações
        </Button>
      </div>
    );
  }

  // permission === 'default'
  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Notificações desativadas</p>
          <p className="text-xs text-muted-foreground">
            Ative para receber lembretes de vencimentos, progresso de metas e alertas importantes.
          </p>
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={subscribe}>
        <BellRing className="mr-2 h-3.5 w-3.5" /> Ativar notificações
      </Button>
    </div>
  );
}
