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
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-2 py-2 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
            aria-label="Voltar"
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

      <main className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-7 overflow-x-clip px-4 py-7 pb-[max(2rem,env(safe-area-inset-bottom))] sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Documentos
          </p>
          <nav className="flex w-full max-w-full flex-wrap gap-1.5 overflow-visible pb-1 lg:flex-col lg:pb-0">
            {LEGAL_NAV.map(item => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition lg:min-h-0 lg:rounded-lg',
                    active
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-border/60 bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground lg:border-transparent lg:bg-transparent',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0 max-w-full overflow-x-clip">
          <div className="mb-8 min-w-0 max-w-full border-b border-border/60 pb-7 sm:mb-9">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
            <h1 className="max-w-full text-[25px] font-semibold leading-[1.16] tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-[34px]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.75] text-muted-foreground [overflow-wrap:anywhere] sm:text-[15.5px]">{description}</p>
            )}
            <p className="mt-4 text-[11.5px] text-muted-foreground/80 sm:text-[12px]">
              Última atualização · <span className="text-foreground/80">{updatedAt}</span>
            </p>
          </div>

          <div
            className={cn(
              'w-full max-w-[66ch] min-w-0 text-[15.5px] leading-[1.82] text-foreground/90 [overflow-wrap:anywhere] sm:text-[16px]',
              '[&_*]:min-w-0 [&_*]:max-w-full [&_section]:scroll-mt-24',
              '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:leading-[1.25] [&_h2]:tracking-normal [&_h2]:text-foreground [&_h2]:[overflow-wrap:anywhere] sm:[&_h2]:mt-11 sm:[&_h2]:text-[21px]',
              '[&_h3]:mt-7 [&_h3]:mb-2.5 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:leading-[1.35] [&_h3]:text-foreground [&_h3]:[overflow-wrap:anywhere]',
              '[&_p]:my-4 [&_p]:text-foreground/85 [&_p]:[overflow-wrap:anywhere]',
              '[&_ul]:my-4 [&_ul]:space-y-2.5 [&_ul]:pl-4 sm:[&_ul]:pl-5 [&_ul>li]:list-disc [&_li]:pl-1 [&_li]:text-foreground/85 [&_li]:leading-[1.78] [&_li]:[overflow-wrap:anywhere]',
              '[&_strong]:font-semibold [&_strong]:text-foreground',
              '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 [&_a]:[overflow-wrap:anywhere] hover:[&_a]:underline',
              '[&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:[overflow-wrap:anywhere]',
            )}
          >
            {children}
          </div>

          <div className="mt-11 max-w-[66ch] rounded-2xl border border-border/60 bg-card/60 p-4 sm:mt-12 sm:p-6">
            <p className="text-[13px] font-semibold text-foreground">Dúvidas sobre seus dados?</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              Fale com nosso encarregado de dados (DPO) através de{' '}
              <a href="mailto:finzapsuporte@gmail.com" className="font-medium text-primary break-all hover:underline">
                finzapsuporte@gmail.com
              </a>
              . Respondemos em até 15 dias.
            </p>
          </div>

          <div className="mt-7 flex max-w-[66ch] flex-col gap-3 text-[11.5px] leading-relaxed text-muted-foreground/80 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-[12px]">
            <span>© {new Date().getFullYear()} FinZap · CNPJ em constituição</span>
            <div className="flex flex-wrap gap-3">
              {LEGAL_NAV.filter(n => n.to !== pathname).slice(0, 3).map(n => (
                <Link key={n.to} to={n.to} className="hover:text-foreground">{n.label}</Link>
              ))}
            </div>
          </div>
        </article>
      </main>
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
    warning: 'border-[hsl(var(--finzap-amber)/0.3)] bg-[hsl(var(--finzap-amber)/0.05)]',
  } as const;
  return (
    <div className={cn('my-6 max-w-full rounded-xl border p-4 [overflow-wrap:anywhere] sm:p-5', tones[tone])}>
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <div className="mt-2 text-[14px] leading-[1.75] text-foreground/85 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
};
