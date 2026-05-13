import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Loader2, Trash2, LogOut, Mail, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const CONFIRM_WORD = "EXCLUIR";

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD && !loading;

  async function handleDelete() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirm: CONFIRM_WORD },
      });
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message || "Erro");
      }
      toast({ title: "Conta excluída", description: "Seus dados foram removidos com sucesso." });
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({
        title: "Não foi possível excluir",
        description: e?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-semibold tracking-tight">Conta</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-8">
        {/* Identidade */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <UserCircle2 className="h-3.5 w-3.5" /> Sua conta
          </div>
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">
                {(user?.user_metadata as { name?: string } | undefined)?.name ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> E-mail
              </p>
              <p className="text-sm font-medium break-all">{user?.email}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair desta conta
            </Button>
          </div>
        </section>

        {/* Zona de perigo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Zona de perigo
          </div>
          <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.03] p-5 space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold">Excluir conta</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sua conta e seus dados financeiros — transações, cartões, recorrências, cofrinhos,
                preferências e notificações — serão removidos permanentemente. Essa ação não pode
                ser desfeita.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setConfirmText("");
                setOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir minha conta
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Em conformidade com a LGPD, você pode solicitar a exclusão completa dos seus dados
              a qualquer momento. Assinaturas ativas serão canceladas automaticamente.
            </p>
          </div>
        </section>
      </main>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir conta permanentemente</DialogTitle>
            <DialogDescription>
              Você está prestes a remover sua conta e todos os dados associados. Essa ação é
              imediata e não poderá ser revertida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed pl-4 list-disc marker:text-destructive/60">
              <li>Transações, cartões, parcelas e recorrências</li>
              <li>Cofrinhos, metas e fechamentos mensais</li>
              <li>Preferências, notificações e sessões ativas</li>
              <li>Assinaturas e vínculos de pagamento</li>
            </ul>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs">
                Para confirmar, digite <span className="font-semibold text-foreground">{CONFIRM_WORD}</span>
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={CONFIRM_WORD}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canConfirm}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir conta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}