import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureContext } from '@/lib/deviceInfo';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Bug, Upload, X, Check, ImageIcon, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'visual', label: 'Bug visual' },
  { value: 'financial', label: 'Problema financeiro' },
  { value: 'recurring', label: 'Recorrências' },
  { value: 'cofrinhos', label: 'Cofrinhos' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'open_finance', label: 'Open Finance' },
  { value: 'performance', label: 'Lentidão' },
  { value: 'other', label: 'Outro' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Baixa', dot: 'bg-muted-foreground/40' },
  { value: 'medium', label: 'Média', dot: 'bg-primary/70' },
  { value: 'high', label: 'Alta', dot: 'bg-orange-500' },
  { value: 'critical', label: 'Crítica', dot: 'bg-destructive' },
] as const;

const MAX_IMAGES = 3;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const schema = z.object({
  title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres'),
  description: z.string().trim().min(10, 'Mínimo 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
  category: z.enum(['visual','financial','recurring','cofrinhos','dashboard','open_finance','performance','other']),
  priority: z.enum(['low','medium','high','critical']),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BugReportModal = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [priority, setPriority] = useState<string>('medium');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('other'); setPriority('medium');
    previews.forEach(URL.revokeObjectURL);
    setImages([]); setPreviews([]); setSuccess(false);
  };

  const handleClose = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED.includes(f.type)) { toast.error(`${f.name}: formato não suportado`); continue; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: máximo 5MB`); continue; }
      valid.push(f);
    }
    const room = MAX_IMAGES - images.length;
    const next = valid.slice(0, room);
    if (valid.length > room) toast.error(`Máximo ${MAX_IMAGES} imagens`);
    if (!next.length) return;
    setImages(prev => [...prev, ...next]);
    setPreviews(prev => [...prev, ...next.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setImages(images.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const submit = async () => {
    if (!user) return toast.error('Você precisa estar logado');
    const parsed = schema.safeParse({ title, description, category, priority });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setSubmitting(true);
    try {
      const ctx = captureContext();
      const { data: report, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          priority: parsed.data.priority,
          ...ctx,
        })
        .select('id')
        .single();
      if (error) throw error;

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/${report.id}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('bug-screenshots')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        await supabase.from('bug_report_screenshots').insert({
          bug_report_id: report.id,
          user_id: user.id,
          storage_path: path,
        });
      }

      setSuccess(true);
      setTimeout(() => { handleClose(false); }, 1600);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar relatório', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        {success ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-finzap-green/15 flex items-center justify-center mb-5 animate-rise-in">
              <Check className="h-8 w-8 text-[hsl(var(--finzap-green))]" />
            </div>
            <h3 className="text-xl font-semibold">Relatório enviado</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Obrigado por ajudar a melhorar o FinZap. Nossa equipe vai analisar em breve.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bug className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base">Reportar um problema</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Descreva o que aconteceu — quanto mais detalhes, melhor.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Título</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Saldo do mês não aparece"
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="O que aconteceu? O que você esperava?"
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Prioridade</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 h-9 rounded-md border text-xs font-medium transition-all',
                          priority === p.value
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Anexos ({images.length}/{MAX_IMAGES})
                </Label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    'rounded-xl border border-dashed p-4 text-center cursor-pointer transition-colors',
                    dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-input hover:bg-muted/40',
                    images.length >= MAX_IMAGES && 'opacity-50 pointer-events-none'
                  )}
                >
                  <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Clique para enviar</span> ou arraste
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WEBP · até 5MB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED.join(',')}
                    multiple
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>

                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                        <img src={src} alt={`Anexo ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 backdrop-blur flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remover"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2 bg-muted/20">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={submitting} className="min-w-[120px]">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar relatório'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};