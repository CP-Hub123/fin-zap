import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, MONTH_NAMES } from '@/lib/constants';
import { useCreditCards, type CreditCard, type CardPurchase } from '@/hooks/useCreditCards';
import { CardDetailSheet } from './CardDetailSheet';
import { EditCardPurchaseDialog } from './EditCardPurchaseDialog';
import { CreditInsightsPanel } from './CreditInsightsPanel';
import { buildCreditInsights } from '@/lib/creditInsightsEngine';
import {
  Plus, CreditCard as CreditCardIcon, Calendar, Trash2, Pencil, Wallet,
  TrendingDown, ChevronDown, Sparkles, ShoppingBag, Loader2, AlertCircle,
} from 'lucide-react';

const CARD_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F97316', '#10B981', '#06B6D4', '#0EA5E9',
  '#1F2937', '#475569',
];

const BANDEIRAS = [
  { v: 'visa', l: 'Visa' },
  { v: 'mastercard', l: 'Mastercard' },
  { v: 'elo', l: 'Elo' },
  { v: 'amex', l: 'American Express' },
  { v: 'hipercard', l: 'Hipercard' },
  { v: 'outro', l: 'Outro' },
];

const PARCELAS_OPTS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 24, 36, 48, 60];

const emptyCard = {
  nome: '',
  bandeira: 'outro',
  cor: CARD_COLORS[0],
  limite: '',
  fechamento_dia: 1,
  vencimento_dia: 10,
  ativo: true,
};

const emptyPurchase = {
  card_id: '',
  descricao: '',
  valor_total: '',
  parcelas: 1,
  data_compra: new Date().toISOString().slice(0, 10),
  categoria: '',
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

/** Determina o intervalo da fatura "atual" de um cartão (próximo vencimento). */
function faturaAtual(card: CreditCard, ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth(); // 0-based
  const day = ref.getDate();
  // Se já passou do fechamento, próxima fatura é a do mês seguinte
  let venY = y;
  let venM = m;
  if (day >= card.fechamento_dia) {
    venM = m + 1;
    if (venM > 11) { venM = 0; venY += 1; }
  }
  const lastDay = new Date(venY, venM + 1, 0).getDate();
  const venDay = Math.min(card.vencimento_dia, lastDay);
  const vencimento = new Date(venY, venM, venDay);
  return { vencimento };
}

function diffDays(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86400000);
}

