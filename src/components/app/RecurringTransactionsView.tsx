import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/constants';
import {
  Plus, Pencil, Trash2, Repeat, ArrowDownRight, ArrowUpRight,
  Sparkles, Calendar as CalendarIcon, Wallet, Loader2, Pause, Play, Zap,
} from 'lucide-react';
import { useRecurringTransactions, type RecurringTransaction } from '@/hooks/useRecurringTransactions';
import type { Cofrinho } from '@/hooks/useCofrinhos';

interface Props {
  cofrinhos: Cofrinho[];
  isClosed: boolean;
}

const empty = {
  nome: '',
  valor: '',
  tipo: 'despesa' as 'despesa' | 'receita',
  cofrinho_id: '',
  dia_do_mes: '5',
  ativo: true,
  lancar_se_dia_passou: false,
};

const ordinal = (n: number) => {
  if (n >= 28) return `dia ${n}`;
  return `dia ${n}`;
};
const humanFreq = (dia: number) =>
  dia >= 28 ? `Todo ${ordinal(dia)} (ou último dia do mês)` : `Mensalmente, todo ${ordinal(dia)}`;

const fmtNextDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const diffDays = (iso?: string | null) => {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next = new Date(iso + 'T00:00:00');
  return Math.round((next.getTime() - today.getTime()) / 86400000);
};

const relativeLabel = (iso?: string | null) => {
  const d = diffDays(iso);
  if (d === null) return '';
  if (d <= 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d < 7) return `Em ${d} dias`;
  if (d < 14) return 'Próxima semana';
  if (d < 31) return `Em ${d} dias`;
  return fmtNextDate(iso);
};

