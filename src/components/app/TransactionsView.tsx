import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import { Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';
import type { Category } from '@/hooks/useCategories';
import type { TablesInsert } from '@/integrations/supabase/types';

interface TransactionsViewProps {
  transactions: Transaction[];
  monthId: string;
  isClosed: boolean;
  categories: Category[];
  onAdd: (data: TablesInsert<'transactions'>) => Promise<any>;
  onUpdate: (data: Partial<Transaction> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const emptyForm = { name: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], status: 'realized' as 'planned' | 'realized', is_fixed: false, recurrence: 'none' as 'none' | 'monthly' };

export const TransactionsView = ({ transactions, monthId, isClosed, categories, onAdd, onUpdate, onDelete }: TransactionsViewProps) => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = transactions.filter(t => t.type === activeTab);
  const tabCategories = categories.filter(c => c.type === activeTab);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setForm({ name: t.name, amount: String(t.amount), category: t.category, date: t.date, status: t.status, is_fixed: t.is_fixed, recurrence: t.recurrence });
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: Transaction) => {
    await onAdd({
      month_id: monthId, type: t.type, name: `${t.name} (cópia)`, amount: t.amount,
      category: t.category, date: t.date, status: t.status, is_fixed: t.is_fixed, recurrence: t.recurrence,
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.amount || !form.category) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate({ id: editingId, name: form.name, amount: parseFloat(form.amount), category: form.category, date: form.date, status: form.status as any, is_fixed: form.is_fixed, recurrence: form.recurrence as any });
      } else {
        await onAdd({ month_id: monthId, type: activeTab, name: form.name, amount: parseFloat(form.amount), category: form.category, date: form.date, status: form.status as any, is_fixed: form.is_fixed, recurrence: form.recurrence as any });
      }
      setDialogOpen(false);
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toggle tabs */}
      <div className="flex gap-2">
        <Button variant={activeTab === 'income' ? 'default' : 'outline'} onClick={() => setActiveTab('income')}>
          Receitas ({transactions.filter(t => t.type === 'income').length})
        </Button>
        <Button variant={activeTab === 'expense' ? 'default' : 'outline'} onClick={() => setActiveTab('expense')}>
          Despesas ({transactions.filter(t => t.type === 'expense').length})
        </Button>
        {!isClosed && (
          <Button onClick={openNew} className="ml-auto">
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <Badge variant="secondary">🔒 Mês fechado</Badge>
          <span className="text-sm text-muted-foreground">Edição bloqueada</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              {!isClosed && <TableHead className="w-[100px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isClosed ? 6 : 7} className="text-center py-8 text-muted-foreground">
                  Nenhuma {activeTab === 'income' ? 'receita' : 'despesa'} cadastrada
                </TableCell>
              </TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id} className={!isClosed ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => !isClosed && openEdit(t)}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                <TableCell className="font-medium" style={{ color: t.type === 'income' ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                  {formatCurrency(Number(t.amount))}
                </TableCell>
                <TableCell>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge variant={t.status === 'realized' ? 'default' : 'secondary'}>
                    {t.status === 'realized' ? 'Realizado' : 'Previsto'}
                  </Badge>
                </TableCell>
                <TableCell>{t.is_fixed ? 'Fixa' : 'Variável'}</TableCell>
                {!isClosed && (
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nova'} {activeTab === 'income' ? 'receita' : 'despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Salário" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tabCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Previsto</SelectItem>
                    <SelectItem value="realized">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.is_fixed ? 'fixed' : 'variable'} onValueChange={v => setForm(f => ({ ...f, is_fixed: v === 'fixed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
