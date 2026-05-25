import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Activity, RefreshCw, Send, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SubRow = {
  id: string;
  endpoint: string;
  failure_count: number;
  last_error: string | null;
  last_seen_at: string;
  created_at: string;
  user_agent: string | null;
};

type Diag = {
  supported: boolean;
  secure: boolean;
  permission: NotificationPermission | 'unsupported';
  display: 'standalone' | 'browser' | 'minimal-ui' | 'fullscreen' | 'unknown';
  iosPwa: boolean;
  swState: 'none' | 'installing' | 'waiting' | 'active' | 'redundant';
  swScope: string | null;
  hasController: boolean;
  endpointHost: string | null;
  endpointExpires: number | null;
  platform: string;
};

const endpointVendor = (host: string | null) => {
  if (!host) return 'desconhecido';
  if (host.includes('fcm.googleapis')) return 'FCM (Chrome/Android)';
  if (host.includes('mozilla')) return 'Mozilla (Firefox)';
  if (host.includes('windows')) return 'WNS (Edge)';
  if (host.includes('apple') || host.includes('push.apple')) return 'APNs (Safari/iOS)';
  return host;
};

export function PushDiagnostics() {
  const { user } = useAuth();
  const { permission, isSubscribed, supported, subscribe } = usePushNotifications();
  const [diag, setDiag] = useState<Diag | null>(null);
  const [rows, setRows] = useState<SubRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const secure = typeof window !== 'undefined' && window.isSecureContext;
    const supp = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
    const display: Diag['display'] =
      window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' :
      window.matchMedia?.('(display-mode: minimal-ui)').matches ? 'minimal-ui' :
      window.matchMedia?.('(display-mode: fullscreen)').matches ? 'fullscreen' :
      'browser';
    const iosPwa = (navigator as any).standalone === true;
    const ua = navigator.userAgent;
    const platform = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Outro';

    let swState: Diag['swState'] = 'none';
    let swScope: string | null = null;
    let hasController = false;
    let endpointHost: string | null = null;
    let endpointExpires: number | null = null;

    if (supp) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (reg) {
          swScope = reg.scope;
          if (reg.active) swState = 'active';
          else if (reg.waiting) swState = 'waiting';
          else if (reg.installing) swState = 'installing';
          hasController = !!navigator.serviceWorker.controller;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            try { endpointHost = new URL(sub.endpoint).hostname; } catch {}
            endpointExpires = sub.expirationTime ?? null;
          }
        }
      } catch {}
    }

    setDiag({
      supported: supp,
      secure,
      permission: supp ? Notification.permission : 'unsupported',
      display,
      iosPwa,
      swState,
      swScope,
      hasController,
      endpointHost,
      endpointExpires,
      platform,
    });

    if (user) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, failure_count, last_error, last_seen_at, created_at, user_agent')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });
      setRows((data ?? []) as SubRow[]);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const reregister = async () => {
    setBusy('reregister');
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const ok = await subscribe();
      toast[ok ? 'success' : 'error'](ok ? 'Service Worker reinstalado e dispositivo reinscrito.' : 'Falha ao reinscrever.');
      await refresh();
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? e}`);
    } finally { setBusy(null); }
  };

  const resubscribe = async () => {
    setBusy('resub');
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => undefined);
      const ok = await subscribe();
      toast[ok ? 'success' : 'error'](ok ? 'Subscription renovada.' : 'Não foi possível renovar.');
      await refresh();
    } catch (e: any) { toast.error(`Erro: ${e?.message ?? e}`); }
    finally { setBusy(null); }
  };

  const removeRow = async (id: string) => {
    setBusy(`del-${id}`);
    try {
      await supabase.from('push_subscriptions').delete().eq('id', id);
      await refresh();
    } finally { setBusy(null); }
  };

  const sendTest = async () => {
    if (!user) return;
    setBusy('test');
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: user.id,
          title: '🔔 Push de diagnóstico',
          body: 'Se você está vendo isto fora do app, o pipeline está saudável.',
          type: 'test', category: 'test', priority: 'high', url: '/app',
        },
      });
      if (error) throw error;
      const d = data as any;
      const sk = d?.skipped ?? {};
      const skBits = [
        sk.preferences ? `prefs:${sk.preferences}` : null,
        sk.dedupe ? `dedupe:${sk.dedupe}` : null,
        sk.quiet_hours ? `quiet:${sk.quiet_hours}` : null,
      ].filter(Boolean).join(' ');
      toast.message(
        `Enviado: ${d?.sent ?? 0}/${d?.found ?? 0} • removidos: ${d?.removed ?? 0}${skBits ? ` • skip ${skBits}` : ''}`
      );
      await refresh();
    } catch (e: any) { toast.error(`Falha: ${e?.message ?? e}`); }
    finally { setBusy(null); }
  };

  if (!diag) return null;

  const ok = (b: boolean) => b
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    : <XCircle className="h-3.5 w-3.5 text-destructive" />;

  const warn = (txt: string) => (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">{txt}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Diagnóstico
        </p>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={refresh}>
          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5 text-[12.5px]">
        <Row label="Plataforma" value={diag.platform} />
        <Row label="Contexto seguro (HTTPS)" icon={ok(diag.secure)} value={diag.secure ? 'sim' : 'não'} />
        <Row label="Push API suportada" icon={ok(diag.supported)} value={diag.supported ? 'sim' : 'não'} />
        <Row label="Modo PWA" value={diag.display === 'standalone' || diag.iosPwa ? 'standalone (instalado)' : diag.display} />
        <Row label="Permissão" value={<PermissionBadge p={diag.permission} />} />
        <Row label="Service Worker" value={<SwBadge state={diag.swState} />} />
        <Row label="Controla a página" icon={ok(diag.hasController)} value={diag.hasController ? 'sim' : 'não'} />
        <Row label="Provedor de push" value={endpointVendor(diag.endpointHost)} />
        <Row label="Endpoint expira" value={diag.endpointExpires ? new Date(diag.endpointExpires).toLocaleString('pt-BR') : 'sem expiração'} />
      </div>

      {diag.platform === 'Android' && diag.display !== 'standalone' && (
        warn('No Android, push fora do app é mais confiável com o PWA instalado (Adicionar à tela inicial). Em algumas marcas como Samsung/Xiaomi, é necessário desativar a otimização de bateria para o Chrome para receber notificações com app fechado.')
      )}
      {diag.platform === 'iOS' && !diag.iosPwa && (
        warn('No iOS, push web só funciona com o app instalado pela tela inicial (iOS 16.4+). Adicione o FinZap à tela inicial pelo Safari.')
      )}
      {diag.permission === 'denied' && (
        warn('Permissão negada. Abra as configurações do site no navegador para liberar notificações manualmente — não é possível pedir novamente pelo app.')
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Dispositivos registrados ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum dispositivo inscrito ainda.</p>
        ) : rows.map((r) => {
          let host = '—';
          try { host = new URL(r.endpoint).hostname; } catch {}
          return (
            <div key={r.id} className="rounded-lg border bg-background p-2.5 text-[11.5px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{endpointVendor(host)}</span>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => removeRow(r.id)} disabled={busy === `del-${r.id}`}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-muted-foreground">
                visto {formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true, locale: ptBR })}
              </div>
              {r.failure_count > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> {r.failure_count} falha(s){r.last_error ? `: ${r.last_error.slice(0, 80)}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={sendTest} disabled={busy === 'test' || !isSubscribed}>
          <Send className="h-3.5 w-3.5 mr-1.5" /> {busy === 'test' ? 'Enviando…' : 'Push teste'}
        </Button>
        <Button size="sm" variant="outline" onClick={resubscribe} disabled={busy === 'resub' || !diag.supported}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {busy === 'resub' ? '…' : 'Renovar'}
        </Button>
        <Button size="sm" variant="outline" className="col-span-2" onClick={reregister} disabled={busy === 'reregister' || !diag.supported}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> {busy === 'reregister' ? 'Reinstalando…' : 'Reinstalar Service Worker'}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-right">{icon}{value}</span>
    </div>
  );
}

function PermissionBadge({ p }: { p: NotificationPermission | 'unsupported' }) {
  const map: Record<string, { v: string; cls: string }> = {
    granted: { v: 'granted', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
    denied: { v: 'denied', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
    default: { v: 'default', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    unsupported: { v: 'unsupported', cls: 'bg-muted text-muted-foreground' },
  };
  const cfg = map[p] ?? map.default;
  return <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${cfg.cls}`}>{cfg.v}</Badge>;
}

function SwBadge({ state }: { state: Diag['swState'] }) {
  const cls = state === 'active' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
    : state === 'none' ? 'bg-destructive/15 text-destructive border-destructive/30'
    : 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  return <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${cls}`}>{state}</Badge>;
}