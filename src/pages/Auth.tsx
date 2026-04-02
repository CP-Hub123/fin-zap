import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Logo } from '@/components/app/Logo';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Digite seu email');
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast.success('Se este email estiver cadastrado, você receberá um link de recuperação.');
    setShowForgot(false);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
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
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar.');
      }
    }
    setLoading(false);
  };

  if (showForgot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center"><Logo /></div>
            <CardDescription>Digite seu email para recuperar a senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <button onClick={() => setShowForgot(false)} className="text-primary font-medium hover:underline">
                Voltar ao login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center"><Logo /></div>
          <div>
            <CardDescription className="mt-1">
              {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          {isLogin && (
            <div className="mt-2 text-center">
              <button onClick={() => setShowForgot(true)} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                Esqueci minha senha
              </button>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? 'Criar conta' : 'Fazer login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
