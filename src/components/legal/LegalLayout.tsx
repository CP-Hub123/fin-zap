import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Cookie, Lock, FileCheck2 } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { cn } from '@/lib/utils';

export const LEGAL_NAV = [
  { to: '/legal/privacidade', label: 'Privacidade', icon: ShieldCheck },
  { to: '/legal/termos', label: 'Termos de Uso', icon: FileText },
  { to: '/legal/consentimento', label: 'Consentimento', icon: FileCheck2 },
  { to: '/legal/cookies', label: 'Cookies', icon: Cookie },
  { to: '/legal/seguranca', label: 'Segurança', icon: Lock },
];

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  updatedAt?: string;
  children: ReactNode;
}

export const LegalLayout = ({
  eyebrow = 'Documento legal',
  title,
  description,
  updatedAt = '13 de maio de 2026',
  children,
}: Props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <Link to="/" className="flex items-center gap-2"><Logo size="small" /></Link>
          <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            Central legal
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Documentos
          </p>
          <nav className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {LEGAL_NAV.map(item => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition',
                    active
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="mb-8 border-b border-border/60 pb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[34px]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
            )}
            <p className="mt-4 text-[12px] text-muted-foreground/80">
              Última atualização · <span className="text-foreground/80">{updatedAt}</span>
            </p>
          </div>

          <div
            className={cn(
              'max-w-none text-[15px] leading-[1.75] text-foreground/90',
              '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground',
              '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground',
              '[&_p]:my-3 [&_p]:text-foreground/85',
              '[&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul>li]:list-disc [&_li]:text-foreground/85',
              '[&_strong]:font-semibold [&_strong]:text-foreground',
              '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
            )}
          >
            {children}
          </div>

          <div className="mt-12 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
            <p className="text-[13px] font-semibold text-foreground">Dúvidas sobre seus dados?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Fale com nosso encarregado de dados (DPO) através de{' '}
              <a href="mailto:privacidade@finzap.app" className="font-medium text-primary hover:underline">
                privacidade@finzap.app
              </a>
              . Respondemos em até 15 dias.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground/80">
            <span>© {new Date().getFullYear()} FinZap · CNPJ em constituição</span>
            <div className="flex flex-wrap gap-3">
              {LEGAL_NAV.filter(n => n.to !== pathname).slice(0, 3).map(n => (
                <Link key={n.to} to={n.to} className="hover:text-foreground">{n.label}</Link>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);

export const LegalCallout = ({
  tone = 'primary',
  title,
  children,
}: {
  tone?: 'primary' | 'success' | 'warning';
  title: string;
  children: ReactNode;
}) => {
  const tones = {
    primary: 'border-primary/30 bg-primary/5',
    success: 'border-[hsl(var(--finzap-green))]/30 bg-[hsl(var(--finzap-green))]/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
  } as const;
  return (
    <div className={cn('my-5 rounded-xl border p-4 sm:p-5', tones[tone])}>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <div className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
};
