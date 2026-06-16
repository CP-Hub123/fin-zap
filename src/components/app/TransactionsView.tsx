import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Copy, Trash2, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Wallet, Repeat, Loader2 } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';
import type { Cofrinho } from '@/hooks/useCofrinhos';
import type { TablesInsert } from '@/integrations/supabase/types';
import { getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';
import { EmptyState } from './EmptyState';

interface TransactionsViewProps {
  transactions: Transaction[];
  monthId: string;
  isClosed: boolean;
  isLocked?: boolean;
  cofrinhos: Cofrinho[];
  onAdd: (data: TablesInsert<'transactions'>) => Promise<any>;
  onUpdate: (data: Partial<Transaction> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const emptyForm = { name: '', amount: '', cofrinho_id: '', date: new Date().toISOString().split('T')[0], status: 'realized' as 'planned' | 'realized', is_fixed: false, recurrence: 'none' as 'none' | 'monthly' };

export const TransactionsView = ({ transactions, monthId, isClosed, isLocked = false, cofrinhos, onAdd, onUpdate, onDelete }: TransactionsViewProps) => {
  // disabled = edição bloqueada (mês fechado OU assinatura inativa)
  const disabled = isClosed || isLocked;
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = transactions.filter(t => t.type === activeTab);
  const cofrinhoById = (id: string) => cofrinhos.find(c => c.id === id);

  // Receitas só podem ser vinculadas a Meta/Reserva. Mensal = orçamento (sem dinheiro).
  const cofrinhosForType = activeTab === 'income'
    ? cofrinhos.filter(c => c.tipo !== 'mensal')
    : cofrinhos;

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setForm({ name: t.name, amount: String(t.amount), cofrinho_id: (t as any).cofrinho_id ?? '', date: t.date, status: t.status, is_fixed: t.is_fixed, recurrence: t.recurrence });
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: Transaction) => {
    await onAdd({
      month_id: monthId, type: t.type, name: `${t.name} (cópia)`, amount: Number(t.amount),
      date: t.date, status: t.status, is_fixed: t.is_fixed, recurrence: t.recurrence,
      cofrinho_id: (t as any).cofrinho_id,
    } as any);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.cofrinho_id) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate({ id: editingId, name: form.name, amount: parseFloat(form.amount), cofrinho_id: form.cofrinho_id, date: form.date, status: form.status as any, is_fixed: form.is_fixed, recurrence: form.recurrence as any } as any);
      } else {
        await onAdd({ month_id: monthId, type: activeTab, name: form.name, amount: parseFloat(form.amount), cofrinho_id: form.cofrinho_id, date: form.date, status: form.status as any, is_fixed: form.is_fixed, recurrence: form.recurrence as any } as any);
      }
      setDialogOpen(false);
    } catch {} finally { setSaving(false); }
  };

  const noCofrinhos = cofrinhos.length === 0;

  // Preview de impacto financeiro (apenas para despesa em cofrinho selecionado)
  const impactPreview = (() => {
    if (activeTab !== 'expense' || !form.cofrinho_id || !form.amount) return null;
    const valor = parseFloat(form.amount);
    if (!valor || valor <= 0) return null;
    const c = cofrinhoById(form.cofrinho_id);
    if (!c) return null;

    if (c.tipo === 'reserva' && Number(c.custo_mensal) > 0) {
      const novoSaldo = Math.max(0, Number(c.saldo) - valor);
      const meses = novoSaldo / Number(c.custo_mensal);
      return {
        text: `Sua reserva cairá para ${meses.toFixed(1)} ${meses === 1 ? 'mês' : 'meses'} de proteção.`,
        level: meses < 3 ? 'critical' : meses < 6 ? 'attention' : 'safe',
      } as const;
    }

    const orc = Number(c.orcamento_mensal);
    if (c.tipo === 'mensal' && orc > 0) {
      const novoGasto = Number(c.gasto_mes) + valor;
      const pct = Math.round((novoGasto / orc) * 100);
      const consumoTxt = `Esse gasto consumirá ${Math.round((valor / orc) * 100)}% do "${c.nome}".`;
      const restante = orc - novoGasto;
      const status = getStatusLevel(pct);
      return {
        text: `${consumoTxt} ${restante < 0 ? `Estouro de ${formatCurrency(Math.abs(restante))}.` : `Sobrarão ${formatCurrency(restante)}.`}`,
        level: status,
      } as const;
    }

    if (c.tipo === 'meta' && Number(c.meta_valor) > 0) {
      return {
        text: `O cofrinho "${c.nome}" ficará abaixo da meta ideal.`,
        level: 'attention' as const,
      };
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* Toggle tabs + Add button */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={activeTab === 'income' ? 'default' : 'outline'} onClick={() => setActiveTab('income')} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
          Receitas ({transactions.filter(t => t.type === 'income').length})
        </Button>
        <Button size="sm" variant={activeTab === 'expense' ? 'default' : 'outline'} onClick={() => setActiveTab('expense')} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
          Despesas ({transactions.filter(t => t.type === 'expense').length})
        </Button>
        {!disabled && (
          <Button onClick={openNew} size="sm" className="w-full sm:w-auto sm:ml-auto min-h-[44px] sm:min-h-0" disabled={noCofrinhos}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {noCofrinhos && !disabled && (
        <div className="p-3 rounded-lg bg-primary/10 text-sm text-primary">
          Crie um cofrinho na etapa <strong>Planejamento</strong> antes de adicionar transações.
        </div>
      )}

      {isClosed ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Badge variant="secondary">🔒 Mês fechado</Badge>
          <span className="text-sm text-muted-foreground">Edição bloqueada</span>
        </div>
      ) : isLocked ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
          <Badge variant="destructive">🔒 Plano expirado</Badge>
          <span className="text-sm text-destructive/80">Ative seu plano para voltar a editar</span>
        </div>
      ) : null}

      {/* Mobile cards / empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={activeTab === 'income' ? ArrowUpRight : ArrowDownRight}
          eyebrow={activeTab === 'income' ? 'Suas entradas' : 'Seus gastos'}
          title={activeTab === 'income' ? 'Registre sua primeira receita' : 'Registre sua primeira despesa'}
          description={
            activeTab === 'income'
              ? 'Salário, freelas, vendas — toda entrada conta para o FinZap projetar seu mês com precisão.'
              : 'Lance um gasto para começar a entender seu padrão e ver o impacto direto em cada cofrinho.'
          }
          primaryAction={!disabled && !noCofrinhos ? { label: 'Adicionar agora', onClick: openNew, icon: Plus } : undefined}
          tone={activeTab === 'income' ? 'success' : 'primary'}
          compact
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="border-0 shadow-sm" onClick={() => !disabled && openEdit(t)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {(t as any).cofrinho_id && cofrinhoById((t as any).cofrinho_id) && (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cofrinhoById((t as any).cofrinho_id)!.cor }} />
                        )}
                        {cofrinhoById((t as any).cofrinho_id)?.nome ?? '—'}
                      </Badge>
                      <Badge variant={t.status === 'realized' ? 'default' : 'secondary'} className="text-xs">
                        {t.status === 'realized' ? 'Realizado' : 'Previsto'}
                      </Badge>
                      {t.is_fixed && <Badge variant="secondary" className="text-xs">Fixa</Badge>}
                      {(t as any).source === 'recurring' && (
                        <Badge variant="secondary" className="text-xs">🔁 Recorrente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base" style={{ color: t.type === 'income' ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                      {formatCurrency(Number(t.amount))}
                    </p>
                    {!disabled && (
                      <div className="flex gap-0.5 mt-2 justify-end" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDuplicate(t)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'income'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}>
                {activeTab === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight">
                  {editingId ? 'Editar' : 'Nova'} {activeTab === 'income' ? 'receita' : 'despesa'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Preencha os campos abaixo
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Hero: campo valor */}
            <div className="rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/50 px-4 py-4">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor</Label>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className={`text-xl font-medium ${
                  activeTab === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-3xl font-semibold tracking-tight tabular-nums placeholder:text-muted-foreground/40 focus:ring-0"
                  autoFocus={!editingId}
                />
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={activeTab === 'income' ? 'Ex: Salário' : 'Ex: Mercado'}
              />
            </div>

            {/* Cofrinho */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Cofrinho</Label>
              <Select value={form.cofrinho_id} onValueChange={v => setForm(f => ({ ...f, cofrinho_id: v }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um cofrinho" /></SelectTrigger>
                <SelectContent>
                  {cofrinhosForType.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTab === 'income' && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Receitas podem ser vinculadas apenas a cofrinhos do tipo <strong>Meta</strong> ou <strong>Reserva</strong>. Cofrinhos mensais controlam apenas orçamento.
                </p>
              )}
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> Data</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Status segmented */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
                {([
                  { v: 'realized', label: 'Realizado' },
                  { v: 'planned', label: 'Previsto' },
                ] as const).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: opt.v }))}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      form.status === opt.v
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fixa toggle */}
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_fixed: !f.is_fixed }))}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">Transação fixa</p>
                  <p className="text-xs text-muted-foreground truncate">Repete todo mês</p>
                </div>
              </div>
              <div className={`h-6 w-10 rounded-full p-0.5 transition-colors shrink-0 ${
                form.is_fixed ? 'bg-primary' : 'bg-muted'
              }`}>
                <div className={`h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                  form.is_fixed ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </button>

            {impactPreview && (
              <div className={`rounded-xl p-3 text-xs border-l-2 ${
                impactPreview.level === 'safe' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' :
                impactPreview.level === 'attention' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300' :
                impactPreview.level === 'critical' ? 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300' :
                'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300'
              }`}>
                <p className="font-medium mb-0.5">Impacto desta decisão</p>
                <p className="leading-relaxed">{impactPreview.text}</p>
              </div>
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border/50 bg-card/60 backdrop-blur flex-row gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-11">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.amount || !form.cofrinho_id}
              className="flex-1 h-11"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="min-h-[44px]" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
