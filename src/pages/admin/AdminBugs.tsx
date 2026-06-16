import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Bug, ImageOff, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AdminErrorState } from '@/components/admin/AdminErrorState';

const STATUS = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'analyzing', label: 'Em análise' },
  { value: 'fixing', label: 'Corrigindo' },
  { value: 'resolved', label: 'Resolvidos' },
  { value: 'ignored', label: 'Ignorados' },
];
const STATUS_LABEL: Record<string, string> = {
  new: 'Novo', analyzing: 'Em análise', fixing: 'Corrigindo', resolved: 'Resolvido', ignored: 'Ignorado',
};
const PRIORITIES = [
  { value: 'all', label: 'Todas' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];
const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'visual', label: 'Visual' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'recurring', label: 'Recorrências' },
  { value: 'cofrinhos', label: 'Cofrinhos' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'open_finance', label: 'Open Finance' },
  { value: 'performance', label: 'Lentidão' },
  { value: 'other', label: 'Outro' },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const priorityChip = (p: string) => {
  const map: Record<string, string> = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    medium: 'bg-primary/10 text-primary border-primary/20',
    low: 'bg-muted text-muted-foreground border-border',
  };
  return map[p] || map.medium;
};
const statusChip = (s: string) => {
  const map: Record<string, string> = {
    new: 'bg-primary/10 text-primary border-primary/20',
    analyzing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    fixing: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    resolved: 'bg-finzap-green/10 text-[hsl(var(--finzap-green))] border-finzap-green/20',
    ignored: 'bg-muted text-muted-foreground border-border',
  };
  return map[s] || map.new;
};

interface BugRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  route: string | null;
  device_info: any;
  browser_info: any;
  screen_size: string | null;
  theme: string | null;
  app_version: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profile_name?: string | null;
}

