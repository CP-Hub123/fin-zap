import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, CalendarClock, CheckCircle2, Ban, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/constants';
import {
  useFinancialCommitments,
  type FinancialCommitment,
  type CommitmentType,
} from '@/hooks/useFinancialCommitments';
import { EmptyState } from './EmptyState';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

const isOverdue = (c: FinancialCommitment) =>
  c.status === 'pending' && new Date(c.due_date + 'T23:59:59') < new Date();

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

interface FormState {
  title: string;
  description: string;
  type: CommitmentType;
  amount: string;
  due_date: string;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  type: 'payable',
  amount: '',
  due_date: new Date().toISOString().slice(0, 10),
});

export const CommitmentsView = () => {
  const { commitments, isLoading, create, update, remove, conclude, cancel } =
    useFinancialCommitments();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCommitment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [detail, setDetail] = useState<FinancialCommitment | null>(null);
  const [confirmConclude, setConfirmConclude] = useState<FinancialCommitment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FinancialCommitment | null>(null);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    let receivable = 0, payable = 0, next7 = 0, overdue = 0;
    for (const c of commitments) {
      if (c.status !== 'pending') continue;
      const d = new Date(c.due_date + 'T00:00:00');
      if (c.type === 'receivable') receivable += Number(c.amount);
      else payable += Number(c.amount);
      if (d < today) overdue += 1;
      else if (d <= in7) next7 += 1;
    }
    return { receivable, payable, next7, overdue };
  }, [commitments]);

  const groups = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    const overdueArr: FinancialCommitment[] = [];
    const soon: FinancialCommitment[] = [];
    const future: FinancialCommitment[] = [];
    const done: FinancialCommitment[] = [];
    for (const c of commitments) {
      if (c.status !== 'pending') { done.push(c); continue; }
      const d = new Date(c.due_date + 'T00:00:00');
      if (d < today) overdueArr.push(c);
      else if (d <= in7) soon.push(c);
      else future.push(c);
    }
    return { overdueArr, soon, future, done };
  }, [commitments]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (c: FinancialCommitment) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? '',
      type: c.type as CommitmentType,
      amount: String(c.amount),
      due_date: c.due_date,
    });
    setDetail(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Informe um título'); return; }
    const amt = Number(form.amount.replace(',', '.'));
    if (!amt || amt <= 0) { toast.error('Informe um valor válido'); return; }
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          amount: amt,
          due_date: form.due_date,
        });
        toast.success('Compromisso atualizado');
      } else {
        await create.mutateAsync({
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          amount: amt,
          due_date: form.due_date,
        });
        toast.success('Compromisso criado');
      }
      setFormOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    }
  };

  const handleConcluir = async (createTx: boolean) => {
    if (!confirmConclude) return;
    try {
      await conclude.mutateAsync({ commitment: confirmConclude, createTransaction: createTx });
      toast.success(
        createTx
          ? `Lançado como ${confirmConclude.type === 'receivable' ? 'receita' : 'despesa'} no mês atual`
          : 'Compromisso concluído',
      );
      setConfirmConclude(null);
      setDetail(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao concluir');
    }
  };

  const handleCancel = async (c: FinancialCommitment) => {
    try {
      await cancel.mutateAsync(c.id);
      toast.success('Compromisso cancelado');
      setDetail(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success('Removido');
      setConfirmDelete(null);
      setDetail(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <StatCard
          icon={<ArrowDownCircle className="h-3.5 w-3.5" />}
          label="A Receber"
          value={formatCurrency(stats.receivable)}
          tone="green"
        />
        <StatCard
          icon={<ArrowUpCircle className="h-3.5 w-3.5" />}
          label="A Pagar"
          value={formatCurrency(stats.payable)}
          tone="red"
        />
        <StatCard
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Próximos 7 dias"
          value={String(stats.next7)}
          tone="neutral"
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Atrasados"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? 'amber' : 'neutral'}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          Seus compromissos
        </p>
        <Button size="sm" onClick={openCreate} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : commitments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          eyebrow="Sem compromissos"
          title="Organize seus valores futuros"
          description="Cadastre dinheiro a receber e a pagar. Quando o compromisso for concluído, você pode lançá-lo automaticamente nas receitas ou despesas do mês."
          tone="neutral"
          compact
        />
      ) : (
        <div className="space-y-4">
          <Group title="Atrasados" items={groups.overdueArr} onOpen={setDetail} />
          <Group title="Próximos 7 dias" items={groups.soon} onOpen={setDetail} />
          <Group title="Futuros" items={groups.future} onOpen={setDetail} />
          <Group title="Concluídos" items={groups.done} onOpen={setDetail} muted />
        </div>
      )}

      {/* Form sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar compromisso' : 'Novo compromisso'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CommitmentType }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payable">A pagar</SelectItem>
                  <SelectItem value="receivable">A receber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: João Silva, Aluguel..."
                className="min-h-[44px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="w-full sm:w-auto min-h-[44px]">
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {detail.type === 'receivable' ? 'A receber' : 'A pagar'}
                  </Badge>
                  <Badge variant={isOverdue(detail) ? 'destructive' : 'secondary'}>
                    {isOverdue(detail) ? 'Atrasado' : STATUS_LABEL[detail.status] ?? detail.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(Number(detail.amount))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</p>
                    <p className="text-base font-semibold">
                      {new Date(detail.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {detail.description && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</p>
                    <p className="text-sm whitespace-pre-line">{detail.description}</p>
                  </div>
                )}
                {detail.transaction_id && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    Já vinculado a um lançamento financeiro.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 pt-2">
                  {detail.status === 'pending' && (
                    <Button onClick={() => setConfirmConclude(detail)} className="w-full min-h-[44px]">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {detail.type === 'receivable' ? 'Marcar como recebido' : 'Marcar como pago'}
                    </Button>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="min-h-[44px]" onClick={() => openEdit(detail)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {detail.status === 'pending' && (
                      <Button variant="outline" className="min-h-[44px]" onClick={() => handleCancel(detail)}>
                        <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="min-h-[44px] text-destructive"
                      onClick={() => setConfirmDelete(detail)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Conclude confirm */}
      <AlertDialog open={!!confirmConclude} onOpenChange={(o) => !o && setConfirmConclude(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmConclude?.type === 'receivable'
                ? 'Deseja lançar este valor como receita?'
                : 'Deseja lançar este valor como despesa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A transação será criada no mês corrente com origem "compromisso" para rastreabilidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleConcluir(false)} className="w-full sm:w-auto">
              Não, apenas concluir
            </Button>
            <AlertDialogAction onClick={() => handleConcluir(true)} className="w-full sm:w-auto">
              Sim, lançar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'green' | 'red' | 'amber' | 'neutral';
}) => {
  const toneStyle =
    tone === 'green' ? 'text-[hsl(var(--finzap-green))]'
      : tone === 'red' ? 'text-[hsl(var(--finzap-red))]'
      : tone === 'amber' ? 'text-amber-600 dark:text-amber-400'
      : 'text-foreground';
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {icon}<span className="truncate">{label}</span>
        </div>
        <p className={`text-base sm:text-lg font-bold tabular-nums mt-1 truncate ${toneStyle}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
};

const Group = ({
  title, items, onOpen, muted,
}: {
  title: string;
  items: FinancialCommitment[];
  onOpen: (c: FinancialCommitment) => void;
  muted?: boolean;
}) => {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1">
        {title} <span className="text-muted-foreground/70">· {items.length}</span>
      </p>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {items.map(c => {
              const overdue = isOverdue(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(c)}
                    className="w-full text-left flex items-center justify-between gap-3 p-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                        c.type === 'receivable' ? 'bg-[hsl(var(--finzap-green))]/10 text-[hsl(var(--finzap-green))]'
                          : 'bg-[hsl(var(--finzap-red))]/10 text-[hsl(var(--finzap-red))]'
                      }`}>
                        {c.type === 'receivable'
                          ? <ArrowDownCircle className="h-4 w-4" />
                          : <ArrowUpCircle className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${muted ? 'text-muted-foreground' : ''}`}>
                          {c.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          {formatDate(c.due_date)}
                          {overdue && <span className="text-amber-600 dark:text-amber-400">· atrasado</span>}
                          {c.status !== 'pending' && <span>· {STATUS_LABEL[c.status] ?? c.status}</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${muted ? 'text-muted-foreground line-through' : ''}`}>
                      {formatCurrency(Number(c.amount))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
};