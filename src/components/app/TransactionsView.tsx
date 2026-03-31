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

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
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
      {/* Toggle tabs + Add button */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={activeTab === 'income' ? 'default' : 'outline'} onClick={() => setActiveTab('income')} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
          Receitas ({transactions.filter(t => t.type === 'income').length})
        </Button>
        <Button size="sm" variant={activeTab === 'expense' ? 'default' : 'outline'} onClick={() => setActiveTab('expense')} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0">
          Despesas ({transactions.filter(t => t.type === 'expense').length})
        </Button>
        {!isClosed && (
          <Button onClick={openNew} size="sm" className="w-full sm:w-auto sm:ml-auto min-h-[44px] sm:min-h-0">
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

      {/* Mobile cards / empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma {activeTab === 'income' ? 'receita' : 'despesa'} cadastrada
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="border-0 shadow-sm" onClick={() => !isClosed && openEdit(t)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      <Badge variant={t.status === 'realized' ? 'default' : 'secondary'} className="text-xs">
                        {t.status === 'realized' ? 'Realizado' : 'Previsto'}
                      </Badge>
                      {t.is_fixed && <Badge variant="secondary" className="text-xs">Fixa</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base" style={{ color: t.type === 'income' ? 'hsl(var(--finzap-green))' : 'hsl(var(--finzap-red))' }}>
                      {formatCurrency(Number(t.amount))}
                    </p>
                    {!isClosed && (
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
        <DialogContent className="max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nova'} {activeTab === 'income' ? 'receita' : 'despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Salário" className="min-h-[44px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="min-h-[44px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tabCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Previsto</SelectItem>
                    <SelectItem value="realized">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.is_fixed ? 'fixed' : 'variable'} onValueChange={v => setForm(f => ({ ...f, is_fixed: v === 'fixed' }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-h-[44px]">{saving ? 'Salvando...' : 'Salvar'}</Button>
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
