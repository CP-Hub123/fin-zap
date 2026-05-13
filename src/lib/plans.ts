import { CreditCard, PiggyBank, Repeat, Sparkles, BarChart3, Bell, Bot, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PlanTier = 'free' | 'pro' | 'ultra';

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
    name: 'FinZap Pro',
    tagline: 'Previsibilidade real do seu dinheiro',
    priceLabel: 'R$ 19,90 / mês',
    priceHint: 'ou R$ 199/ano — economize 17%',
    highlight: true,
    ctaLabel: 'Assinar Pro',
    limits: {
      cards: 8,
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
      'Previsibilidade de até 6 meses à frente',
      'Insights avançados de crédito e padrões',
      'Notificações inteligentes no momento certo',
      'Relatórios e exportações premium',
    ],
  },
  ultra: {
    id: 'ultra',
    name: 'FinZap Ultra',
    tagline: 'Seu copiloto financeiro completo',
    priceLabel: 'R$ 39,90 / mês',
    priceHint: 'Acesso antecipado a tudo que vem',
    ctaLabel: 'Quero o Ultra',
    limits: {
      cards: Infinity,
      recorrencias: Infinity,
      cofrinhos: Infinity,
      forecastMonths: 12,
      exports: true,
      advancedInsights: true,
      smartNotifications: true,
      openFinance: true,
      aiCopilot: true,
    },
    promise: [
      'Tudo do Pro, sem limites',
      'Open Finance — sincronização automática de contas',
      'IA financeira com leitura proativa do seu mês',
      'Acesso antecipado a recursos futuros',
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
  cards: { key: 'cards', icon: CreditCard, title: 'Mais cartões', description: 'Acompanhe todas as faturas, parcelas e limites em um só lugar.' },
  recorrencias: { key: 'recorrencias', icon: Repeat, title: 'Mais automações', description: 'Cadastre todas as despesas e receitas que se repetem todo mês.' },
  cofrinhos: { key: 'cofrinhos', icon: PiggyBank, title: 'Mais cofrinhos', description: 'Organize seu dinheiro por contexto — moradia, lazer, metas e reservas.' },
  forecastMonths: { key: 'forecastMonths', icon: BarChart3, title: 'Previsão estendida', description: 'Veja como seu dinheiro evolui nos próximos meses, não apenas neste.' },
  advancedInsights: { key: 'advancedInsights', icon: Sparkles, title: 'Insights avançados', description: 'Leituras inteligentes do seu padrão de gastos e crédito.' },
  smartNotifications: { key: 'smartNotifications', icon: Bell, title: 'Notificações inteligentes', description: 'Alertas certeiros nos momentos que realmente importam.' },
  exports: { key: 'exports', icon: Layers, title: 'Relatórios premium', description: 'Exporte e analise seus dados como quiser.' },
  openFinance: { key: 'openFinance', icon: Layers, title: 'Open Finance', description: 'Conecte suas contas e veja tudo automaticamente.' },
  aiCopilot: { key: 'aiCopilot', icon: Bot, title: 'Copiloto com IA', description: 'Uma inteligência financeira lendo seu mês em tempo real.' },
};

export function isLimitReached(used: number, limit: number) {
  if (!isFinite(limit)) return false;
  return used >= limit;
}

export function limitLabel(limit: number) {
  return isFinite(limit) ? String(limit) : 'Ilimitado';
}
