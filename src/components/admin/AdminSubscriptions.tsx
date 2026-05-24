import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Crown, Ban, Infinity } from 'lucide-react';
import { toast } from 'sonner';

interface SubRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  is_manual: boolean;
  discount_tag: string | null;
  profile_name: string | null;
}

export const AdminSubscriptions = () => {
  const queryClient = useQueryClient();
  const [editingSub, setEditingSub] = useState<SubRow | null>(null);
  const [form, setForm] = useState({ plan: '', status: '', expires_at: '', is_manual: false, discount_tag: '' });

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p.name]));

      return (subscriptions ?? []).map(s => ({
        ...s,
        profile_name: profileMap.get(s.user_id) ?? 'Desconhecido',
      })) as SubRow[];
    },
  });

  const updateSub = useMutation({
    mutationFn: async (data: { id: string; plan?: string; status?: string; expires_at?: string | null; is_manual?: boolean; discount_tag?: string | null }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from('subscriptions').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Assinatura atualizada!');
    },
  });

  const openEdit = (sub: SubRow) => {
    setEditingSub(sub);
    setForm({
      plan: sub.plan,
      status: sub.status,
      expires_at: sub.expires_at ? sub.expires_at.split('T')[0] : '',
      is_manual: sub.is_manual,
      discount_tag: sub.discount_tag ?? '',
    });
  };

  const handleSave = () => {
    if (!editingSub) return;
    updateSub.mutate({
      id: editingSub.id,
      plan: form.plan as any,
      status: form.status as any,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_manual: form.is_manual,
      discount_tag: form.discount_tag || null,
    });
    setEditingSub(null);
  };

  const quickAction = (sub: SubRow, action: 'activate' | 'expire' | 'lifetime' | 'premium' | 'founders') => {
    const updates: any = { id: sub.id };
    if (action === 'activate') { updates.status = 'active'; updates.is_manual = true; }
    if (action === 'expire') { updates.status = 'expired'; }
    if (action === 'lifetime') { updates.status = 'active'; updates.expires_at = null; updates.is_manual = true; }
    if (action === 'premium') { updates.plan = 'premium'; updates.status = 'active'; updates.is_manual = true; }
    if (action === 'founders') {
      updates.plan = 'founders';
      updates.status = 'active';
      updates.expires_at = null;
      updates.is_manual = true;
      updates.discount_tag = sub.discount_tag ?? 'FOUNDERS';
    }
    updateSub.mutate(updates);
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{subs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-primary">{subs.filter(s => s.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Trial</p>
            <p className="text-2xl font-bold">{subs.filter(s => s.plan === 'trial').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Expirados</p>
            <p className="text-2xl font-bold text-destructive">{subs.filter(s => s.status === 'expired').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {subs.map(sub => (
          <Card key={sub.id} className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">{sub.profile_name}</p>
                <Badge variant={sub.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                  {sub.status === 'active' ? 'Ativo' : 'Expirado'}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">{sub.plan}</Badge>
                {sub.is_manual && <Badge variant="secondary" className="text-xs">Manual</Badge>}
                {!sub.expires_at && sub.status === 'active' && <Badge variant="secondary" className="text-xs">♾️ Vitalício</Badge>}
              </div>
              {sub.expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(sub.expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => openEdit(sub)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => quickAction(sub, 'premium')}>
                  <Crown className="h-3 w-3 mr-1" /> Premium
                </Button>
                <Button size="sm" variant="default" className="text-xs h-8" onClick={() => quickAction(sub, 'founders')}>
                  <Sparkles className="h-3 w-3 mr-1" /> Founders
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => quickAction(sub, 'lifetime')}>
                  <Infinity className="h-3 w-3 mr-1" /> Vitalício
                </Button>
                {sub.status === 'active' ? (
                  <Button size="sm" variant="outline" className="text-xs h-8 text-destructive" onClick={() => quickAction(sub, 'expire')}>
                    <Ban className="h-3 w-3 mr-1" /> Desativar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => quickAction(sub, 'activate')}>
                    Ativar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiração</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map(sub => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.profile_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{sub.plan}</Badge>
                  {sub.is_manual && <Badge variant="secondary" className="ml-1 text-xs">Manual</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={sub.status === 'active' ? 'default' : 'destructive'}>
                    {sub.status === 'active' ? 'Ativo' : 'Expirado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.expires_at
                    ? new Date(sub.expires_at).toLocaleDateString('pt-BR')
                    : sub.status === 'active' ? '♾️ Vitalício' : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sub)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => quickAction(sub, 'premium')} title="Premium">
                      <Crown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => quickAction(sub, 'founders')} title="Ativar Founders vitalício">
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => quickAction(sub, 'lifetime')} title="Vitalício">
                      <Infinity className="h-3.5 w-3.5" />
                    </Button>
                    {sub.status === 'active' ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => quickAction(sub, 'expire')} title="Desativar">
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => quickAction(sub, 'activate')}>
                        Ativar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingSub} onOpenChange={() => setEditingSub(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Editar assinatura — {editingSub?.profile_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="founders">Founders (vitalício)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiração (vazio = vitalício)</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tag de desconto</Label>
              <Input value={form.discount_tag} onChange={e => setForm(f => ({ ...f, discount_tag: e.target.value }))} placeholder="Ex: VIP, PROMO2026" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditingSub(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateSub.isPending}>
              {updateSub.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
