import type { CreditCard, CardPurchase, CardInstallment } from '@/hooks/useCreditCards';
import type { InsightSeverity } from '@/lib/insightsEngine';

export interface CreditInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  priority: number;
  category: 'limite' | 'futuro' | 'concentracao' | 'encerramento' | 'alivio' | 'comportamento';
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MONTH_LABEL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const sevRank: Record<InsightSeverity, number> = { critical: 100, warning: 60, info: 20 };

interface BuildParams {
  cards: CreditCard[];
  purchases: CardPurchase[];
  installments: CardInstallment[];
  today?: Date;
}

/** Calcula totais por mês (yyyy-mm) das parcelas futuras (incluindo a do mês atual). */
function totalsPorMes(installments: CardInstallment[], from: Date) {
  const map = new Map<string, number>();
  for (const i of installments) {
    const d = new Date(i.date);
    if (d < from) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + Number(i.amount));
  }
  return map;
}

/** Constrói insights inteligentes e contextuais sobre o crédito. */
export function buildCreditInsights(p: BuildParams): CreditInsight[] {
  const out: CreditInsight[] = [];
  const today = p.today ?? new Date();
  today.setHours(0, 0, 0, 0);

  if (p.cards.length === 0) return out;

  // ── 1. Uso de limite agregado e por cartão ────────────────────────────────
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
  const utilizadoPorCartao = new Map<string, number>();
  for (const inst of p.installments) {
    const d = new Date(inst.date);
    if (d < inicioMes) continue;
    const compra = p.purchases.find(x => x.id === inst.card_purchase_id);
    if (!compra) continue;
    utilizadoPorCartao.set(
      compra.card_id,
      (utilizadoPorCartao.get(compra.card_id) ?? 0) + Number(inst.amount),
    );
  }

  const totalLimite = p.cards.reduce((s, c) => s + Number(c.limite || 0), 0);
  const totalUsado = Array.from(utilizadoPorCartao.values()).reduce((a, b) => a + b, 0);
  const pctGlobal = totalLimite > 0 ? (totalUsado / totalLimite) * 100 : 0;

  if (pctGlobal >= 85) {
    out.push({
      id: 'limite_alto_global',
      severity: 'warning',
      title: 'Seu limite disponível está abaixo do habitual',
      message: `Você está utilizando ${Math.round(pctGlobal)}% do limite total. Considere espaçar novas compras por algumas semanas.`,
      priority: 80,
      category: 'limite',
    });
  } else if (pctGlobal >= 60) {
    out.push({
      id: 'limite_medio_global',
      severity: 'info',
      title: 'Uso de limite acima da média',
      message: `Cerca de ${Math.round(pctGlobal)}% do seu crédito está em uso entre todos os cartões.`,
      priority: 35,
      category: 'limite',
    });
  }

  for (const c of p.cards) {
    const used = utilizadoPorCartao.get(c.id) ?? 0;
    const lim = Number(c.limite) || 0;
    if (lim <= 0) continue;
    const pct = (used / lim) * 100;
    if (pct >= 90) {
      out.push({
        id: `limite_card_${c.id}`,
        severity: 'warning',
        title: `${c.nome} está perto do limite`,
        message: `Você já comprometeu ${Math.round(pct)}% do limite (${fmt(used)} de ${fmt(lim)}).`,
        priority: 75,
        category: 'limite',
      });
    }
  }

  // ── 2. Comprometimento futuro: mês atual vs próximo ───────────────────────
  const totals = totalsPorMes(p.installments, inicioMes);
  const keyAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const proxRef = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const keyProx = `${proxRef.getFullYear()}-${String(proxRef.getMonth() + 1).padStart(2, '0')}`;
  const atualV = totals.get(keyAtual) ?? 0;
  const proxV = totals.get(keyProx) ?? 0;

  if (atualV > 0 && proxV > 0) {
    const delta = ((proxV - atualV) / atualV) * 100;
    if (delta >= 15) {
      out.push({
        id: 'futuro_aumenta',
        severity: delta >= 35 ? 'warning' : 'info',
        title: `Seu comprometimento aumenta em ${MONTH_LABEL[proxRef.getMonth()]}`,
        message: `As parcelas do próximo mês somam ${fmt(proxV)} — cerca de ${Math.round(delta)}% acima deste mês.`,
        priority: delta >= 35 ? 70 : 45,
        category: 'futuro',
      });
    } else if (delta <= -15) {
      out.push({
        id: 'futuro_alivia',
        severity: 'info',
        title: `Seu cartão fica mais leve em ${MONTH_LABEL[proxRef.getMonth()]}`,
        message: `As parcelas caem para ${fmt(proxV)}, cerca de ${Math.round(Math.abs(delta))}% a menos que este mês.`,
        priority: 40,
        category: 'alivio',
      });
    }
  }

  // ── 3. Concentração: mês mais pesado nos próximos 6 ───────────────────────
  const proximos: { key: string; date: Date; total: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const ref = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const k = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    proximos.push({ key: k, date: ref, total: totals.get(k) ?? 0 });
  }
  const totalSeis = proximos.reduce((s, x) => s + x.total, 0);
  if (totalSeis > 0) {
    const heavier = [...proximos].sort((a, b) => b.total - a.total)[0];
    const share = (heavier.total / totalSeis) * 100;
    if (heavier.total > 0 && share >= 28 && heavier.key !== keyAtual) {
      out.push({
        id: `concentracao_${heavier.key}`,
        severity: share >= 40 ? 'warning' : 'info',
        title: `Alta concentração de parcelas em ${MONTH_LABEL[heavier.date.getMonth()]}`,
        message: `${fmt(heavier.total)} previstos — ${Math.round(share)}% das parcelas dos próximos 6 meses.`,
        priority: share >= 40 ? 65 : 40,
        category: 'concentracao',
      });
    }
  }

  // ── 4. Encerramentos próximos (parcelamentos terminando em 60d) ───────────
  const limit60 = new Date(today); limit60.setDate(limit60.getDate() + 60);
  let encerrando = 0;
  for (const compra of p.purchases) {
    if (compra.parcelas <= 1) continue;
    const parcelas = p.installments.filter(i => i.card_purchase_id === compra.id);
    if (parcelas.length === 0) continue;
    const ultima = parcelas
      .map(i => new Date(i.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (ultima >= today && ultima <= limit60) encerrando++;
  }
  if (encerrando > 0) {
    out.push({
      id: 'encerramentos_60d',
      severity: 'info',
      title: `${encerrando} parcelamento${encerrando === 1 ? '' : 's'} termina${encerrando === 1 ? '' : 'm'} em breve`,
      message: `Seu cartão deve aliviar nos próximos 60 dias com o encerramento desses compromissos.`,
      priority: 50,
      category: 'encerramento',
    });
  }

  // ── 5. Sem compras / panorama tranquilo ───────────────────────────────────
  if (totalSeis === 0 && p.cards.length > 0) {
    out.push({
      id: 'sem_compromissos',
      severity: 'info',
      title: 'Nenhum compromisso futuro registrado',
      message: 'Seus cartões estão sem parcelas previstas. Bom momento para planejar com calma.',
      priority: 10,
      category: 'comportamento',
    });
  }

  return out.sort((a, b) => {
    const sa = sevRank[a.severity];
    const sb = sevRank[b.severity];
    if (sb !== sa) return sb - sa;
    return b.priority - a.priority;
  });
}
