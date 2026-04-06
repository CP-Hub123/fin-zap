import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Settings, ArrowLeft, Plus, Pencil, Trash2, LayoutDashboard, CreditCard } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';

// Dashboard
const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: withMonths } = await supabase.from('months').select('user_id', { count: 'exact', head: true });
      return { total: total ?? 0, active: withMonths ?? 0 };
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Total de usuários</p>
          <p className="text-4xl font-bold mt-2">{stats?.total ?? '—'}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Usuários ativos</p>
          <p className="text-4xl font-bold mt-2">{stats?.active ?? '—'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Users
const AdminUsers = () => {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return profiles ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{users.length} usuário(s) encontrado(s)</p>
      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {users.map(u => (
          <Card key={u.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="font-medium text-sm">{u.name || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Tutorials Manager
const AdminTutorials = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', video_url: '', display_order: '0', is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tutorials = [] } = useQuery({
    queryKey: ['admin-tutorials'],
    queryFn: async () => {
      const { data } = await supabase.from('tutorials').select('*').order('display_order');
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, description: form.description, video_url: form.video_url, display_order: parseInt(form.display_order) || 0, is_active: form.is_active };
      if (editingId) {
        await supabase.from('tutorials').update(payload).eq('id', editingId);
      } else {
        await supabase.from('tutorials').insert(payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tutorials'] }); setDialogOpen(false); toast.success('Tutorial salvo!'); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from('tutorials').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-tutorials'] }); toast.success('Tutorial excluído!'); },
  });

  const openNew = () => { setEditingId(null); setForm({ title: '', description: '', video_url: '', display_order: '0', is_active: true }); setDialogOpen(true); };
  const openEdit = (t: any) => { setEditingId(t.id); setForm({ title: t.title, description: t.description || '', video_url: t.video_url, display_order: String(t.display_order), is_active: t.is_active }); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo tutorial</Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tutorials.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.display_order}</TableCell>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Sim' : 'Não'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} tutorial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>URL do vídeo</Label><Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))} /></div>
              <div className="space-y-2 flex items-end gap-2">
                <Label>Ativo</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir tutorial?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) del.mutate(deleteId); setDeleteId(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Settings with toggle for system status
const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('*');
      return data ?? [];
    },
  });

  const { data: subCount } = useQuery({
    queryKey: ['admin-push-sub-count'],
    queryFn: async () => {
      const { count } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const getSetting = (key: string) => values[key] ?? settings.find(s => s.key === key)?.value ?? '';
  const currentStatus = getSetting('system_status') || 'active';
  const isMaintenance = currentStatus === 'maintenance';

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await supabase.from('system_settings').update({ value }).eq('key', key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
      toast.success('Configuração salva!');
    },
  });

  const toggleStatus = () => {
    const newStatus = isMaintenance ? 'active' : 'maintenance';
    setValues(v => ({ ...v, system_status: newStatus }));
    saveSetting.mutate({ key: 'system_status', value: newStatus });
  };

  const sendTestPush = async () => {
    if (!user) return;
    if (subCount === 0) {
      toast.error('Nenhum usuário inscrito para notificações');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: user.id,
          title: 'FinZap',
          body: testMessage || '🚀 FinZap: Notificações estão funcionando!',
          type: 'test',
          broadcast: true,
        },
      });
      if (error) throw error;
      const sent = data?.sent ?? 0;
      const total = data?.total ?? 0;
      if (sent > 0) {
        toast.success(`Push enviado com sucesso! ${sent}/${total} dispositivo(s)`);
      } else if (data?.errors?.length) {
        toast.error(`Falha no envio: ${data.errors[0]}`);
      } else {
        toast.warning(data?.message || 'Nenhum push enviado');
      }
      if (data?.errors?.length) {
        console.warn('Push errors:', data.errors);
      }
      setTestMessage('');
    } catch (err: any) {
      toast.error('Erro ao enviar notificação');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status Toggle */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-medium">Status do sistema</Label>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleStatus}
              disabled={saveSetting.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                !isMaintenance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              Ativo
            </button>
            <button
              onClick={toggleStatus}
              disabled={saveSetting.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isMaintenance ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              Manutenção
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isMaintenance
              ? '⚠️ Sistema em manutenção. Apenas admins podem acessar.'
              : '✅ Sistema ativo. Todos os usuários podem acessar.'}
          </p>
        </CardContent>
      </Card>

      {/* Push Notification Test */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <Label className="text-base font-medium">Teste de Notificação</Label>
          <p className="text-xs text-muted-foreground">
            {subCount != null ? `${subCount} inscrição(ões) ativa(s)` : 'Carregando...'}
          </p>
          <Input
            value={testMessage}
            onChange={e => setTestMessage(e.target.value)}
            placeholder="Digite a mensagem (opcional)"
            className="min-h-[44px]"
          />
          <Button onClick={sendTestPush} disabled={sending} className="w-full sm:w-auto min-h-[44px]">
            {sending ? 'Enviando...' : 'Enviar Notificação Teste'}
          </Button>
        </CardContent>
      </Card>

      {/* Other settings */}
      {[
        { key: 'app_name', label: 'Nome do sistema' },
        { key: 'global_message', label: 'Mensagem global (exibida na página de manutenção)' },
      ].map(({ key, label }) => (
        <Card key={key} className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 space-y-2">
              <Label>{label}</Label>
              <Input value={getSetting(key)} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
            </div>
            <Button onClick={() => saveSetting.mutate({ key, value: values[key] ?? getSetting(key) })} disabled={saveSetting.isPending} className="min-h-[44px]">
              Salvar
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main Admin Page
const Admin = () => {
  const navigate = useNavigate();
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Usuários', icon: Users },
    { path: '/admin/tutorials', label: 'Tutoriais', icon: BookOpen },
    { path: '/admin/settings', label: 'Configurações', icon: Settings },
    { path: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Logo size="small" />
          <span className="font-bold text-lg text-muted-foreground">/ Admin</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end className={({ isActive }) => cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="tutorials" element={<AdminTutorials />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Routes>
      </div>
    </div>
  );
};

export default Admin;
