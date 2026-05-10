import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Routes, Route } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users as UsersIcon, Bug as BugIcon, Activity, AlertCircle, Bell, Send as SendIcon, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminSubscriptions } from '@/components/admin/AdminSubscriptions';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminBugs } from '@/pages/admin/AdminBugs';

// ============ Notifications Admin ============
const AdminNotifications = () => {
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: stats } = useQuery({
    queryKey: ['admin-notif-stats'],
    queryFn: async () => {
      const [{ count: sent }, { count: delivered }, { count: failed }, { count: clicked }, { count: subs }] = await Promise.all([
        supabase.from('notifications_log').select('*', { count: 'exact', head: true }).gte('sent_at', since7),
        supabase.from('notifications_log').select('*', { count: 'exact', head: true }).gte('sent_at', since7).not('delivered_at', 'is', null),
        supabase.from('notifications_log').select('*', { count: 'exact', head: true }).gte('sent_at', since7).not('error', 'is', null),
        supabase.from('notifications_log').select('*', { count: 'exact', head: true }).gte('sent_at', since7).not('clicked_at', 'is', null),
        supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
      ]);
      return { sent: sent ?? 0, delivered: delivered ?? 0, failed: failed ?? 0, clicked: clicked ?? 0, subs: subs ?? 0 };
    },
  });
  const { data: recent = [] } = useQuery({
    queryKey: ['admin-notif-recent'],
    queryFn: async () => (await supabase
      .from('notifications_log')
      .select('id, title, type, category, priority, sent_at, delivered_at, clicked_at, error')
      .order('sent_at', { ascending: false })
      .limit(50)).data ?? [],
  });
  const ctr = stats && stats.delivered > 0 ? Math.round((stats.clicked / stats.delivered) * 100) : 0;

  return (
    <div>
      <PageHeader title="Notificações" description="Métricas dos últimos 7 dias." />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Enviadas" value={stats?.sent ?? '—'} icon={SendIcon} />
        <KpiCard label="Entregues" value={stats?.delivered ?? '—'} icon={CheckCircle2} accent="bg-finzap-green/10 text-[hsl(var(--finzap-green))]" />
        <KpiCard label="Falhas" value={stats?.failed ?? '—'} icon={XCircle} accent="bg-destructive/10 text-destructive" />
        <KpiCard label="Cliques" value={`${ctr}%`} icon={Activity} accent="bg-violet-500/10 text-violet-500" />
        <KpiCard label="Inscrições" value={stats?.subs ?? '—'} icon={Bell} accent="bg-blue-500/10 text-blue-500" />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right hidden md:table-cell">Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((n: any) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.title}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{n.category || n.type}</TableCell>
                <TableCell>
                  {n.error ? <Badge variant="destructive">falha</Badge>
                    : n.clicked_at ? <Badge>clicada</Badge>
                    : n.delivered_at ? <Badge variant="secondary">entregue</Badge>
                    : <Badge variant="outline">pendente</Badge>}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell text-xs text-muted-foreground">{new Date(n.sent_at).toLocaleString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ============ Page header helper ============
const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    {action}
  </div>
);

// ============ Dashboard ============
const KpiCard = ({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: string }) => (
  <div className="rounded-xl border bg-card p-5 shadow-card">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', accent || 'bg-primary/10 text-primary')}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <p className="text-3xl font-semibold mt-3 tracking-tight">{value}</p>
  </div>
);

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [{ count: total }, { count: withMonths }, { count: openBugs }, { data: status }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('months').select('user_id', { count: 'exact', head: true }),
        supabase.from('bug_reports').select('*', { count: 'exact', head: true }).in('status', ['new', 'analyzing', 'fixing']),
        supabase.from('system_settings').select('value').eq('key', 'system_status').single(),
      ]);
      return {
        total: total ?? 0,
        active: withMonths ?? 0,
        openBugs: openBugs ?? 0,
        maintenance: status?.value === 'maintenance',
      };
    },
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do sistema." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Usuários totais" value={stats?.total ?? '—'} icon={UsersIcon} />
        <KpiCard label="Usuários ativos" value={stats?.active ?? '—'} icon={Activity} accent="bg-finzap-green/10 text-[hsl(var(--finzap-green))]" />
        <KpiCard label="Bugs em aberto" value={stats?.openBugs ?? '—'} icon={BugIcon} accent="bg-orange-500/10 text-orange-500" />
        <KpiCard
          label="Status sistema"
          value={stats?.maintenance ? 'Manutenção' : 'Ativo'}
          icon={AlertCircle}
          accent={stats?.maintenance ? 'bg-destructive/10 text-destructive' : 'bg-finzap-green/10 text-[hsl(var(--finzap-green))]'}
        />
      </div>
    </div>
  );
};

