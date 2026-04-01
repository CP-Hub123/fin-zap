import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Settings, ArrowLeft, Plus, Pencil, Trash2, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
          <p className="text-4xl font-bold mt-2">{stats?.total ?? '-'}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Usuários ativos</p>
          <p className="text-4xl font-bold mt-2">{stats?.active ?? '-'}</p>
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
      <div className="rounded-lg border bg-card">
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
                <TableCell className="font-medium">{u.name}</TableCell>
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

// Settings
const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('*');
      return data ?? [];
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const getSetting = (key: string) => values[key] ?? settings.find(s => s.key === key)?.value ?? '';

  const saveSetting = useMutation({
    mutationFn: async (key: string) => {
      await supabase.from('system_settings').update({ value: values[key] ?? '' }).eq('key', key);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); toast.success('Configuração salva!'); },
  });

  return (
    <div className="space-y-6">
      {[
        { key: 'app_name', label: 'Nome do sistema' },
        { key: 'global_message', label: 'Mensagem global' },
        { key: 'system_status', label: 'Status do sistema (active/maintenance)' },
      ].map(({ key, label }) => (
        <Card key={key} className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>{label}</Label>
              <Input value={getSetting(key)} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
            </div>
            <Button onClick={() => saveSetting.mutate(key)} disabled={saveSetting.isPending}>Salvar</Button>
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
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Admin</span>
          </div>
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
        </Routes>
      </div>
    </div>
  );
};

export default Admin;
