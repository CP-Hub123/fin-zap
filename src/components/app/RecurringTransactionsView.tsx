import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Trash2, Repeat } from 'lucide-react';
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
  dia_do_mes: '1',
  ativo: true,
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
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.valor || !form.cofrinho_id) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        valor: parseFloat(form.valor),
        tipo: form.tipo,
        cofrinho_id: form.cofrinho_id,
        dia_do_mes: Math.max(1, Math.min(31, parseInt(form.dia_do_mes) || 1)),
        ativo: form.ativo,
      };
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      setOpen(false);
    } finally { setSaving(false); }
  };

  const toggleAtivo = async (r: RecurringTransaction) => {
    await update.mutateAsync({ id: r.id, ativo: !r.ativo });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" /> Recorrentes
          </h2>
          <p className="text-xs text-muted-foreground">Geram transações automaticamente todo mês.</p>
        </div>
        {!isClosed && (
          <Button size="sm" onClick={openNew} disabled={noCofrinhos} className="min-h-[40px]">
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        )}
      </div>

      {noCofrinhos && (
        <div className="p-3 rounded-lg bg-primary/10 text-sm text-primary">
          Crie um cofrinho antes de cadastrar uma recorrência.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
      ) : recorrencias.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma recorrência cadastrada.
        </div>
      ) : (
        <div className="space-y-3">
          {recorrencias.map(r => {
            const cof = cofrinhoById(r.cofrinho_id);
            return (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{r.nome}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {cof && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cof.cor }} />}
                          {cof?.nome ?? '—'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">Dia {r.dia_do_mes}</Badge>
                        <Badge variant={r.ativo ? 'default' : 'outline'} className="text-xs">
                          {r.ativo ? 'Ativa' : 'Pausada'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base" style={{ color: r.tipo === 'receita' ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                        {formatCurrency(Number(r.valor))}
                      </p>
                    </div>
                  </div>
                  {!isClosed && (
                    <div className="flex items-center justify-between pt-1 border-t">
                      <div className="flex items-center gap-2">
                        <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                        <span className="text-xs text-muted-foreground">{r.ativo ? 'Ativada' : 'Desativada'}</span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} recorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Aluguel" className="min-h-[44px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as any }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cofrinho *</Label>
              <Select value={form.cofrinho_id} onValueChange={v => setForm(f => ({ ...f, cofrinho_id: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {cofrinhos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia do mês</Label>
                <Input type="number" min="1" max="31" value={form.dia_do_mes} onChange={e => setForm(f => ({ ...f, dia_do_mes: e.target.value }))} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Ativa</Label>
                <div className="flex items-center h-[44px]">
                  <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancelar</Button>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Transações já geradas pela recorrência permanecerão. Apenas as próximas execuções serão interrompidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px]"
              onClick={async () => { if (deleteId) { await remove.mutateAsync(deleteId); setDeleteId(null); } }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
