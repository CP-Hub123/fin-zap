import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Trash2, PiggyBank, ShieldCheck, Target, Wallet, Loader2, Sparkles } from 'lucide-react';
import type { Cofrinho } from '@/hooks/useCofrinhos';
import { ConnectedAccountsCard } from './ConnectedAccountsCard';
import { RecurringTransactionsView } from './RecurringTransactionsView';
import { CofrinhoCard } from './CofrinhoCard';
import { CofrinhoDetailSheet } from './CofrinhoDetailSheet';
import { COVER_PRESETS, getPreset } from '@/lib/cofrinhoPresets';
import { EmptyState } from './EmptyState';
import { UpgradeSheet } from './UpgradeSheet';
import { usePlan } from '@/hooks/usePlan';

type TipoCofrinho = 'reserva' | 'mensal' | 'meta';

interface Props {
  cofrinhos: Cofrinho[];
  isClosed: boolean;
  isLocked?: boolean;
  onCreate: (data: any) => Promise<any>;
  onUpdate: (data: Partial<Cofrinho> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onTransfer?: (data: { origem_id: string; destino_id: string; valor: number; descricao?: string }) => Promise<any>;
}

const empty = {
  nome: '',
  tipo: 'mensal' as TipoCofrinho,
  cover_preset: 'default',
  orcamento_mensal: '',
  saldo: '',
  meta_valor: '',
  custo_mensal: '',
  meses_protegidos: '6',
};

export const CofrinhosView = ({ cofrinhos, isClosed, isLocked = false, onCreate, onUpdate, onDelete, onTransfer }: Props) => {
  const disabled = isClosed || isLocked;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cofrinho | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { canCreate, limits } = usePlan();

  const openNew = () => {
    if (!canCreate('cofrinhos', cofrinhos.length)) {
      setUpgradeOpen(true);
      return;
    }
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: Cofrinho) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      tipo: (c.tipo as TipoCofrinho) ?? 'mensal',
      cover_preset: c.cover_preset ?? 'default',
      orcamento_mensal: String(c.orcamento_mensal),
      saldo: String(c.saldo),
      meta_valor: String(c.meta_valor ?? 0),
      custo_mensal: String(c.custo_mensal ?? 0),
      meses_protegidos: String(c.meses_protegidos ?? 6),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const preset = getPreset(form.cover_preset);
      const base: any = {
        nome: form.nome,
        tipo: form.tipo,
        cover_preset: form.cover_preset,
        icon: form.cover_preset,
        cor: preset.color,
        orcamento_mensal: form.tipo === 'mensal' ? (parseFloat(form.orcamento_mensal) || 0) : 0,
        meta_valor: form.tipo === 'meta' ? (parseFloat(form.meta_valor) || 0) : 0,
        custo_mensal: form.tipo === 'reserva' ? (parseFloat(form.custo_mensal) || 0) : 0,
        meses_protegidos: form.tipo === 'reserva' ? (parseFloat(form.meses_protegidos) || 6) : 6,
      };
      if (editing) {
        await onUpdate({ id: editing.id, ...base });
      } else {
        await onCreate({ ...base, saldo: parseFloat(form.saldo) || 0 });
      }
      setOpen(false);
    } finally { setSaving(false); }
  };

  const totalGuardado = cofrinhos.reduce((s, c) => s + Number(c.saldo), 0);
  const totalMetas = cofrinhos.reduce((s, c) => {
    if (c.tipo === 'meta') return s + Number(c.meta_valor);
    if (c.tipo === 'reserva') return s + (Number(c.custo_mensal) * (Number(c.meses_protegidos) || 6));
    return s;
  }, 0);
  const progressoGeral = totalMetas > 0
    ? Math.min(100, Math.round((cofrinhos.filter(c => c.tipo !== 'mensal').reduce((s, c) => s + Number(c.saldo), 0) / totalMetas) * 100))
    : 0;
  const detail = cofrinhos.find(c => c.id === detailId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" /> Cofrinhos
          </h2>
          <p className="text-xs text-muted-foreground">Separe seu dinheiro por propósito.</p>
        </div>
        {!disabled && (
          <Button size="sm" onClick={openNew} className="min-h-[40px]">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </div>

      {cofrinhos.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-zap p-6 text-white shadow-zap">
          <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-80">Total guardado</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">{formatCurrency(totalGuardado)}</p>
              <p className="text-xs opacity-80 mt-0.5">
                em {cofrinhos.length} {cofrinhos.length === 1 ? 'cofrinho' : 'cofrinhos'}
              </p>
            </div>
            {totalMetas > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs opacity-90">
                  <span>Progresso geral das metas</span>
                  <span className="font-semibold">{progressoGeral}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-700"
                    style={{ width: `${progressoGeral}%` }}
                  />
                </div>
                <p className="text-[11px] opacity-80">Meta total: {formatCurrency(totalMetas)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {cofrinhos.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          eyebrow="Organize por contexto"
          title="Crie seu primeiro cofrinho"
          description="Cofrinhos separam seu dinheiro por propósito — moradia, lazer, reserva ou metas — para você decidir com clareza onde cada real entra e sai."
          hints={[
            'Reserva — proteção em meses de imprevisto',
            'Mensal — orçamento para gastos do dia a dia',
            'Meta — guarda dinheiro para um objetivo específico',
          ]}
          primaryAction={!disabled ? { label: 'Criar cofrinho', onClick: openNew, icon: Plus } : undefined}
          tone="primary"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cofrinhos.map(c => (
            <div key={c.id} className="relative group">
              <CofrinhoCard cofrinho={c} onClick={() => setDetailId(c.id)} />
              {!disabled && (
                <div className="absolute top-2 right-8 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/80 backdrop-blur" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/80 backdrop-blur text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConnectedAccountsCard />

      <div className="pt-2">
        <RecurringTransactionsView cofrinhos={cofrinhos} isClosed={isClosed} isLocked={isLocked} />
      </div>

      {onTransfer && (
        <CofrinhoDetailSheet
          cofrinho={detail}
          cofrinhos={cofrinhos}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
          onTransfer={onTransfer}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {(() => {
            const preset = getPreset(form.cover_preset);
            const PresetIcon = preset.icon;
            const saldoNum = parseFloat(form.saldo) || 0;
            const metaNum = form.tipo === 'meta'
              ? (parseFloat(form.meta_valor) || 0)
              : form.tipo === 'reserva'
                ? (parseFloat(form.custo_mensal) || 0) * (parseFloat(form.meses_protegidos) || 6)
                : (parseFloat(form.orcamento_mensal) || 0);
            const progresso = metaNum > 0 ? Math.min(100, Math.round((saldoNum / metaNum) * 100)) : 0;
            const subtitle = form.tipo === 'meta' ? 'Meta' : form.tipo === 'reserva' ? 'Reserva de proteção' : 'Orçamento mensal';
            return (
              <>
                {/* Hero preview */}
                <div className="relative px-5 pt-6 pb-5 text-white overflow-hidden" style={{ backgroundImage: preset.gradient }}>
                  <div className="absolute -top-12 -right-10 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
                  <DialogHeader className="relative z-10 space-y-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                        <PresetIcon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider opacity-80 px-2 py-1 rounded-full bg-white/15 backdrop-blur">
                        {editing ? 'Editando' : 'Novo cofrinho'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-xl font-semibold leading-tight break-words">
                        {form.nome.trim() || 'Dê um nome ao seu cofrinho'}
                      </DialogTitle>
                      <p className="text-[11px] uppercase tracking-wider opacity-80 mt-2">{subtitle}</p>
                      <p className="text-2xl font-semibold tabular-nums tracking-tight mt-0.5">
                        {formatCurrency(metaNum)}
                      </p>
                    </div>
                    {metaNum > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div className="h-full bg-white transition-all duration-500" style={{ width: `${progresso}%` }} />
                        </div>
                        <div className="flex justify-between text-[11px] opacity-90">
                          <span>{formatCurrency(saldoNum)} guardado</span>
                          <span>{progresso}%</span>
                        </div>
                      </div>
                    )}
                  </DialogHeader>
                </div>

                {/* Form body */}
                <div className="px-5 py-5 space-y-5 max-h-[55vh] overflow-y-auto">
                  {/* Tipo segmented */}
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
                      {([
                        { v: 'mensal' as const, label: 'Mensal', icon: Wallet },
                        { v: 'meta' as const, label: 'Meta', icon: Target },
                        { v: 'reserva' as const, label: 'Reserva', icon: ShieldCheck },
                      ]).map(t => {
                        const Icon = t.icon;
                        const active = form.tipo === t.v;
                        return (
                          <button
                            key={t.v}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, tipo: t.v }))}
                            className={`flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-medium transition-all ${
                              active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder={form.tipo === 'meta' ? 'Ex: Viagem para o Japão' : form.tipo === 'reserva' ? 'Ex: Reserva de emergência' : 'Ex: Alimentação'}
                      maxLength={40}
                    />
                  </div>

                  {/* Capa preset */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Capa</Label>
                      <span className="text-[11px] text-muted-foreground">{preset.label}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {COVER_PRESETS.map(p => {
                        const Icon = p.icon;
                        const active = form.cover_preset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, cover_preset: p.id }))}
                            title={p.label}
                            className={`relative aspect-square rounded-xl flex items-center justify-center text-white transition-all ${
                              active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundImage: p.gradient }}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campos por tipo */}
                  {form.tipo === 'mensal' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Saldo inicial</Label>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} disabled={!!editing} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Orçamento</Label>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" value={form.orcamento_mensal} onChange={e => setForm(f => ({ ...f, orcamento_mensal: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {form.tipo === 'meta' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Saldo atual</Label>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} disabled={!!editing} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Meta</Label>
                        <Input type="number" step="0.01" placeholder="R$ 7.000" value={form.meta_valor} onChange={e => setForm(f => ({ ...f, meta_valor: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {form.tipo === 'reserva' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Saldo atual</Label>
                          <Input type="number" step="0.01" placeholder="R$ 0,00" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} disabled={!!editing} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Custo mensal</Label>
                          <Input type="number" step="0.01" placeholder="Gastos fixos" value={form.custo_mensal} onChange={e => setForm(f => ({ ...f, custo_mensal: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Meses de proteção</Label>
                        <Select value={form.meses_protegidos} onValueChange={v => setForm(f => ({ ...f, meses_protegidos: v }))}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[3, 6, 9, 12].map(n => <SelectItem key={n} value={String(n)}>{n} meses</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {editing && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Saldo é ajustado automaticamente pelas transações.
                    </p>
                  )}
                </div>

                <DialogFooter className="px-5 py-3 border-t border-border/50 bg-card/60 backdrop-blur flex-row gap-2 sm:gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-11">Cancelar</Button>
                  <Button onClick={save} disabled={saving || !form.nome.trim()} className="flex-1 h-11">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando</> : (editing ? 'Salvar' : 'Criar cofrinho')}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cofrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o cofrinho e todas as transações, recorrências e histórico vinculados a ele. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteId) return;
                try { await onDelete(deleteId); } finally { setDeleteId(null); }
              }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeSheet
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="cofrinhos"
        reason={`Seu plano permite até ${limits.cofrinhos} cofrinhos. Evolua para organizar cada propósito do seu dinheiro com clareza.`}
      />
    </div>
  );
};
