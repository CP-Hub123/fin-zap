import {
  Plane, Home, Car, Monitor, GraduationCap, ShieldCheck,
  Gamepad2, TrendingUp, PiggyBank, Heart, Gift, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type CoverPreset = {
  id: string;
  label: string;
  /** CSS gradient — usado em backgroundImage */
  gradient: string;
  icon: LucideIcon;
  /** cor sólida (hsl) usada como `cor` no banco para retrocompat */
  color: string;
};

export const COVER_PRESETS: CoverPreset[] = [
  { id: 'default',       label: 'Padrão',        gradient: 'linear-gradient(135deg,#3B82F6 0%,#06B6D4 100%)', icon: PiggyBank,    color: '#3B82F6' },
  { id: 'viagem',        label: 'Viagem',        gradient: 'linear-gradient(135deg,#0EA5E9 0%,#22D3EE 100%)', icon: Plane,        color: '#0EA5E9' },
  { id: 'casa',          label: 'Casa',          gradient: 'linear-gradient(135deg,#10B981 0%,#34D399 100%)', icon: Home,         color: '#10B981' },
  { id: 'carro',         label: 'Carro',         gradient: 'linear-gradient(135deg,#1E293B 0%,#475569 100%)', icon: Car,          color: '#475569' },
  { id: 'setup',         label: 'Setup',         gradient: 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)', icon: Monitor,      color: '#8B5CF6' },
  { id: 'estudos',       label: 'Estudos',       gradient: 'linear-gradient(135deg,#F59E0B 0%,#FBBF24 100%)', icon: GraduationCap,color: '#F59E0B' },
  { id: 'emergencia',    label: 'Emergência',    gradient: 'linear-gradient(135deg,#DC2626 0%,#F97316 100%)', icon: ShieldCheck,  color: '#DC2626' },
  { id: 'lazer',         label: 'Lazer',         gradient: 'linear-gradient(135deg,#EC4899 0%,#F472B6 100%)', icon: Gamepad2,     color: '#EC4899' },
  { id: 'investimentos', label: 'Investimentos', gradient: 'linear-gradient(135deg,#059669 0%,#10B981 100%)', icon: TrendingUp,   color: '#059669' },
  { id: 'saude',         label: 'Saúde',         gradient: 'linear-gradient(135deg,#EF4444 0%,#F87171 100%)', icon: Heart,        color: '#EF4444' },
  { id: 'presente',      label: 'Presente',      gradient: 'linear-gradient(135deg,#7C3AED 0%,#A78BFA 100%)', icon: Gift,         color: '#7C3AED' },
  { id: 'sonho',         label: 'Sonho',         gradient: 'linear-gradient(135deg,#0F172A 0%,#1E40AF 100%)', icon: Sparkles,     color: '#1E40AF' },
];

export const getPreset = (id?: string | null): CoverPreset =>
  COVER_PRESETS.find(p => p.id === id) ?? COVER_PRESETS[0];

export type StatusLevel = 'safe' | 'attention' | 'critical' | 'over';

export const getStatusLevel = (pct: number): StatusLevel => {
  if (pct > 100) return 'over';
  if (pct > 80) return 'critical';
  if (pct > 50) return 'attention';
  return 'safe';
};

export const STATUS_META: Record<StatusLevel, { label: string; dot: string; ring: string; bar: string }> = {
  safe:      { label: 'Seguro',    dot: 'bg-emerald-500',  ring: 'ring-emerald-500/40', bar: '[&>div]:bg-emerald-500' },
  attention: { label: 'Atenção',   dot: 'bg-yellow-500',   ring: 'ring-yellow-500/40',  bar: '[&>div]:bg-yellow-500' },
  critical:  { label: 'Crítico',   dot: 'bg-orange-500',   ring: 'ring-orange-500/40',  bar: '[&>div]:bg-orange-500' },
  over:      { label: 'Estourado', dot: 'bg-red-500',      ring: 'ring-red-500/50',     bar: '[&>div]:bg-red-500' },
};