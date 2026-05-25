import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IconMode = 'normal' | 'maintenance' | 'event' | 'founders';

export const ICON_FILES: Record<IconMode, string> = {
  normal:      '/finzap-icon-normal-v1.png',
  maintenance: '/finzap-icon-maintenance-v1.png',
  event:       '/finzap-icon-event-v1.png',
  founders:    '/finzap-icon-founders-v1.png',
};

const THEME_COLORS: Record<IconMode, string> = {
  normal:      '#07090F',
  maintenance: '#1f1b16',
  event:       '#1b0b2e',
  founders:    '#0d0a02',
};

const LABELS: Record<IconMode, string> = {
  normal:      'FinZap',
  maintenance: 'FinZap — Manutenção',
  event:       'FinZap — Evento',
  founders:    'FinZap Founders',
};

const setLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
};

export const useAppBranding = (): { mode: IconMode } => {
  const { data } = useQuery({
    queryKey: ['app-icon-mode'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'app_icon_mode')
        .maybeSingle();
      const v = (data?.value ?? 'normal') as IconMode;
      return (['normal', 'maintenance', 'event', 'founders'] as const).includes(v) ? v : 'normal';
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const mode = (data ?? 'normal') as IconMode;

  useEffect(() => {
    const file = ICON_FILES[mode];
    // Favicon (instant in any open tab)
    setLink('icon', file, { type: 'image/png' });
    setLink('apple-touch-icon', file);
    // Theme color (status bar)
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      document.head.appendChild(theme);
    }
    theme.content = THEME_COLORS[mode];
    // Document title hint (subtle)
    if (mode !== 'normal') {
      document.title = `${LABELS[mode]} — Controle Financeiro Inteligente`;
    }
  }, [mode]);

  return { mode };
};