import { CreditCard, PiggyBank, Repeat, Sparkles, BarChart3, Bell, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PlanTier = 'free' | 'pro';

export interface PlanLimits {
  cards: number;
  recorrencias: number;
  cofrinhos: number;
  forecastMonths: number;
  exports: boolean;
  advancedInsights: boolean;
  smartNotifications: boolean;
  openFinance: boolean;
  aiCopilot: boolean;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  priceLabel: string;
  priceHint?: string;
  highlight?: boolean;
  ctaLabel: string;
  limits: PlanLimits;
  promise: string[];
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'FinZap Free',
    tagline: 'Organize seu mês com clareza',
    priceLabel: 'Grátis para sempre',
    ctaLabel: 'Começar grátis',
    limits: {
      cards: 1,
      recorrencias: 3,
      cofrinhos: 4,
      forecastMonths: 1,
      exports: false,
      advancedInsights: false,
      smartNotifications: false,
      openFinance: false,
      aiCopilot: false,
    },
    promise: [
      'Fluxo guiado completo (Resumo, Base, Plano, Fechamento)',
      'Cofrinhos, recorrências e cartão essenciais',
      'Insights básicos sobre seus padrões',
    ],
  },
  pro: {
    id: 'pro',
    name: 'FinZap Founders',
    tagline: 'Acesso vitalício para os primeiros usuários',
    priceLabel: 'R$ 67',
    priceHint: 'Pagamento único · acesso vitalício',
    highlight: true,
    ctaLabel: 'Virar Founder',
    limits: {
      cards: 3,
      recorrencias: 30,
      cofrinhos: 20,
      forecastMonths: 6,
      exports: true,
      advancedInsights: true,
      smartNotifications: true,
      openFinance: false,
      aiCopilot: false,
    },
    promise: [
      'Até 3 cartões organizados',
      'Insights inteligentes do seu dinheiro',
      'Planejamento avançado e previsões financeiras',
      'Acesso antecipado a recursos premium futuros',
      'Acesso vitalício — sem mensalidade',
    ],
  },
};

export interface FeatureMeta {
  key: keyof PlanLimits | 'cards' | 'recorrencias' | 'cofrinhos' | 'forecastMonths';
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FEATURE_META: Record<string, FeatureMeta> = {
  cards: { key: 'cards', icon: CreditCard, title: 'Mais cartões organizados', description: 'Acompanhe todas as faturas, parcelas e limites com clareza Founders.' },
  recorrencias: { key: 'recorrencias', icon: Repeat, title: 'Automação completa', description: 'Cadastre todas as despesas e receitas que se repetem todo mês.' },
  cofrinhos: { key: 'cofrinhos', icon: PiggyBank, title: 'Cofrinhos sem limites práticos', description: 'Organize seu dinheiro por contexto — moradia, lazer, metas e reservas.' },
  forecastMonths: { key: 'forecastMonths', icon: BarChart3, title: 'Previsão estendida', description: 'Veja como seu dinheiro evolui nos próximos meses, não apenas neste.' },
  advancedInsights: { key: 'advancedInsights', icon: Sparkles, title: 'Insights inteligentes', description: 'Leituras inteligentes do seu padrão de gastos e crédito.' },
  smartNotifications: { key: 'smartNotifications', icon: Bell, title: 'Notificações inteligentes', description: 'Alertas certeiros nos momentos que realmente importam.' },
  exports: { key: 'exports', icon: Layers, title: 'Relatórios premium', description: 'Exporte e analise seus dados como quiser.' },
};

export function isLimitReached(used: number, limit: number) {
  if (!isFinite(limit)) return false;
  return used >= limit;
}

export function limitLabel(limit: number) {
  return isFinite(limit) ? String(limit) : 'Ilimitado';
}