export const AdminBugs = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BugRow | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const { data: bugs = [], isLoading, error } = useQuery({
    queryKey: ['admin-bugs'],
    queryFn: async () => {
      const { data: rows, error: rowsErr } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (rowsErr) throw rowsErr;
      const ids = Array.from(new Set((rows ?? []).map(r => r.user_id)));
      let profiles: any[] = [];
      if (ids.length) {
        const { data, error: profErr } = await supabase
          .from('profiles').select('id, name').in('id', ids);
        if (profErr) throw profErr;
        profiles = data ?? [];
      }
      const map = new Map((profiles ?? []).map(p => [p.id, p.name]));
      return (rows ?? []).map(r => ({ ...r, profile_name: map.get(r.user_id) ?? '—' })) as BugRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bugs.filter(b =>
      (status === 'all' || b.status === status) &&
      (priority === 'all' || b.priority === priority) &&
      (category === 'all' || b.category === category) &&
      (!term || b.title.toLowerCase().includes(term) || b.description.toLowerCase().includes(term))
    );
  }, [bugs, status, priority, category, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bugs.length };
    bugs.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [bugs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bugs reportados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centralize e gerencie os relatos enviados pelos usuários.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto max-w-full">
        {STATUS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={cn(
              'px-3 h-8 rounded-md text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-1.5',
              status === s.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.label}
            <span className="text-[10px] opacity-60">{counts[s.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="pl-9"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>Prioridade: {p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>Categoria: {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Carregando...</div>
      ) : error ? (
        <AdminErrorState error={error} title="Falha ao carregar bugs" />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed bg-transparent shadow-none">
          <Bug className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum bug encontrado com esses filtros.</p>
        </Card>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {filtered.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={cn(
                'w-full text-left px-4 sm:px-5 py-4 hover:bg-muted/40 transition-colors flex items-start gap-3 sm:gap-4',
                idx > 0 && 'border-t'
              )}
            >
              <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', {
                'bg-destructive': b.priority === 'critical',
                'bg-orange-500': b.priority === 'high',
                'bg-primary': b.priority === 'medium',
                'bg-muted-foreground/40': b.priority === 'low',
              })} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', statusChip(b.status))}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className={cn('px-1.5 py-0.5 rounded border', priorityChip(b.priority))}>
                    {CATEGORY_LABEL[b.category]}
                  </span>
                  <span>{b.profile_name}</span>
                  <span>·</span>
                  <span>{new Date(b.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  {b.route && (<><span>·</span><code className="text-[10px]">{b.route}</code></>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <BugDetailSheet
        bug={selected}
        onClose={() => setSelected(null)}
        onPreview={setPreviewImg}
        onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-bugs'] })}
      />

      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <img src={previewImg} alt="Screenshot" className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

const BugDetailSheet = ({
  bug, onClose, onPreview, onUpdated,
}: {
  bug: BugRow | null;
  onClose: () => void;
  onPreview: (url: string) => void;
  onUpdated: () => void;
}) => {
  const [status, setStatus] = useState<string>(bug?.status ?? 'new');
  const [notes, setNotes] = useState<string>(bug?.admin_notes ?? '');
  const [saving, setSaving] = useState(false);

  // sync when bug changes
  useMemo(() => {
    if (bug) { setStatus(bug.status); setNotes(bug.admin_notes ?? ''); }
  }, [bug?.id]);

  const { data: screenshots = [] } = useQuery({
    queryKey: ['bug-screenshots', bug?.id],
    enabled: !!bug,
    queryFn: async () => {
      const { data: rows, error: rowsErr } = await supabase
        .from('bug_report_screenshots')
        .select('id, storage_path')
        .eq('bug_report_id', bug!.id);
      if (rowsErr) throw rowsErr;
      const out: { id: string; url: string }[] = [];
      for (const r of rows ?? []) {
        const { data } = await supabase.storage
          .from('bug-screenshots')
          .createSignedUrl(r.storage_path, 3600);
        if (data?.signedUrl) out.push({ id: r.id, url: data.signedUrl });
      }
      return out;
    },
  });

  const save = async () => {
    if (!bug) return;
    setSaving(true);
    const { error } = await supabase
      .from('bug_reports')
      .update({ status: status as any, admin_notes: notes })
      .eq('id', bug.id);
    setSaving(false);
    if (error) return toast.error('Erro ao salvar', { description: error.message });
    toast.success('Atualizado');
    onUpdated();
    onClose();
  };

  return (
    <Sheet open={!!bug} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {bug && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-start gap-2">
                <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', {
                  'bg-destructive': bug.priority === 'critical',
                  'bg-orange-500': bug.priority === 'high',
                  'bg-primary': bug.priority === 'medium',
                  'bg-muted-foreground/40': bug.priority === 'low',
                })} />
                <SheetTitle className="text-base text-left">{bug.title}</SheetTitle>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 pl-4">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', priorityChip(bug.priority))}>
                  {bug.priority}
                </span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', statusChip(bug.status))}>
                  {STATUS_LABEL[bug.status]}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground">
                  {CATEGORY_LABEL[bug.category]}
                </span>
              </div>
            </SheetHeader>

            <div className="px-6 py-5 space-y-6">
              <section>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{bug.description}</p>
              </section>

              <section>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Screenshots</h4>
                {screenshots.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    <ImageOff className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    Nenhuma imagem anexada
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map(s => (
                      <button
                        key={s.id}
                        onClick={() => onPreview(s.url)}
                        className="aspect-square rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                      >
                        <img src={s.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Contexto</h4>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <Meta label="Usuário" value={bug.profile_name ?? '—'} />
                  <Meta label="Data" value={new Date(bug.created_at).toLocaleString('pt-BR')} />
                  <Meta label="Rota" value={bug.route ?? '—'} mono />
                  <Meta label="Tela" value={bug.screen_size ?? '—'} />
                  <Meta label="Tema" value={bug.theme ?? '—'} />
                  <Meta label="Versão" value={bug.app_version ?? '—'} />
                  <Meta label="Dispositivo" value={bug.device_info?.type ?? '—'} />
                  <Meta label="OS" value={bug.device_info?.os ?? '—'} />
                  <Meta label="Navegador" value={bug.browser_info?.name ?? '—'} />
                  <Meta label="Idioma" value={bug.device_info?.language ?? '—'} />
                </dl>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gerenciar</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.filter(s => s.value !== 'all').map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Notas internas</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Anotações privadas do admin..." className="resize-none" />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-background flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Meta = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={cn('truncate text-foreground', mono && 'font-mono text-[11px]')} title={value}>{value}</dd>
  </>
);