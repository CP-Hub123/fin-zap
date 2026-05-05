import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';
import type { Cofrinho } from '@/hooks/useCofrinhos';
import { ConnectedAccountsCard } from './ConnectedAccountsCard';
import { RecurringTransactionsView } from './RecurringTransactionsView';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  cofrinhos: Cofrinho[];
  isClosed: boolean;
  onCreate: (data: { nome: string; cor?: string; orcamento_mensal?: number; saldo?: number }) => Promise<any>;
  onUpdate: (data: Partial<Cofrinho> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const empty = { nome: '', cor: COLORS[0], orcamento_mensal: '', saldo: '' };

export const CofrinhosView = ({ cofrinhos, isClosed, onCreate, onUpdate, onDelete }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cofrinho | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Cofrinho) => {
    setEditing(c);
    setForm({ nome: c.nome, cor: c.cor, orcamento_mensal: String(c.orcamento_mensal), saldo: String(c.saldo) });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await onUpdate({
          id: editing.id,
          nome: form.nome,
          cor: form.cor,
          orcamento_mensal: parseFloat(form.orcamento_mensal) || 0,
          saldo: parseFloat(form.saldo) || 0,
        });
      } else {
        await onCreate({
          nome: form.nome,
          cor: form.cor,
          orcamento_mensal: parseFloat(form.orcamento_mensal) || 0,
          saldo: parseFloat(form.saldo) || 0,
        });
      }
      setOpen(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" /> Cofrinhos
          </h2>
          <p className="text-xs text-muted-foreground">Toda transação precisa estar vinculada a um cofrinho.</p>
        </div>
        {!isClosed && (
          <Button size="sm" onClick={openNew} className="min-h-[40px]">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </div>

      {cofrinhos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Crie seu primeiro cofrinho para começar a registrar transações.
        </div>
      ) : (
        <div className="space-y-3">
          {cofrinhos.map(c => {
            const orc = Number(c.orcamento_mensal);
            const gasto = Number(c.gasto_mes);
            const pct = orc > 0 ? Math.min(100, Math.round((gasto / orc) * 100)) : 0;
            const over = orc > 0 && gasto > orc;
            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                      <p className="font-medium truncate">{c.nome}</p>
                    </div>
                    {!isClosed && (
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
                      <p className="text-sm font-bold">{formatCurrency(Number(c.saldo))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Gasto mês</p>
                      <p className="text-sm font-bold" style={{ color: over ? 'hsl(var(--finzap-red))' : undefined }}>
                        {formatCurrency(gasto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Orçamento</p>
                      <p className="text-sm font-bold">{formatCurrency(orc)}</p>
                    </div>
                  </div>
                  {orc > 0 && (
                    <Progress value={pct} className={`h-2 ${over ? '[&>div]:bg-[hsl(var(--finzap-red))]' : ''}`} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConnectedAccountsCard />

      <div className="pt-2">
        <RecurringTransactionsView cofrinhos={cofrinhos} isClosed={isClosed} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} cofrinho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Alimentação" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, cor: col }))}
                    className={`h-8 w-8 rounded-full border-2 transition ${form.cor === col ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Saldo inicial (R$)</Label>
                <Input type="number" step="0.01" value={form.saldo} onChange={e => setForm(f => ({ ...f, saldo: e.target.value }))} className="min-h-[44px]" disabled={!!editing} />
                {editing && <p className="text-[10px] text-muted-foreground">Saldo é ajustado automaticamente pelas transações.</p>}
              </div>
              <div className="space-y-2">
                <Label>Orçamento mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.orcamento_mensal} onChange={e => setForm(f => ({ ...f, orcamento_mensal: e.target.value }))} className="min-h-[44px]" />
              </div>
            </div>
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
              Não é possível excluir cofrinhos com transações vinculadas. Remova as transações primeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px]"
              onClick={async () => { if (deleteId) { try { await onDelete(deleteId); } catch {} setDeleteId(null); } }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
