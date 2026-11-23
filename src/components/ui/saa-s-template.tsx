import React from "react";
import { ArrowRight, Menu, X } from "lucide-react";

type NavLink = { label: string; onClick: () => void };

export interface SaasHeroProps {
  logo?: React.ReactNode;
  links?: NavLink[];
  onSignIn?: () => void;
  onSignUp?: () => void;
  signInLabel?: string;
  signUpLabel?: string;
  badgeText?: string;
  badgeLinkText?: string;
  onBadgeClick?: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  /** conteúdo exibido como prévia do produto; por padrão uma imagem */
  preview?: React.ReactNode;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "gradient";
  size?: "sm" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "sm", className = "", children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
    const variants = {
      default: "bg-foreground text-background hover:opacity-90",
      ghost: "text-foreground hover:bg-muted/40",
      gradient: "bg-gradient-to-b from-foreground via-foreground/95 to-foreground/60 text-background hover:scale-105 active:scale-95",
    };
    const sizes = { sm: "h-10 px-5 text-sm", lg: "h-12 px-8 text-base" };
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export default function SaasHero({
  logo = <span className="text-xl font-semibold">Logo</span>,
  links = [],
  onSignIn,
  onSignUp,
  signInLabel = "Entrar",
  signUpLabel = "Criar conta",
  badgeText,
  badgeLinkText,
  onBadgeClick,
  title,
  subtitle,
  ctaLabel = "Começar",
  onCta,
  preview,
}: SaasHeroProps) {
  const [open, setOpen] = React.useState(false);
  const go = (fn?: () => void) => () => { setOpen(false); fn?.(); };

  return (
    <div className="dark relative bg-background text-foreground">
      <style>{`
        @keyframes saasFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes saasSlideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
      `}</style>

      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>{logo}</div>
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {links.map((l) => (
                <button key={l.label} type="button" onClick={l.onClick} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={onSignIn}>{signInLabel}</Button>
              <Button onClick={onSignUp}>{signUpLabel}</Button>
            </div>
            <button type="button" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menu">
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-border/50 animate-[saasSlideDown_0.3s_ease-out]">
            <div className="px-6 py-4 flex flex-col gap-2">
              {links.map((l) => (
                <button key={l.label} type="button" onClick={go(l.onClick)} className="text-left text-sm text-muted-foreground hover:text-foreground py-2">
                  {l.label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" onClick={go(onSignIn)}>{signInLabel}</Button>
                <Button onClick={go(onSignUp)}>{signUpLabel}</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="relative flex flex-col items-center px-6 pt-28 pb-10 md:pt-32" style={{ animation: "saasFadeIn 0.6s ease-out" }}>
        {badgeText && (
          <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/50 backdrop-blur-sm max-w-full">
            <span className="text-xs text-muted-foreground">{badgeText}</span>
            {badgeLinkText && (
              <button type="button" onClick={onBadgeClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-95">
                {badgeLinkText} <ArrowRight size={12} />
              </button>
            )}
          </aside>
        )}

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl leading-tight mb-6 bg-gradient-to-b from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent" style={{ letterSpacing: "-0.05em" }}>
          {title}
        </h1>

        {subtitle && <p className="text-sm md:text-base text-center max-w-2xl mb-10 text-muted-foreground">{subtitle}</p>}

        <div className="flex items-center gap-4 relative z-10 mb-16">
          <Button variant="gradient" size="lg" className="rounded-lg" onClick={onCta}>
            {ctaLabel} <ArrowRight size={18} />
          </Button>
        </div>

        <div className="w-full max-w-5xl relative pb-10">
          <div className="absolute left-1/2 w-[90%] pointer-events-none z-0" style={{ top: "-23%", transform: "translateX(-50%)" }} aria-hidden="true">
            <img src="https://cdn.21st.dev/assets/mirror/ab/abe6d8090cc14780b846eee062024e4e03274c99d38188554239cd312a7180fa.png" alt="" className="w-full h-auto" loading="eager" />
          </div>
          <div className="relative z-10">
            {preview ?? (
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80" alt="Prévia do painel" className="w-full h-auto rounded-lg shadow-2xl" loading="eager" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