// ============ Users ============
const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const filtered = users.filter(u => !search || (u.name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Usuários" description={`${users.length} usuário(s) cadastrado(s).`} />
      <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm mb-4" />
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="sm:hidden divide-y">
          {filtered.map(u => (
            <div key={u.id} className="px-4 py-3">
              <p className="text-sm font-medium">{u.name || '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ Tutorials ============
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
      if (editingId) await supabase.from('tutorials').update(payload).eq('id', editingId);
      else await supabase.from('tutorials').insert(payload);
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
    <div>
      <PageHeader
        title="Tutoriais"
        description="Vídeos exibidos na seção de ajuda."
        action={<Button onClick={openNew} size="sm"><Plus className="h-4 w-4" /> Novo</Button>}
      />
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tutorials.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{t.display_order}</TableCell>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
              <div className="flex items-center gap-2 pt-7"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativo</Label></div>
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

// ============ Settings ============
const AdminSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await supabase.from('system_settings').select('*')).data ?? [],
  });
  const { data: subCount } = useQuery({
    queryKey: ['admin-push-sub-count'],
    queryFn: async () => (await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).not('endpoint', 'like', '%permanently-removed.invalid%')).count ?? 0,
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
      queryClient.invalidateQueries({ queryKey: ['system-status-admin'] });
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
    if (subCount === 0) return toast.error('Nenhum dispositivo inscrito');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { title: 'FinZap', body: testMessage || 'Teste de notificação 🚀', type: 'test', broadcast: true },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['admin-push-sub-count'] });
      const sent = data?.sent ?? 0;
      if (sent > 0) toast.success(`Push enviado: ${sent}/${data?.total} dispositivo(s)`);
      else toast.error(data?.message || 'Nenhum dispositivo inscrito');
      setTestMessage('');
    } catch (err: any) {
      toast.error('Erro ao enviar push');
    } finally { setSending(false); }
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Ajustes globais do sistema." />
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Status do sistema</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isMaintenance ? 'Sistema em manutenção. Apenas admins podem acessar.' : 'Sistema ativo. Todos os usuários podem acessar.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleStatus}
              disabled={saveSetting.isPending}
              className={cn('flex-1 sm:flex-none px-4 h-9 rounded-md text-sm font-medium transition-colors',
                !isMaintenance ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}
            >Ativo</button>
            <button
              onClick={toggleStatus}
              disabled={saveSetting.isPending}
              className={cn('flex-1 sm:flex-none px-4 h-9 rounded-md text-sm font-medium transition-colors',
                isMaintenance ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}
            >Manutenção</button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Notificação de teste</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subCount != null ? `${subCount} inscrição(ões) ativa(s)` : 'Carregando...'}</p>
          </div>
          <Input value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Mensagem (opcional)" />
          <Button onClick={sendTestPush} disabled={sending} size="sm">{sending ? 'Enviando...' : 'Enviar notificação'}</Button>
        </div>

        {[
          { key: 'app_name', label: 'Nome do sistema' },
          { key: 'global_message', label: 'Mensagem global (página de manutenção)' },
        ].map(({ key, label }) => (
          <div key={key} className="rounded-xl border bg-card p-5 space-y-3">
            <Label className="text-sm font-semibold">{label}</Label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Input value={getSetting(key)} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} className="flex-1" />
              <Button onClick={() => saveSetting.mutate({ key, value: values[key] ?? getSetting(key) })} disabled={saveSetting.isPending} size="sm">Salvar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ Subscriptions wrapper ============
const AdminSubscriptionsPage = () => (
  <div>
    <PageHeader title="Assinaturas" description="Gerencie planos e datas de expiração." />
    <AdminSubscriptions />
  </div>
);

// ============ Main ============
const Admin = () => (
  <AdminLayout>
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="bugs" element={<AdminBugs />} />
      <Route path="tutorials" element={<AdminTutorials />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
      <Route path="notifications" element={<AdminNotifications />} />
    </Routes>
  </AdminLayout>
);

export default Admin;