export const RecurringTransactionsView = ({ cofrinhos, isClosed }: Props) => {
  const { recorrencias, isLoading, create, update, remove } = useRecurringTransactions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cofrinhoById = (id: string) => cofrinhos.find(c => c.id === id);
  const noCofrinhos = cofrinhos.length === 0;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: RecurringTransaction) => {
    setEditing(r);
    setForm({
      nome: r.nome,
      valor: String(r.valor),
      tipo: r.tipo as 'despesa' | 'receita',
      cofrinho_id: r.cofrinho_id,
      dia_do_mes: String(r.dia_do_mes),
      ativo: r.ativo,
      lancar_se_dia_passou: (r as any).lancar_se_dia_passou ?? false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.valor || !form.cofrinho_id) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        valor: parseFloat(form.valor),
        tipo: form.tipo,
        cofrinho_id: form.cofrinho_id,
        dia_do_mes: Math.max(1, Math.min(31, parseInt(form.dia_do_mes) || 1)),
        ativo: form.ativo,
        lancar_se_dia_passou: form.lancar_se_dia_passou,
      };
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      setOpen(false);
    } finally { setSaving(false); }
  };

  const toggleAtivo = (r: RecurringTransaction) => {
    update.mutate({ id: r.id, ativo: !r.ativo });
  };

  // KPIs do mês
  const kpis = useMemo(() => {
    const ativas = recorrencias.filter(r => r.ativo);
    const entradas = ativas.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0);
    const saidas = ativas.filter(r => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0);
    const proximaIso = ativas
      .map(r => (r as any).proxima_execucao as string | null)
      .filter(Boolean)
      .sort()[0] ?? null;
    return { entradas, saidas, ativasCount: ativas.length, proximaIso };
  }, [recorrencias]);

  // Agrupamento Hoje / Esta semana / Próximo mês / Pausadas
  const grupos = useMemo(() => {
    const hoje: RecurringTransaction[] = [];
    const semana: RecurringTransaction[] = [];
    const mes: RecurringTransaction[] = [];
    const futuro: RecurringTransaction[] = [];
    const pausadas: RecurringTransaction[] = [];
    for (const r of recorrencias) {
      if (!r.ativo) { pausadas.push(r); continue; }
      const d = diffDays((r as any).proxima_execucao);
      if (d === null) { futuro.push(r); continue; }
      if (d <= 0) hoje.push(r);
      else if (d <= 7) semana.push(r);
      else if (d <= 31) mes.push(r);
      else futuro.push(r);
    }
    const sortByNext = (a: RecurringTransaction, b: RecurringTransaction) =>
      String((a as any).proxima_execucao ?? '').localeCompare(String((b as any).proxima_execucao ?? ''));
    return {
      hoje: hoje.sort(sortByNext),
      semana: semana.sort(sortByNext),
      mes: mes.sort(sortByNext),
      futuro: futuro.sort(sortByNext),
      pausadas,
    };
  }, [recorrencias]);

  const renderItem = (r: RecurringTransaction) => {
    const cof = cofrinhoById(r.cofrinho_id);
    const isReceita = r.tipo === 'receita';
    const proximaIso = (r as any).proxima_execucao as string | null;
    return (
      <Card key={r.id} className="border-border/60 shadow-none hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              isReceita ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {isReceita ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium truncate">{r.nome}</p>
                <p className={`font-semibold tabular-nums shrink-0 ${
                  isReceita ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isReceita ? '+' : '−'} {formatCurrency(Number(r.valor))}
                </p>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {humanFreq(r.dia_do_mes)}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                {cof && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cof.cor }} />
                    <span className="truncate">{cof.nome}</span>
                  </span>
                )}
                {r.ativo ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    {relativeLabel(proximaIso)} · {fmtNextDate(proximaIso)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                    <Pause className="h-3 w-3" /> Pausada
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isClosed && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => toggleAtivo(r)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                {r.ativo ? 'Ativa' : 'Pausada'}
              </button>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const Section = ({ title, items }: { title: string; items: RecurringTransaction[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
        </div>
        <div className="space-y-2">{items.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </span>
            Automações financeiras
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Seus lançamentos automáticos organizados.</p>
        </div>
        {!isClosed && (
          <Button size="sm" onClick={openNew} disabled={noCofrinhos} className="h-10 shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        )}
      </div>

      {noCofrinhos && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary">
          Crie um cofrinho antes de cadastrar uma automação.
        </div>
      )}

      {/* KPIs */}
      {!noCofrinhos && (
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Entradas</span>
              </div>
              <p className="text-base font-semibold tabular-nums truncate">{formatCurrency(kpis.entradas)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-1">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Saídas</span>
              </div>
              <p className="text-base font-semibold tabular-nums truncate">{formatCurrency(kpis.saidas)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Próxima</span>
              </div>
              <p className="text-base font-semibold tabular-nums truncate">
                {kpis.proximaIso ? fmtNextDate(kpis.proximaIso) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpis.proximaIso ? relativeLabel(kpis.proximaIso) : 'sem agendamento'}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Repeat className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Ativas</span>
              </div>
              <p className="text-base font-semibold tabular-nums">
                {kpis.ativasCount}
                <span className="text-xs font-normal text-muted-foreground"> / {recorrencias.length}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Listagem */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : recorrencias.length === 0 ? (
        <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-border/60">
          <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Repeat className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhuma automação ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre lançamentos que se repetem todo mês para ganhar previsibilidade.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Section title="Hoje" items={grupos.hoje} />
          <Section title="Esta semana" items={grupos.semana} />
          <Section title="Próximo mês" items={grupos.mes} />
          <Section title="Mais à frente" items={grupos.futuro} />
          <Section title="Pausadas" items={grupos.pausadas} />
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Repeat className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight">
                  {editing ? 'Editar automação' : 'Nova automação'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Lança a transação automaticamente todo mês.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Tipo segmented */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
                {([
                  { v: 'despesa' as const, label: 'Despesa', icon: ArrowDownRight, color: 'text-rose-600 dark:text-rose-400' },
                  { v: 'receita' as const, label: 'Receita', icon: ArrowUpRight, color: 'text-emerald-600 dark:text-emerald-400' },
                ]).map(t => {
                  const Icon = t.icon;
                  const active = form.tipo === t.v;
                  return (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: t.v }))}
                      className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium transition-all ${
                        active ? `bg-background shadow-sm ${t.color}` : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Valor hero */}
            <div className="rounded-2xl bg-muted/40 dark:bg-muted/20 border border-border/50 px-4 py-4">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor</Label>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className={`text-xl font-medium ${form.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-3xl font-semibold tracking-tight tabular-nums placeholder:text-muted-foreground/40 focus:ring-0"
                />
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder={form.tipo === 'receita' ? 'Ex: Salário' : 'Ex: Aluguel'}
                maxLength={60}
              />
            </div>

            {/* Cofrinho */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Cofrinho</Label>
              <Select value={form.cofrinho_id} onValueChange={v => setForm(f => ({ ...f, cofrinho_id: v }))}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um cofrinho" /></SelectTrigger>
                <SelectContent>
                  {cofrinhos.map(c => (
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

            {/* Frequência */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> Quando lançar</Label>
              <Select value={form.dia_do_mes} onValueChange={v => setForm(f => ({ ...f, dia_do_mes: v }))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n >= 28 ? `Dia ${n} (ou último dia do mês)` : `Todo dia ${n} do mês`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-0.5">
                <Sparkles className="h-3 w-3" /> {humanFreq(parseInt(form.dia_do_mes) || 1)}
              </p>
            </div>

            {/* Lançar este mês mesmo se passou */}
            {!editing && (() => {
              const hoje = new Date().getDate();
              const dia = parseInt(form.dia_do_mes) || 1;
              if (dia >= hoje) return null;
              return (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, lancar_se_dia_passou: !f.lancar_se_dia_passou }))}
                  className="w-full flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 hover:bg-accent/40 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Lançar ainda este mês?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O dia {dia} já passou. Se ativado, lança hoje. Senão, só no próximo mês.
                    </p>
                  </div>
                  <Switch
                    checked={form.lancar_se_dia_passou}
                    onCheckedChange={v => setForm(f => ({ ...f, lancar_se_dia_passou: v }))}
                  />
                </button>
              );
            })()}

            {/* Ativa */}
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {form.ativo
                  ? <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  : <Pause className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{form.ativo ? 'Automação ativa' : 'Automação pausada'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {form.ativo ? 'Será lançada automaticamente.' : 'Não vai gerar transações.'}
                  </p>
                </div>
              </div>
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
            </button>
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border/50 bg-card/60 backdrop-blur flex-row gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-11">Cancelar</Button>
            <Button
              onClick={save}
              disabled={saving || !form.nome.trim() || !form.valor || !form.cofrinho_id}
              className="flex-1 h-11"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando</> : (editing ? 'Salvar' : 'Criar automação')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta automação?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Apenas as <strong>próximas execuções</strong> serão interrompidas.</span>
              <span className="block text-xs">As transações já lançadas permanecem no seu histórico financeiro.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 h-11 mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteId) { await remove.mutateAsync(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};