function relativeLabel(d: Date) {
  const days = diffDays(d);
  if (days < 0) return `Venceu há ${Math.abs(days)}d`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days <= 30) return `Em ${days} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function CreditCardsView() {
  const { cards, purchases, installments, isLoading,
    createCard, updateCard, deleteCard, createPurchase, deletePurchase } = useCreditCards();

  const [cardOpen, setCardOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<string | null>(null);
  const [confirmDeletePurchase, setConfirmDeletePurchase] = useState<string | null>(null);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  const [cardForm, setCardForm] = useState<typeof emptyCard>(emptyCard);
  const [purchaseForm, setPurchaseForm] = useState<typeof emptyPurchase>(emptyPurchase);

  const today = useMemo(() => new Date(), []);

  // ============ Agregações ============
  const stats = useMemo(() => {
    let totalLimite = 0;
    let totalFatura = 0;
    let totalFuturo = 0;
    let proxVencimento: Date | null = null;

    for (const c of cards) {
      totalLimite += Number(c.limite) || 0;
      const { vencimento } = faturaAtual(c, today);
      if (!proxVencimento || vencimento < proxVencimento) proxVencimento = vencimento;
    }
    // Fatura atual = soma das parcelas com vencimento na próxima fatura (próximo vencimento por cartão)
    const faturasPorCartao = new Map<string, number>(); // card_id -> valor fatura atual
    const utilizadoPorCartao = new Map<string, number>(); // soma parcelas pendentes (futuras) - aproxima o "limite usado"

    for (const inst of installments) {
      const compra = purchases.find(p => p.id === inst.card_purchase_id);
      if (!compra) continue;
      const card = cards.find(c => c.id === compra.card_id);
      if (!card) continue;
      const d = new Date(inst.date);
      const { vencimento } = faturaAtual(card, today);
      // Fatura atual: parcelas cuja data corresponde ao vencimento desse mês
      if (d.getFullYear() === vencimento.getFullYear() && d.getMonth() === vencimento.getMonth()) {
        faturasPorCartao.set(card.id, (faturasPorCartao.get(card.id) ?? 0) + Number(inst.amount));
        totalFatura += Number(inst.amount);
      }
      // Futuro: parcelas após a fatura atual
      if (d > vencimento) {
        totalFuturo += Number(inst.amount);
      }
      // Limite utilizado: tudo que ainda vai entrar (a partir do início desse mês)
      const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
      if (d >= inicioMes) {
        utilizadoPorCartao.set(card.id, (utilizadoPorCartao.get(card.id) ?? 0) + Number(inst.amount));
      }
    }

    return { totalLimite, totalFatura, totalFuturo, proxVencimento, faturasPorCartao, utilizadoPorCartao };
  }, [cards, installments, purchases, today]);

  const totalDisponivel = Math.max(0, stats.totalLimite - Array.from(stats.utilizadoPorCartao.values()).reduce((a, b) => a + b, 0));

  // ============ Inteligência contextual de crédito ============
  const creditInsights = useMemo(
    () => buildCreditInsights({ cards, purchases, installments, today }),
    [cards, purchases, installments, today],
  );

  // ============ Próximas parcelas (próximos 90 dias) ============
  const proximasParcelas = useMemo(() => {
    const limit = new Date(today); limit.setDate(limit.getDate() + 90);
    return installments
      .map(inst => {
        const compra = purchases.find(p => p.id === inst.card_purchase_id);
        const card = compra ? cards.find(c => c.id === compra.card_id) : null;
        return { inst, compra, card, date: new Date(inst.date) };
      })
      .filter(x => x.compra && x.card && x.date >= today && x.date <= limit)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [installments, purchases, cards, today]);

  // ============ Handlers ============
  function openNewCard() {
    setEditingCard(null);
    setCardForm(emptyCard);
    setCardOpen(true);
  }

  function openEditCard(c: CreditCard) {
    setEditingCard(c);
    setCardForm({
      nome: c.nome,
      bandeira: c.bandeira,
      cor: c.cor,
      limite: String(c.limite),
      fechamento_dia: c.fechamento_dia,
      vencimento_dia: c.vencimento_dia,
      ativo: c.ativo,
    });
    setCardOpen(true);
  }

  async function submitCard() {
    if (!cardForm.nome.trim()) return;
    const payload = {
      nome: cardForm.nome.trim(),
      bandeira: cardForm.bandeira,
      cor: cardForm.cor,
      limite: parseFloat(String(cardForm.limite).replace(',', '.')) || 0,
      fechamento_dia: cardForm.fechamento_dia,
      vencimento_dia: cardForm.vencimento_dia,
      ativo: cardForm.ativo,
    };
    if (editingCard) await updateCard.mutateAsync({ id: editingCard.id, ...payload });
    else await createCard.mutateAsync(payload);
    setCardOpen(false);
  }

  function openNewPurchase(cardId?: string) {
    setPurchaseForm({ ...emptyPurchase, card_id: cardId ?? cards[0]?.id ?? '' });
    setPurchaseOpen(true);
  }

  async function submitPurchase() {
    if (!purchaseForm.card_id || !purchaseForm.descricao.trim() || !purchaseForm.valor_total) return;
    await createPurchase.mutateAsync({
      card_id: purchaseForm.card_id,
      descricao: purchaseForm.descricao.trim(),
      valor_total: parseFloat(String(purchaseForm.valor_total).replace(',', '.')) || 0,
      parcelas: purchaseForm.parcelas,
      data_compra: purchaseForm.data_compra,
      categoria: purchaseForm.categoria || null,
      cofrinho_id: null,
    });
    setPurchaseOpen(false);
  }

  // ============ Render ============
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Central de Crédito</h1>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
            Suas faturas, parcelas e limite com clareza total.
          </p>
        </div>
        <Button onClick={openNewCard} size="sm" className="shrink-0 h-10 rounded-full px-4">
          <Plus className="h-4 w-4 mr-1.5" /> Cartão
        </Button>
      </header>

      {/* Empty state */}
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          eyebrow="Comece por aqui"
          title="Sua Central de Crédito está pronta"
          description="Adicione seu primeiro cartão para acompanhar faturas, parcelas e prever os próximos meses com clareza."
          hints={[
            'Faturas atualizadas automaticamente a cada compra',
            'Parcelas projetadas nos meses seguintes',
            'Visão única do limite disponível em todos os cartões',
          ]}
          primaryAction={{ label: 'Adicionar primeiro cartão', onClick: openNewCard, icon: Plus }}
          tone="primary"
        />
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <KpiCard
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              label="Fatura atual"
              value={formatCurrency(stats.totalFatura)}
              hint={stats.proxVencimento ? `Próx: ${relativeLabel(stats.proxVencimento)}` : 'Sem fatura'}
              tone="primary"
            />
            <KpiCard
              icon={<Wallet className="h-3.5 w-3.5" />}
              label="Limite disponível"
              value={formatCurrency(totalDisponivel)}
              hint={`de ${formatCurrency(stats.totalLimite)}`}
              tone="success"
            />
            <KpiCard
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Próximo vencimento"
              value={stats.proxVencimento ? stats.proxVencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
              hint={stats.proxVencimento ? relativeLabel(stats.proxVencimento) : ''}
              tone="warning"
            />
            <KpiCard
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
              label="Parcelado futuro"
              value={formatCurrency(stats.totalFuturo)}
              hint="Próximas faturas"
              tone="muted"
            />
          </section>

          {/* Inteligência contextual de crédito */}
          <CreditInsightsPanel insights={creditInsights} />

          {/* Lista de cartões */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Seus cartões</h2>
              <Button onClick={() => openNewPurchase()} size="sm" variant="ghost" className="h-8 text-xs rounded-full text-primary">
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova compra
              </Button>
            </div>

            <div className="grid gap-3">
              {cards.map(card => {
                const fatura = stats.faturasPorCartao.get(card.id) ?? 0;
                const utilizado = stats.utilizadoPorCartao.get(card.id) ?? 0;
                const disponivel = Math.max(0, Number(card.limite) - utilizado);
                const pct = card.limite > 0 ? Math.min(100, (utilizado / Number(card.limite)) * 100) : 0;
                const { vencimento } = faturaAtual(card, today);
                return (
                  <CardItem
                    key={card.id}
                    card={card}
                    fatura={fatura}
                    utilizado={utilizado}
                    disponivel={disponivel}
                    pct={pct}
                    vencimento={vencimento}
                    onAddPurchase={() => openNewPurchase(card.id)}
                    onEdit={() => openEditCard(card)}
                    onDelete={() => setConfirmDeleteCard(card.id)}
                    onOpen={() => setDetailCardId(card.id)}
                  />
                );
              })}
            </div>
          </section>

          {/* Próximas parcelas */}
          {proximasParcelas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                Próximas parcelas
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border/50">
                  {proximasParcelas.map(({ inst, compra, card, date }) => (
                    <div key={inst.id} className="flex items-center gap-3 p-3.5">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${card!.cor}20`, color: card!.cor }}
                      >
                        <CreditCardIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{compra!.descricao}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {card!.nome} • Parcela {inst.parcela_num}/{compra!.parcelas} • {relativeLabel(date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(inst.amount))}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Compras recentes */}
          {purchases.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                Compras
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border/50">
                  {purchases.slice(0, 12).map(p => {
                    const card = cards.find(c => c.id === p.card_id);
                    if (!card) return null;
                    const parcelaValor = Number(p.valor_total) / p.parcelas;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3.5">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${card.cor}20`, color: card.cor }}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.descricao}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {card.nome} • {p.parcelas > 1 ? `${p.parcelas}x ${formatCurrency(parcelaValor)}` : 'à vista'} • {new Date(p.data_compra).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{formatCurrency(Number(p.valor_total))}</p>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setEditingPurchaseId(p.id)}
                            aria-label="Editar compra"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeletePurchase(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      {/* ============ Card Dialog ============ */}
      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar cartão' : 'Novo cartão'}</DialogTitle>
            <DialogDescription>
              Configure limite e datas de fechamento e vencimento da fatura.
            </DialogDescription>
          </DialogHeader>

          {/* Preview */}
          <div
            className="rounded-2xl p-4 mb-2 text-white shadow-lg relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${cardForm.cor}, ${cardForm.cor}cc)` }}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-10 top-8 w-20 h-20 rounded-full bg-white/5" />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Cartão</p>
                <p className="font-semibold text-base mt-0.5 truncate max-w-[10rem]">{cardForm.nome || 'Nome do cartão'}</p>
              </div>
              <CreditCardIcon className="h-5 w-5 opacity-80" />
            </div>
            <div className="mt-6 flex items-end justify-between relative">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-80">Limite</p>
                <p className="font-bold text-lg tabular-nums">
                  {formatCurrency(parseFloat(String(cardForm.limite).replace(',', '.')) || 0)}
                </p>
              </div>
              <p className="text-[11px] uppercase tracking-wider opacity-80">{cardForm.bandeira}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={cardForm.nome}
                onChange={e => setCardForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Nubank"
                className="h-11"
                maxLength={32}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bandeira</Label>
                <Select value={cardForm.bandeira} onValueChange={v => setCardForm(f => ({ ...f, bandeira: v }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANDEIRAS.map(b => <SelectItem key={b.v} value={b.v}>{b.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Limite (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={cardForm.limite}
                  onChange={e => setCardForm(f => ({ ...f, limite: e.target.value }))}
                  placeholder="0,00"
                  className="h-11 tabular-nums"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CARD_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardForm(f => ({ ...f, cor: c }))}
                    className={`h-8 w-8 rounded-full transition-all ${cardForm.cor === c ? 'ring-2 ring-offset-2 ring-foreground/60 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DayPicker
                label="Fechamento"
                value={cardForm.fechamento_dia}
                onChange={n => setCardForm(f => ({ ...f, fechamento_dia: n }))}
              />
              <DayPicker
                label="Vencimento"
                value={cardForm.vencimento_dia}
                onChange={n => setCardForm(f => ({ ...f, vencimento_dia: n }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCardOpen(false)}>Cancelar</Button>
            <Button
              onClick={submitCard}
              disabled={!cardForm.nome.trim() || createCard.isPending || updateCard.isPending}
            >
              {(createCard.isPending || updateCard.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCard ? 'Salvar' : 'Adicionar cartão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Purchase Dialog ============ */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova compra no cartão</DialogTitle>
            <DialogDescription>
              As parcelas serão lançadas automaticamente nos meses certos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <Select value={purchaseForm.card_id} onValueChange={v => setPurchaseForm(f => ({ ...f, card_id: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cards.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={purchaseForm.descricao}
                onChange={e => setPurchaseForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Notebook"
                className="h-11"
                maxLength={48}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor total (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={purchaseForm.valor_total}
                  onChange={e => setPurchaseForm(f => ({ ...f, valor_total: e.target.value }))}
                  placeholder="0,00"
                  className="h-11 tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Parcelas</Label>
                <Select value={String(purchaseForm.parcelas)} onValueChange={v => setPurchaseForm(f => ({ ...f, parcelas: Number(v) }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARCELAS_OPTS.map(n => <SelectItem key={n} value={String(n)}>{n === 1 ? 'À vista' : `${n}x`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data da compra</Label>
              <Input
                type="date"
                value={purchaseForm.data_compra}
                onChange={e => setPurchaseForm(f => ({ ...f, data_compra: e.target.value || todayISO() }))}
                className="h-11"
                max={todayISO()}
              />
            </div>

            {/* Preview de impacto */}
            {purchaseForm.valor_total && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Impacto previsto
                </p>
                <p className="text-foreground">
                  {purchaseForm.parcelas}x de{' '}
                  <span className="font-semibold tabular-nums">
                    {formatCurrency((parseFloat(String(purchaseForm.valor_total).replace(',', '.')) || 0) / purchaseForm.parcelas)}
                  </span>
                  {purchaseForm.parcelas > 1 && ' nos próximos meses'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>Cancelar</Button>
            <Button
              onClick={submitPurchase}
              disabled={!purchaseForm.card_id || !purchaseForm.descricao.trim() || !purchaseForm.valor_total || createPurchase.isPending}
            >
              {createPurchase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Confirm dialogs ============ */}
      <AlertDialog open={!!confirmDeleteCard} onOpenChange={o => !o && setConfirmDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as compras e parcelas dos meses ainda abertos serão removidas.
              Parcelas em meses já fechados são preservadas no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDeleteCard) await deleteCard.mutateAsync(confirmDeleteCard);
                setConfirmDeleteCard(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeletePurchase} onOpenChange={o => !o && setConfirmDeletePurchase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
            <AlertDialogDescription>
              As parcelas em meses ainda abertos serão removidas. Parcelas em meses já fechados permanecem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDeletePurchase) await deletePurchase.mutateAsync(confirmDeletePurchase);
                setConfirmDeletePurchase(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ Detail Sheet ============ */}
      <CardDetailSheet
        open={!!detailCardId}
        onOpenChange={(o) => !o && setDetailCardId(null)}
        card={cards.find(c => c.id === detailCardId) ?? null}
        purchases={purchases}
        installments={installments}
        onAddPurchase={(cid) => { setDetailCardId(null); openNewPurchase(cid); }}
        onDeletePurchase={(pid) => setConfirmDeletePurchase(pid)}
      />

      <EditCardPurchaseDialog
        open={!!editingPurchaseId}
        onOpenChange={(o) => !o && setEditingPurchaseId(null)}
        purchase={purchases.find(p => p.id === editingPurchaseId) ?? null}
        cards={cards}
      />
    </div>
  );
}

/* ================== Subcomponents ================== */

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
}
function KpiCard({ icon, label, value, hint, tone }: KpiProps) {
  const toneClasses: Record<KpiProps['tone'], string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${toneClasses[tone]}`}>{icon}</span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</span>
        </div>
        <p className="text-lg sm:text-xl font-bold tabular-nums leading-tight truncate">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

interface CardItemProps {
  card: CreditCard;
  fatura: number;
  utilizado: number;
  disponivel: number;
  pct: number;
  vencimento: Date;
  onAddPurchase: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}
function CardItem({ card, fatura, utilizado, disponivel, pct, vencimento, onAddPurchase, onEdit, onDelete, onOpen }: CardItemProps) {
  const isHigh = pct >= 80;
  return (
    <Card className="overflow-hidden cursor-pointer transition-transform active:scale-[0.99]" onClick={onOpen}>
      <div
        className="p-4 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${card.cor}, ${card.cor}cc)` }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute right-4 bottom-2 w-20 h-20 rounded-full bg-white/5" />
        <div className="flex items-start justify-between relative">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest opacity-80">{card.bandeira}</p>
            <p className="font-bold text-base mt-0.5 truncate">{card.nome}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-8 w-8 text-white hover:bg-white/15 hover:text-white">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 text-white hover:bg-white/15 hover:text-white">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between relative gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Fatura atual</p>
            <p className="font-bold text-xl tabular-nums truncate">{formatCurrency(fatura)}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Vence</p>
            <p className="font-semibold text-sm">{relativeLabel(vencimento)}</p>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Limite usado</span>
            <span className={`font-semibold tabular-nums ${isHigh ? 'text-destructive' : 'text-foreground'}`}>
              {formatCurrency(utilizado)} <span className="text-muted-foreground font-normal">/ {formatCurrency(Number(card.limite))}</span>
            </span>
          </div>
          <Progress
            value={pct}
            className={`h-1.5 ${isHigh ? '[&>*]:bg-destructive' : ''}`}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Disponível {formatCurrency(disponivel)}</span>
            <span>Fech. dia {card.fechamento_dia} • Venc. dia {card.vencimento_dia}</span>
          </div>
        </div>

        {isHigh && (
          <div className="flex items-start gap-2 text-[11px] text-destructive bg-destructive/5 rounded-lg p-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Você já comprometeu mais de 80% do limite. Considere pausar novas compras.</span>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onAddPurchase(); }} className="w-full h-9 rounded-lg">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova compra neste cartão
        </Button>
      </CardContent>
    </Card>
  );
}

function DayPicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span>Dia {value}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-[min(20rem,calc(100vw-2rem))] p-3 rounded-2xl shadow-elevated"
        >
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Selecione o dia</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(n => {
              const active = n === value;
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => onChange(n)}
                  className={`h-9 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-foreground hover:bg-muted'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}