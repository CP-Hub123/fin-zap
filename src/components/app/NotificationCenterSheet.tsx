import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, CheckCheck, Settings, Bell, AlertTriangle, CalendarClock, Repeat, PiggyBank, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type LogRow = {
  id: string;
  title: string;
  message: string;
  category: string | null;
  priority: string | null;
  read: boolean;
  sent_at: string;
  action_url: string | null;
  type: string;
};

const FILTERS = [
  { key: 'all', label: 'Tudo' },
  { key: 'alerta', label: 'Alertas' },
  { key: 'vencimento', label: 'Vencimentos' },
  { key: 'recorrencia', label: 'Recorrências' },
  { key: 'cofrinho', label: 'Cofrinhos' },
  { key: 'insight', label: 'Insights' },
] as const;

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  alerta: AlertTriangle,
  vencimento: CalendarClock,
  recorrencia: Repeat,
  cofrinho: PiggyBank,
  insight: Sparkles,
};

const TONES: Record<string, string> = {
  alerta: 'text-destructive bg-destructive/10',
  vencimento: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
  recorrencia: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  cofrinho: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
  insight: 'text-violet-600 bg-violet-500/10 dark:text-violet-400',
};

function bucket(d: Date): 'today' | 'yesterday' | 'week' | 'older' {
  if (isToday(d)) return 'today';
  if (isYesterday(d)) return 'yesterday';
  if (isThisWeek(d, { locale: ptBR })) return 'week';
  return 'older';
}

const BUCKET_LABEL: Record<string, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  week: 'Esta semana',
  older: 'Anteriores',
};

export function NotificationCenterSheet({
  open,
  onOpenChange,
  onOpenSettings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenSettings: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('notifications_log')
      .select('id,title,message,category,priority,read,sent_at,action_url,type')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(80)
      .then(({ data }) => {
        setItems((data ?? []) as LogRow[]);
        setLoading(false);
      });
  }, [open, user]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((n) => n.category === filter)),
    [items, filter],
  );

  const grouped = useMemo(() => {
    const map: Record<string, LogRow[]> = { today: [], yesterday: [], week: [], older: [] };
    for (const n of filtered) map[bucket(new Date(n.sent_at))].push(n);
    return map;
  }, [filtered]);

  const unread = items.filter((n) => !n.read).length;

  const handleClick = async (n: LogRow) => {
    if (!n.read) {
      await supabase.from('notifications_log').update({ read: true, clicked_at: new Date().toISOString() }).eq('id', n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.action_url) {
      onOpenChange(false);
      navigate(n.action_url);
    }
  };

  const markAll = async () => {
    if (!user) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from('notifications_log').update({ read: true }).in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Central de notificações
              </SheetTitle>
              <SheetDescription className="text-xs">
                Tudo que o FinZap te contou recentemente.
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings} title="Preferências">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-3 -mx-1 overflow-x-auto pb-1 scrollbar-thin">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nada por aqui ainda</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                O FinZap só fala quando realmente importa. Quando algo relevante acontecer, aparece aqui.
              </p>
            </div>
          ) : (
            <div className="px-3 py-3 space-y-5">
              {(['today', 'yesterday', 'week', 'older'] as const).map((b) => {
                const list = grouped[b];
                if (!list.length) return null;
                return (
                  <div key={b}>
                    <p className="px-2 mb-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {BUCKET_LABEL[b]}
                    </p>
                    <div className="space-y-1.5">
                      {list.map((n) => {
                        const Icon = ICONS[n.category ?? ''] ?? Bell;
                        const tone = TONES[n.category ?? ''] ?? 'text-muted-foreground bg-muted';
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={cn(
                              'w-full text-left rounded-xl border p-3 transition-all',
                              'hover:border-primary/40 hover:bg-muted/40',
                              !n.read && 'bg-primary/[0.04] border-primary/20',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', tone)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={cn('text-sm leading-tight', !n.read ? 'font-semibold' : 'font-medium text-foreground/90')}>
                                    {n.title}
                                  </p>
                                  {n.priority === 'critical' && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                      crítico
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                                  {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                              {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {unread > 0 && (
          <div className="border-t p-3">
            <Button variant="outline" className="w-full" onClick={markAll}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar tudo como lido ({unread})
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}