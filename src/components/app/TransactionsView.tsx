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
import type { Cofrinho } from '@/hooks/useCofrinhos';
import type { TablesInsert } from '@/integrations/supabase/types';
import { getStatusLevel, STATUS_META } from '@/lib/cofrinhoPresets';

interface TransactionsViewProps {
  transactions: Transaction[];
  monthId: string;
  isClosed: boolean;
  cofrinhos: Cofrinho[];
  onAdd: (data: TablesInsert<'transactions'>) => Promise<any>;
  onUpdate: (data: Partial<Transaction> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const emptyForm = { name: '', amount: '', cofrinho_id: '', date: new Date().toISOString().split('T')[0], status: 'realized' as 'planned' | 'realized', is_fixed: false, recurrence: 'none' as 'none' | 'monthly' };

export const TransactionsView = ({ transactions, monthId, isClosed, cofrinhos, onAdd, onUpdate, onDelete }: TransactionsViewProps) => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = transactions.filter(t => t.type === activeTab);
  const cofrinhoById = (id: string) => cofrinhos.find(c => c.id === id);

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
        {!isClosed && (
          <Button onClick={openNew} size="sm" className="w-full sm:w-auto sm:ml-auto min-h-[44px] sm:min-h-0" disabled={noCofrinhos}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {noCofrinhos && !isClosed && (
        <div className="p-3 rounded-lg bg-primary/10 text-sm text-primary">
          Crie um cofrinho na etapa <strong>Planejamento</strong> antes de adicionar transações.
        </div>
      )}

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
              <Label>Cofrinho *</Label>
              <Select value={form.cofrinho_id} onValueChange={v => setForm(f => ({ ...f, cofrinho_id: v }))}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selecione um cofrinho..." /></SelectTrigger>
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

            {impactPreview && (
              <div className={`rounded-lg p-3 text-xs border-l-4 ${
                impactPreview.level === 'safe' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' :
                impactPreview.level === 'attention' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300' :
                impactPreview.level === 'critical' ? 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300' :
                'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300'
              }`}>
                <p className="font-medium mb-0.5">💡 Impacto desta decisão</p>
                <p>{impactPreview.text}</p>
              </div>
            )}
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
