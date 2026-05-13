import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInAppNotifications, InAppNotification } from '@/hooks/useInAppNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationSettingsSheet } from './NotificationSettingsSheet';
import { NotificationCenterSheet } from './NotificationCenterSheet';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_DOT: Record<string, string> = {
  alerta: 'bg-destructive',
  vencimento: 'bg-amber-500',
  recorrencia: 'bg-blue-500',
  cofrinho: 'bg-emerald-500',
  insight: 'bg-violet-500',
};

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useInAppNotifications();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = async (n: InAppNotification & { action_url?: string | null; category?: string | null }) => {
    await markAsRead(n.id);
    await supabase.from('notifications_log').update({ clicked_at: new Date().toISOString() }).eq('id', n.id);
    setPopoverOpen(false);
    if (n.action_url) navigate(n.action_url);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" title="Notificações">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Notificações</h4>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground" onClick={markAllAsRead}>
                  <CheckCheck className="mr-1 h-3 w-3" /> Tudo lido
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPopoverOpen(false); setSettingsOpen(true); }} title="Preferências">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tudo em dia.</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Você não tem notificações pendentes.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n as any)}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors"
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${CATEGORY_DOT[(n as any).category ?? ''] ?? 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs font-medium"
              onClick={() => { setPopoverOpen(false); setCenterOpen(true); }}
            >
              Ver central completa
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <NotificationSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NotificationCenterSheet
        open={centerOpen}
        onOpenChange={setCenterOpen}
        onOpenSettings={() => { setCenterOpen(false); setSettingsOpen(true); }}
      />
    </>
  );
};