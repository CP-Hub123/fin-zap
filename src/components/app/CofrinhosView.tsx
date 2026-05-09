import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Trash2, PiggyBank, ShieldCheck, Target, Wallet } from 'lucide-react';
import type { Cofrinho } from '@/hooks/useCofrinhos';
import { ConnectedAccountsCard } from './ConnectedAccountsCard';
import { RecurringTransactionsView } from './RecurringTransactionsView';
import { CofrinhoCard } from './CofrinhoCard';
import { CofrinhoDetailSheet } from './CofrinhoDetailSheet';
import { COVER_PRESETS, getPreset } from '@/lib/cofrinhoPresets';

type TipoCofrinho = 'reserva' | 'mensal' | 'meta';

interface Props {
  cofrinhos: Cofrinho[];
  isClosed: boolean;
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

export const CofrinhosView = ({ cofrinhos, isClosed, onCreate, onUpdate, onDelete, onTransfer }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cofrinho | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
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
        {!isClosed && (
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
        <div className="text-center py-12 text-muted-foreground text-sm">
          Crie seu primeiro cofrinho para começar a registrar transações.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cofrinhos.map(c => (
            <div key={c.id} className="relative group">
              <CofrinhoCard cofrinho={c} onClick={() => setDetailId(c.id)} />
              {!isClosed && (
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
        <RecurringTransactionsView cofrinhos={cofrinhos} isClosed={isClosed} />
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
        <DialogContent className="max-w-lg mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} cofrinho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'mensal' as const, label: 'Mensal', icon: Wallet, desc: 'Gastos do mês' },
                  { v: 'meta' as const, label: 'Meta', icon: Target, desc: 'Objetivo' },
                  { v: 'reserva' as const, label: 'Reserva', icon: ShieldCheck, desc: 'Emergência' },
                ]).map(t => {
                  const Icon = t.icon;
                  const active = form.tipo === t.v;
                  return (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: t.v }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${active ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Alimentação" className="min-h-[44px]" />
            </div>

            {/* Capa preset */}
            <div className="space-y-2">
              <Label>Capa</Label>
              <div className="grid grid-cols-4 gap-2">
                {COVER_PRESETS.map(p => {
                  const Icon = p.icon;
                  const active = form.cover_preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, cover_preset: p.id }))}
                      className={`relative h-14 rounded-lg flex flex-col items-center justify-center text-white transition ${active ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}`}
                      style={{ backgroundImage: p.gradient }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] mt-0.5">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos por tipo */}
            {form.tipo === 'mensal' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo inicial (R$)</Label>
                  <Input type="number" step="0.01" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} className="min-h-[44px]" disabled={!!editing} />
                </div>
                <div className="space-y-2">
                  <Label>Orçamento mensal (R$)</Label>
                  <Input type="number" step="0.01" value={form.orcamento_mensal} onChange={e => setForm(f => ({ ...f, orcamento_mensal: e.target.value }))} className="min-h-[44px]" />
                </div>
              </div>
            )}

            {form.tipo === 'meta' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Saldo atual (R$)</Label>
                  <Input type="number" step="0.01" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} className="min-h-[44px]" disabled={!!editing} />
                </div>
                <div className="space-y-2">
                  <Label>Meta (R$)</Label>
                  <Input type="number" step="0.01" value={form.meta_valor} onChange={e => setForm(f => ({ ...f, meta_valor: e.target.value }))} className="min-h-[44px]" placeholder="Ex: 7000" />
                </div>
              </div>
            )}

            {form.tipo === 'reserva' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Saldo atual (R$)</Label>
                    <Input type="number" step="0.01" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} className="min-h-[44px]" disabled={!!editing} />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo mensal (R$)</Label>
                    <Input type="number" step="0.01" value={form.custo_mensal} onChange={e => setForm(f => ({ ...f, custo_mensal: e.target.value }))} className="min-h-[44px]" placeholder="Seus gastos fixos" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Meses de proteção desejados</Label>
                  <Select value={form.meses_protegidos} onValueChange={v => setForm(f => ({ ...f, meses_protegidos: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 6, 9, 12].map(n => <SelectItem key={n} value={String(n)}>{n} meses</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.custo_mensal && (
                    <p className="text-xs text-muted-foreground">
                      Meta calculada: <strong>{formatCurrency((parseFloat(form.custo_mensal) || 0) * (parseFloat(form.meses_protegidos) || 6))}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {editing && <p className="text-[10px] text-muted-foreground">Saldo é ajustado automaticamente pelas transações.</p>}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancelar</Button>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto min-h-[44px]">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
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
    </div>
  );
};
