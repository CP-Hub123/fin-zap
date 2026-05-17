import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMonths, type Month } from '@/hooks/useMonths';
import { MONTH_NAMES, formatCurrency } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/app/Logo';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, ChevronRight, MoreVertical, Search, Plus,
  Archive, ArchiveRestore, Pencil, Trash2, Lock, CheckCircle2, Layers, TrendingUp, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'closed' | 'archived';

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Rascunho', tone: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Ativo', tone: 'bg-finzap-green/15 text-finzap-green' },
  ready_to_close: { label: 'Pronto p/ fechar', tone: 'bg-amber-500/15 text-amber-600' },
  closed: { label: 'Fechado', tone: 'bg-muted text-muted-foreground' },
  archived: { label: 'Arquivado', tone: 'bg-secondary text-secondary-foreground' },
};

const MonthsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { months, isLoading, updateMonth, deleteMonth } = useMonths();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const [editing, setEditing] = useState<Month | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [deleting, setDeleting] = useState<Month | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Aggregated counts per month
  const aggregatesQuery = useQuery({
    queryKey: ['months-aggregates', user?.id],
    queryFn: async () => {
      if (!user) return {} as Record<string, { income: number; expense: number; count: number }>;
      const { data, error } = await supabase
        .from('transactions')
        .select('month_id, type, amount, status')
        .eq('user_id', user.id);
      if (error) throw error;
      const map: Record<string, { income: number; expense: number; count: number }> = {};
      (data ?? []).forEach((t: any) => {
        if (!t.month_id) return;
        const m = map[t.month_id] ?? { income: 0, expense: 0, count: 0 };
        m.count += 1;
        if (t.type === 'income') m.income += Number(t.amount);
        else m.expense += Number(t.amount);
        map[t.month_id] = m;
      });
      return map;
    },
    enabled: !!user,
  });

  const aggregates = aggregatesQuery.data ?? {};

  const years = useMemo(() => {
    const set = new Set<number>();
    months.forEach(m => set.add(m.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [months]);

  const filtered = useMemo(() => {
    return months.filter(m => {
      if (yearFilter !== 'all' && String(m.year) !== yearFilter) return false;
      if (statusFilter === 'active' && !(m.status === 'in_progress' || m.status === 'draft' || m.status === 'ready_to_close')) return false;
      if (statusFilter === 'closed' && m.status !== 'closed') return false;
      if (statusFilter === 'archived' && (m.status as string) !== 'archived') return false;
      if (statusFilter === 'all' && (m.status as string) === 'archived') return false; // hide archived from "todos" por padrão
      if (search.trim()) {
        const term = search.toLowerCase();
        const label = `${MONTH_NAMES[m.month - 1]} ${m.year}`.toLowerCase();
        if (!label.includes(term)) return false;
      }
      return true;
    });
  }, [months, statusFilter, yearFilter, search]);

  const grouped = useMemo(() => {
    const g: Record<number, Month[]> = {};
    filtered.forEach(m => {
      if (!g[m.year]) g[m.year] = [];
      g[m.year].push(m);
    });
    return Object.entries(g)
      .map(([y, arr]) => ({ year: Number(y), months: arr.sort((a, b) => b.month - a.month) }))
      .sort((a, b) => b.year - a.year);
  }, [filtered]);

  // Hero KPIs
  const kpis = useMemo(() => {
    const closed = months.filter(m => m.status === 'closed').length;
    let saldoAggregate = 0;
    months.forEach(m => {
      const agg = aggregates[m.id];
      const opBalance = Number(m.initial_balance) + (agg ? agg.income - agg.expense : 0);
      saldoAggregate += opBalance;
    });
    const activeMonth = months.find(m => m.status === 'in_progress' || m.status === 'draft' || m.status === 'ready_to_close');
    return {
      total: months.length,
      closed,
      saldoAggregate,
      activeLabel: activeMonth ? `${MONTH_NAMES[activeMonth.month - 1]} ${activeMonth.year}` : '—',
    };
  }, [months, aggregates]);

  const handleOpen = (m: Month) => {
    localStorage.setItem('finzap:selectedMonthId', m.id);
    navigate(`/app?month=${m.id}`);
  };

  const handleArchive = async (m: Month, archive: boolean) => {
    try {
      await updateMonth.mutateAsync({ id: m.id, status: archive ? 'archived' : 'in_progress' });
      toast.success(archive ? 'Mês arquivado' : 'Mês reativado');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao atualizar mês');
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      await updateMonth.mutateAsync({ id: editing.id, initial_balance: parseFloat(editBalance.replace(',', '.')) || 0 });
      toast.success('Saldo inicial atualizado');
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMonth.mutateAsync(deleting.id);
      toast.success('Mês excluído com sucesso');
      setDeleting(null);
      setConfirmText('');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao excluir mês');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border/60 bg-card/85 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Logo />
          </div>
          <Button size="sm" onClick={() => navigate('/app?newMonth=1')} className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-5 space-y-5">
        {/* Hero */}
        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-card-premium">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift">
              <Layers className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Central de Meses</h1>
              <p className="text-sm text-muted-foreground">Seu hub temporal — gerencie todos os ciclos financeiros.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi icon={Calendar} label="Total de meses" value={String(kpis.total)} />
            <Kpi icon={CheckCircle2} label="Fechados" value={String(kpis.closed)} />
            <Kpi icon={TrendingUp} label="Mês ativo" value={kpis.activeLabel} small />
            <Kpi icon={Wallet} label="Saldo agregado" value={formatCurrency(kpis.saldoAggregate)} small />
          </div>
        </section>

        {/* Filtros */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome do mês..."
              className="pl-9 h-11 rounded-full bg-card"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList className="rounded-full">
                <TabsTrigger value="all" className="rounded-full text-xs">Todos</TabsTrigger>
                <TabsTrigger value="active" className="rounded-full text-xs">Ativos</TabsTrigger>
                <TabsTrigger value="closed" className="rounded-full text-xs">Fechados</TabsTrigger>
                <TabsTrigger value="archived" className="rounded-full text-xs">Arquivados</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              <YearChip active={yearFilter === 'all'} onClick={() => setYearFilter('all')}>Todos os anos</YearChip>
              {years.map(y => (
                <YearChip key={y} active={yearFilter === String(y)} onClick={() => setYearFilter(String(y))}>
                  {y}
                </YearChip>
              ))}
            </div>
          </div>
        </section>

        {/* Lista */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : grouped.length === 0 ? (
          <EmptyState onCreate={() => navigate('/app?newMonth=1')} />
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <section key={group.year} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.year}
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[11px] text-muted-foreground">{group.months.length} {group.months.length === 1 ? 'mês' : 'meses'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.months.map(m => (
                    <MonthCard
                      key={m.id}
                      month={m}
                      agg={aggregates[m.id]}
                      onOpen={() => handleOpen(m)}
                      onEdit={() => { setEditing(m); setEditBalance(String(m.initial_balance)); }}
                      onArchive={() => handleArchive(m, (m.status as string) !== 'archived')}
                      onDelete={() => setDeleting(m)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Editar saldo inicial */}
      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mês</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {MONTH_NAMES[editing.month - 1]} {editing.year}
              </p>
              <div className="space-y-2">
                <Label>Saldo inicial (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={editBalance}
                  onChange={e => setEditBalance(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMonth.isPending} className="w-full sm:w-auto">
              {updateMonth.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir mês */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) { setDeleting(null); setConfirmText(''); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir mês permanentemente?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                {deleting && (
                  <p>
                    Você está prestes a excluir <strong>{MONTH_NAMES[deleting.month - 1]} {deleting.year}</strong>.
                    Essa ação removerá em definitivo:
                  </p>
                )}
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Todas as transações do mês</li>
                  <li>Previsões e orçamentos vinculados</li>
                  <li>Recorrências executadas nesse mês</li>
                  <li>Parcelas de cartão deste mês (a compra original pode ser preservada se tiver outras parcelas)</li>
                  <li>Fechamento mensal e insights relacionados</li>
                </ul>
                <p className="text-xs">Para confirmar, digite <strong>EXCLUIR</strong> abaixo.</p>
                <Input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="h-10"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== 'EXCLUIR' || deleteMonth.isPending}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMonth.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, small }: { icon: any; label: string; value: string; small?: boolean }) => (
  <div className="rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-3">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </div>
    <p className={cn('font-bold tracking-tight tabular-nums mt-1', small ? 'text-base' : 'text-lg sm:text-xl')}>{value}</p>
  </div>
);

const YearChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      'shrink-0 rounded-full px-3 h-8 text-xs font-medium border transition-all',
      active ? 'bg-primary text-primary-foreground border-primary shadow-lift' : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40',
    )}
  >
    {children}
  </button>
);

const MonthCard = ({
  month, agg, onOpen, onEdit, onArchive, onDelete,
}: {
  month: Month;
  agg?: { income: number; expense: number; count: number };
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) => {
  const initial = Number(month.initial_balance);
  const income = agg?.income ?? 0;
  const expense = agg?.expense ?? 0;
  const operational = initial + income - expense;
  const status = STATUS_LABEL[month.status] ?? STATUS_LABEL.draft;
  const isArchived = (month.status as string) === 'archived';
  const isClosed = month.status === 'closed';

  return (
    <Card className={cn('group border-border/60 shadow-card-premium hover:shadow-elevated transition-all', isArchived && 'opacity-70')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button onClick={onOpen} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight truncate">
                {MONTH_NAMES[month.month - 1]} <span className="text-muted-foreground font-medium">{month.year}</span>
              </span>
              {isClosed && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            <Badge variant="secondary" className={cn('mt-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0', status.tone)}>
              {status.label}
            </Badge>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={e => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpen}>
                <ChevronRight className="h-4 w-4 mr-2" /> Abrir mês
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Editar saldo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                {isArchived ? (<><ArchiveRestore className="h-4 w-4 mr-2" /> Reativar</>) : (<><Archive className="h-4 w-4 mr-2" /> Arquivar</>)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button onClick={onOpen} className="block w-full text-left mt-3">
          <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">Saldo operacional</p>
          <p className={cn('text-xl font-bold tracking-tight tabular-nums mt-0.5', operational < 0 ? 'text-destructive' : 'text-foreground')}>
            {formatCurrency(operational)}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <Mini label="Receitas" value={formatCurrency(income)} tone="text-finzap-green" />
            <Mini label="Despesas" value={formatCurrency(expense)} tone="text-destructive" />
            <Mini label="Transações" value={String(agg?.count ?? 0)} />
          </div>
        </button>
      </CardContent>
    </Card>
  );
};

const Mini = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-lg bg-secondary/50 px-2 py-1.5">
    <p className="text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
    <p className={cn('font-semibold tabular-nums truncate', tone)}>{value}</p>
  </div>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="rounded-3xl border border-dashed border-border/60 bg-card/50 px-6 py-14 text-center">
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
      <Layers className="h-6 w-6" />
    </span>
    <h3 className="text-base font-semibold">Nenhum ciclo financeiro encontrado</h3>
    <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro mês para começar a controlar suas finanças.</p>
    <Button onClick={onCreate} className="mt-4 rounded-full">
      <Plus className="h-4 w-4 mr-1" /> Criar primeiro ciclo
    </Button>
  </div>
);

export default MonthsPage;