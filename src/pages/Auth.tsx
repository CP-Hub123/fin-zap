import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Logo } from '@/components/app/Logo';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Loader2, Mail, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react';

const GoogleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34.6 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8L6.1 33C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 6.9-5 6.9-15 0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
);

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/app',
      });
      if (result.error) {
        toast.error('Não foi possível conectar com o Google. Tente novamente.');
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate('/app');
    } catch {
      toast.error('Erro inesperado ao entrar com Google.');
      setGoogleLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Digite seu email');
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast.success('Se este email estiver cadastrado, você receberá um link de recuperação.');
    setMode('login');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
      } else {
        navigate('/app');
      }
    } else {
      if (password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, name);
      if (error) toast.error(error.message);
      else toast.success('Conta criada! Verifique seu email para confirmar.');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-8 sm:py-12"
         style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.08),transparent_60%)]" />
      </div>

      <div className="w-full max-w-[420px] animate-rise-in">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex justify-center"><Logo /></div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground sm:text-[28px]">
            {mode === 'login' && 'Bem-vindo de volta'}
            {mode === 'signup' && 'Crie sua conta'}
            {mode === 'forgot' && 'Recuperar acesso'}
          </h1>
          <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted-foreground">
            {mode === 'login' && 'Continue de onde parou. Suas finanças, no controle.'}
            {mode === 'signup' && 'Comece em segundos. Sem cartão, sem fricção.'}
            {mode === 'forgot' && 'Enviaremos um link seguro para o seu email.'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_8px_30px_-12px_hsl(var(--foreground)/0.12)] backdrop-blur-xl sm:p-7">
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background text-[15px] font-medium text-foreground transition-all duration-200 hover:border-foreground/20 hover:bg-accent/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{googleLoading ? 'Conectando…' : 'Continuar com Google'}</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">ou com email</span>
                <div className="h-px flex-1 bg-border/70" />
              </div>
            </>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" inputMode="email" autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="h-12 w-full text-[15px]" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar link de recuperação'}
              </Button>
              <button type="button" onClick={() => setMode('login')}
                className="mx-auto flex items-center gap-1.5 text-[13px] text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" autoComplete="name" value={name}
                      onChange={e => setName(e.target.value)} placeholder="Seu nome" required className="pl-10" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" inputMode="email" autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required className="pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')}
                      className="text-[12px] font-medium text-muted-foreground transition hover:text-primary">
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="h-12 w-full text-[15px]" disabled={loading || googleLoading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'login' ? 'Entrando…' : 'Criando conta…'}</>
                ) : (
                  mode === 'login' ? 'Entrar' : 'Criar conta'
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        {mode !== 'forgot' && (
          <p className="mt-6 text-center text-[13.5px] text-muted-foreground">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}{' '}
            <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-foreground underline-offset-4 transition hover:text-primary hover:underline">
              {mode === 'login' ? 'Criar conta gratuita' : 'Entrar'}
            </button>
          </p>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Conexão segura · Criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
