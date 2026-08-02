import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import {
  ArrowRight, ShieldCheck, Lock, Clock, CheckCircle2, XCircle,
  Wallet, Scale, Brain, Sparkles, TrendingUp, Eye, AlertTriangle,
  Repeat, Target, Calendar, Smartphone, Shield, Bell, Plus, Check,
  ShoppingBag, Film, Banknote, Plane, Monitor, GraduationCap,
  PiggyBank, Home, Lightbulb, ChevronRight, CircleAlert,
  Zap, Star, Quote, Rocket, Users, Award, HelpCircle, Database, Fingerprint,
} from 'lucide-react';
import finzapLogo from '@/assets/finzap-logo-icon.png';
import './landing.css';
import { PWAInstallBanner } from '@/components/app/PWAInstallBanner';

type Tab = 'visao-geral' | 'cofrinhos' | 'cartoes' | 'decisao';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { isMaintenanceMode, isLoading: statusLoading } = useSystemStatus();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('visao-geral');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statusLoading || isLoading) return;
    if (isMaintenanceMode) { navigate('/maintenance', { replace: true }); return; }
    if (user) navigate('/app');
  }, [user, isLoading, isMaintenanceMode, statusLoading, navigate]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reveal = () => {
      root.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add('visible');
      });
    };
    const onScroll = () => { setScrolled(window.scrollY > 30); reveal(); };
    root.querySelectorAll('.problema-card, .step-item, .section-header, .demo-container, .compare-table, .cta-content, .proof-item, .trust-card, .journey-step, .depo-card, .faq-item, .plan-card')
      .forEach((el) => el.classList.add('fade-up'));
    root.querySelectorAll('.beneficio-item').forEach((el) => el.classList.add('fade-right'));
    root.querySelectorAll('.beneficios-left').forEach((el) => el.classList.add('fade-left'));
    reveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // SEO: dynamic meta + JSON-LD
  useEffect(() => {
    document.title = 'FinZap — Decisão financeira inteligente';
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', 'App financeiro que mostra o impacto de cada gasto antes da decisão. Cofrinhos, orçamento e reserva automática em um só lugar.');
    setMeta('keywords', 'app financeiro inteligente, controle financeiro premium, organização financeira pessoal, app de orçamento, controle de gastos, planejamento financeiro, cofrinhos, reserva de emergência, decisão financeira, finanças pessoais com IA');
    setMeta('og:title', 'FinZap — Decisão financeira inteligente', 'property');
    setMeta('og:description', 'Pare de descobrir onde gastou. Decida antes. O sistema financeiro pessoal mais inteligente para quem quer controle real.', 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'FinZap — Decisão financeira inteligente');
    setMeta('twitter:description', 'Pare de descobrir onde gastou. Decida antes.');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin + '/';

    const ldId = 'finzap-jsonld';
    document.getElementById(ldId)?.remove();
    const script = document.createElement('script');
    script.id = ldId; script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'FinZap',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web, iOS, Android',
      description: 'App de gestão financeira pessoal com sistema de cofrinhos, decisão antes de gastar e cálculo automático de reserva de emergência.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', ratingCount: '128' },
    });
    document.head.appendChild(script);
  }, []);

  const goAuth = () => navigate('/auth');
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
    setMenuOpen(false);
  };

  const LogoMark = ({ size = 28 }: { size?: number }) => (
    <img
      src={finzapLogo}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="logo-mark-img"
      style={{ width: size, height: size }}
    />
  );

  return (
    <div ref={rootRef} className="finzap-landing">
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="logo" aria-label="FinZap">
            <LogoMark />
            <span>Fin<span className="logo-accent">Zap</span></span>
          </a>
          <div className="nav-links">
            <a className="nav-link" onClick={() => scrollTo('problema')}>Problema</a>
            <a className="nav-link" onClick={() => scrollTo('solucao')}>Solução</a>
            <a className="nav-link" onClick={() => scrollTo('demo')}>Demo</a>
            <a className="nav-link" onClick={() => scrollTo('beneficios')}>Benefícios</a>
          </div>
          <div className="nav-cta">
            <button onClick={goAuth} className="btn btn-ghost">Entrar</button>
            <button onClick={goAuth} className="btn btn-primary">Começar grátis</button>
          </div>
          <button className="hamburger" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
            <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px,5px)' } : undefined} />
            <span style={menuOpen ? { opacity: 0 } : undefined} />
            <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px,-5px)' } : undefined} />
          </button>
        </div>
        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a className="mobile-link" onClick={() => scrollTo('problema')}>Problema</a>
          <a className="mobile-link" onClick={() => scrollTo('solucao')}>Solução</a>
          <a className="mobile-link" onClick={() => scrollTo('demo')}>Demo</a>
          <a className="mobile-link" onClick={() => scrollTo('beneficios')}>Benefícios</a>
          <button onClick={goAuth} className="btn btn-ghost w-full">Entrar</button>
          <button onClick={goAuth} className="btn btn-primary w-full">Começar grátis</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="container hero-content">
          <div className="hero-text">
            <div className="badge">
              <span className="badge-dot" />
              Sistema de decisão financeira
            </div>
            <h1 className="hero-headline">
              Seu dinheiro,<br />
              <span className="gradient-text">finalmente</span> sob<br />
              o seu comando.
            </h1>
            <p className="hero-sub">
              Pare de descobrir para onde foi o seu dinheiro <strong>depois</strong>. O FinZap te mostra o impacto exato de cada gasto <strong>antes</strong> de você decidir — para você terminar todo mês com clareza, sobra e tranquilidade.
            </p>
            <div className="hero-cta">
              <button onClick={goAuth} className="btn btn-primary btn-lg">
                <span>Começar agora — é grátis</span><ArrowRight size={18} />
              </button>
              <button onClick={goAuth} className="btn btn-outline btn-lg">Já tenho conta</button>
            </div>
            <div className="hero-trust">
              <div className="trust-item"><Lock /> Criptografia bancária</div>
              <div className="trust-item"><Clock /> Pronto em 30 segundos</div>
              <div className="trust-item"><CheckCircle2 /> Sem cartão de crédito</div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="dashboard-mock">
              <div className="dash-header">
                <div className="dash-greeting">Boa noite, Marcos</div>
                <div className="dash-date">Maio · 2026</div>
              </div>
              <div className="dash-balance-card">
                <div className="dash-balance-label">Saldo disponível para gastar</div>
                <div className="dash-balance-value">R$ 3.240<span className="dash-cents">,00</span></div>
                <div className="dash-balance-bar"><div className="dash-balance-bar-fill" style={{ width: '68%' }} /></div>
                <div className="dash-balance-info">
                  <span>Orçamento: R$ 4.800</span>
                  <span className="safe-label"><CheckCircle2 size={12} /> No controle</span>
                </div>
              </div>
              <div className="dash-section-label">Cofrinhos do mês</div>
              <div className="dash-jars">
                {[
                  { I: ShoppingBag, n: 'Mercado & alimentação', w: '55%', g: 'linear-gradient(90deg,#10B981,#059669)', bg: 'rgba(16,185,129,0.14)', c: '#34D399', v: 'R$ 330', l: '/ R$ 600' },
                  { I: Film, n: 'Lazer & assinaturas',         w: '80%', g: 'linear-gradient(90deg,#F59E0B,#D97706)', bg: 'rgba(245,158,11,0.14)', c: '#FBBF24', v: 'R$ 240', l: '/ R$ 300' },
                  { I: Home, n: 'Moradia & contas fixas',      w: '100%',g: 'linear-gradient(90deg,#3B82F6,#2563EB)', bg: 'rgba(59,130,246,0.14)', c: '#60A5FA', v: 'R$ 1.200', l: '/ R$ 1.200' },
                ].map((j) => (
                  <div key={j.n} className="jar-item">
                    <div className="jar-icon" style={{ background: j.bg, color: j.c }}><j.I /></div>
                    <div className="jar-info">
                      <div className="jar-name">{j.n}</div>
                      <div className="jar-bar"><div className="jar-bar-fill" style={{ width: j.w, background: j.g }} /></div>
                      <div className="jar-values"><span>{j.v}</span><span className="jar-limit">{j.l}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dash-decision">
                <div className="decision-title"><Zap size={13} /> Análise de decisão</div>
                <div className="decision-body">
                  <div className="decision-choice safe"><span className="decision-badge">Recomendado</span><span className="decision-amount">R$ 100</span></div>
                  <div className="decision-vs">ou</div>
                  <div className="decision-choice risky"><span className="decision-badge">Risco</span><span className="decision-amount">R$ 140</span></div>
                </div>
              </div>
            </div>
            <div className="float-card float-1">
              <div className="float-icon" style={{ background: 'rgba(16,185,129,0.14)', color: '#34D399' }}><ShieldCheck /></div>
              <div><div className="float-title">Reserva de emergência</div><div className="float-value">4,2 meses protegidos</div></div>
            </div>
            <div className="float-card float-2">
              <div className="float-icon" style={{ background: 'rgba(59,130,246,0.14)', color: '#60A5FA' }}><TrendingUp /></div>
              <div><div className="float-title">Sobra deste mês</div><div className="float-value float-green">+ R$ 560,00</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="section" id="problema">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">A verdade desconfortável</p>
            <h2 className="section-title">Saldo positivo não é o mesmo que <span className="gradient-text">controle</span>.</h2>
            <p className="section-desc">Você não está sem dinheiro. Você está sem <strong>visibilidade</strong>. E é isso que destrói qualquer mês — não importa quanto você ganhe.</p>
          </div>
          <div className="problema-grid">
            {[
              { I: Eye,           t: 'Você acha que tem — até não ter mais.', d: 'O saldo no app sugere folga. Aí o boleto chega, a fatura fecha, e o que parecia tranquilo vira aperto. Falta visibilidade do que ainda vai sair.', tag: 'Falsa folga' },
              { I: AlertTriangle, t: 'Os pequenos gastos drenam tudo.',       d: 'R$ 18 no café, R$ 32 no delivery, R$ 27 numa "besteira". Cada um parece nada. Juntos, viram centenas que somem do mês sem aviso.',                tag: 'Vazamentos invisíveis' },
              { I: Brain,         t: 'Você decide no susto, não no cálculo.', d: 'Surge um gasto não planejado. Você pensa "será que dá?", responde no impulso e descobre o estrago só na próxima fatura.',                          tag: 'Decisão no escuro' },
              { I: Repeat,        t: 'O ciclo se repete todo mês.',           d: 'Começa bem, vai apertando, termina devendo. No mês seguinte, mesma coisa. Sem um sistema, é matemática: você não sai do lugar.',                  tag: 'Padrão travado' },
            ].map((p) => (
              <div key={p.t} className="problema-card">
                <div className="problema-icon"><p.I /></div>
                <div className="problema-content"><h3>{p.t}</h3><p>{p.d}</p></div>
                <div className="problema-tag">{p.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section className="section section-solucao" id="solucao">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Como o FinZap funciona</p>
            <h2 className="section-title">Não é mais um app de gastos. É um <span className="gradient-text">sistema de decisão</span>.</h2>
            <p className="section-desc">Aplicativos comuns te mostram onde você gastou. O FinZap te força a <strong>decidir antes</strong> — quando ainda dá para mudar o final do mês.</p>
          </div>

          <div className="solucao-steps">
            <div className="step-item">
              <div className="step-visual">
                <div className="step-number">01</div>
                <div className="step-icon-big"><Wallet /></div>
              </div>
              <div className="step-content">
                <h3 className="step-title">Cofrinhos: cada real com um propósito</h3>
                <p className="step-desc">No FinZap, dinheiro <strong>não fica solto</strong> na conta. Você distribui automaticamente em cofrinhos — alimentação, moradia, lazer, reserva, metas. Cada decisão de gasto vem de algum lugar concreto.</p>
                <ul className="step-list">
                  <li><Check /> Você sabe exatamente <strong>de onde</strong> está tirando ao gastar</li>
                  <li><Check /> Limites visuais que mudam de cor antes de você estourar</li>
                  <li><Check /> Distribuição automática quando o salário entra</li>
                </ul>
                <div className="step-highlight">
                  <span className="highlight-icon"><Lightbulb /></span>
                  <span>Aplicativos comuns só registram. Aqui você <strong>decide com clareza</strong>, antes do clique.</span>
                </div>
              </div>
            </div>

            <div className="step-item step-reverse">
              <div className="step-visual">
                <div className="step-number">02</div>
                <div className="step-icon-big"><Scale /></div>
              </div>
              <div className="step-content">
                <h3 className="step-title">Análise de decisão em tempo real</h3>
                <p className="step-desc">Vai gastar? O FinZap simula o impacto antes do clique e mostra <strong>qual valor te mantém estável</strong> — e qual compromete o resto do mês.</p>
                <div className="decision-demo">
                  <div className="decision-demo-title">Cenário real</div>
                  <div className="decision-demo-cards">
                    <div className="demo-card demo-safe">
                      <div className="demo-card-label">Decisão segura</div>
                      <div className="demo-card-value">R$ 100</div>
                      <div className="demo-card-desc">Mantém todos os cofrinhos no verde</div>
                    </div>
                    <div className="demo-card-vs">vs.</div>
                    <div className="demo-card demo-risky">
                      <div className="demo-card-label">Decisão arriscada</div>
                      <div className="demo-card-value">R$ 140</div>
                      <div className="demo-card-desc">Estoura o lazer e mexe na reserva</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-visual">
                <div className="step-number">03</div>
                <div className="step-icon-big"><Shield /></div>
              </div>
              <div className="step-content">
                <h3 className="step-title">Reserva de emergência calculada por você — automaticamente</h3>
                <p className="step-desc">O FinZap analisa seus custos fixos e mostra <strong>exatamente quantos meses</strong> de tranquilidade você já conquistou — e quanto falta para a meta.</p>
                <div className="reserva-demo">
                  <div className="reserva-formula">
                    <div className="reserva-item"><span className="reserva-label">Custo fixo</span><span className="reserva-value">R$ 3.200</span></div>
                    <div className="reserva-operator">×</div>
                    <div className="reserva-item"><span className="reserva-label">Meses-meta</span><span className="reserva-value">6</span></div>
                    <div className="reserva-operator">=</div>
                    <div className="reserva-item reserva-result"><span className="reserva-label">Reserva ideal</span><span className="reserva-value reserva-highlight">R$ 19.200</span></div>
                  </div>
                  <div className="reserva-progress-label"><span>Progresso atual</span><span className="reserva-months">4,2 meses protegidos</span></div>
                  <div className="reserva-bar"><div className="reserva-bar-fill" style={{ width: '70%' }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="section section-demo" id="demo">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Veja por dentro</p>
            <h2 className="section-title">A interface que faz seu dinheiro <span className="gradient-text">parecer simples</span>.</h2>
            <p className="section-desc">Sem planilhas. Sem complexidade. Uma interface que você abre rápido, decide rápido e fecha sentindo controle.</p>
          </div>
          <div className="demo-container">
            <div className="demo-tabs">
              {[
                { k: 'visao-geral', l: 'Visão Geral' },
                { k: 'cofrinhos',   l: 'Cofrinhos' },
                { k: 'cartoes',     l: 'Cartões' },
                { k: 'decisao',     l: 'Decisão' },
              ].map((t) => (
                <button key={t.k} className={`demo-tab ${activeTab === t.k ? 'active' : ''}`} onClick={() => setActiveTab(t.k as Tab)}>{t.l}</button>
              ))}
            </div>

            {activeTab === 'visao-geral' && (
              <div className="demo-panel">
                <div className="demo-app">
                  <div className="app-header">
                    <div className="app-logo"><LogoMark size={22} /> FinZap</div>
                    <div className="app-top-actions"><Bell /><div className="app-avatar">M</div></div>
                  </div>
                  <div className="app-body">
                    <div className="app-greeting">Boa noite, Marcos</div>
                    <div className="app-summary-cards">
                      <div className="summary-card summary-green"><div className="sc-label">Disponível</div><div className="sc-value">R$ 3.240</div><div className="sc-sub">68% do orçamento</div></div>
                      <div className="summary-card summary-blue"><div className="sc-label">Comprometido</div><div className="sc-value">R$ 1.560</div><div className="sc-sub">Fixos + variáveis</div></div>
                      <div className="summary-card summary-yellow"><div className="sc-label">Reserva</div><div className="sc-value">R$ 13.440</div><div className="sc-sub">4,2 meses</div></div>
                    </div>
                    <div className="app-section-title">Orçamento de maio</div>
                    <div>
                      <div className="budget-bar-wrap"><div className="budget-bar-fill" style={{ width: '68%' }}><span className="budget-bar-label">68%</span></div></div>
                      <div className="budget-info"><span>Usado: R$ 3.264</span><span>Total: R$ 4.800</span></div>
                    </div>
                    <div className="app-section-title">Movimentações recentes</div>
                    <div className="app-transactions">
                      <div className="txn-item"><div className="txn-icon txn-out"><ShoppingBag /></div><div className="txn-info"><div className="txn-name">iFood</div><div className="txn-cat">Alimentação · Hoje</div></div><div className="txn-amount txn-neg">− R$ 38,90</div></div>
                      <div className="txn-item"><div className="txn-icon txn-out"><Film /></div><div className="txn-info"><div className="txn-name">Netflix</div><div className="txn-cat">Assinaturas · Ontem</div></div><div className="txn-amount txn-neg">− R$ 55,90</div></div>
                      <div className="txn-item"><div className="txn-icon txn-in"><Banknote /></div><div className="txn-info"><div className="txn-name">Salário · Empresa</div><div className="txn-cat">Receita · 05/05</div></div><div className="txn-amount txn-pos">+ R$ 5.200,00</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cofrinhos' && (
              <div className="demo-panel">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo"><LogoMark size={22} /> FinZap</div><div className="app-title-center">Meus cofrinhos</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="cofrinhos-grid">
                      {[
                        { I: Shield,         n: 'Reserva de emergência', v: 'R$ 13.440', w: '70%',  bg: 'linear-gradient(135deg,#10B981,#047857)', a: '4,2 meses', b: 'meta: 6 meses' },
                        { I: Plane,          n: 'Viagem Nordeste',       v: 'R$ 800',    w: '40%',  bg: 'linear-gradient(135deg,#06B6D4,#0E7490)', a: '40%',       b: 'de R$ 2.000' },
                        { I: Monitor,        n: 'Setup home office',     v: 'R$ 1.260',  w: '63%',  bg: 'linear-gradient(135deg,#6366F1,#4338CA)', a: '63%',       b: 'de R$ 2.000' },
                        { I: GraduationCap,  n: 'Faculdade & cursos',    v: 'R$ 540',    w: '45%',  bg: 'linear-gradient(135deg,#F59E0B,#B45309)', a: '45%',       b: 'de R$ 1.200' },
                        { I: PiggyBank,      n: 'Investimentos',         v: 'R$ 2.180',  w: '85%',  bg: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', a: '85%',       b: 'aporte mensal' },
                        { I: Home,           n: 'Moradia & contas',      v: 'R$ 1.200',  w: '100%', bg: 'linear-gradient(135deg,#64748B,#334155)', a: '100%',      b: 'de R$ 1.200' },
                      ].map((c) => (
                        <div key={c.n} className="cofrinho-card">
                          <div className="cf-head">
                            <div className="cf-icon" style={{ background: c.bg }}><c.I /></div>
                            <div className="cf-name">{c.n}</div>
                          </div>
                          <div className="cf-value">{c.v}</div>
                          <div className="cf-bar"><div className="cf-bar-fill" style={{ width: c.w, background: c.bg }} /></div>
                          <div className="cf-info"><span>{c.a}</span><span>{c.b}</span></div>
                        </div>
                      ))}
                      <div className="cofrinho-card cf-add">
                        <div className="cf-add-icon"><Plus /></div>
                        <div className="cf-add-text">Novo cofrinho</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cartoes' && (
              <div className="demo-panel">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo"><LogoMark size={22} /> FinZap</div><div className="app-title-center">Cartões</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="cards-list">
                      {[
                        { c: 'nubank-card', b: 'Nubank',  n: '•••• •••• •••• 4321', u: 'R$ 1.240', d: 'R$ 3.760', w: '25%' },
                        { c: 'c6-card',     b: 'C6 Bank', n: '•••• •••• •••• 8899', u: 'R$ 900',   d: 'R$ 2.100', w: '30%' },
                        { c: 'itau-card',   b: 'Itaú',    n: '•••• •••• •••• 5566', u: 'R$ 460',   d: 'R$ 1.540', w: '23%' },
                      ].map((card) => (
                        <div key={card.b} className={`bank-card ${card.c}`}>
                          <div className="card-brand-row">
                            <div className="card-brand">{card.b}</div>
                            <div className="card-chip" />
                          </div>
                          <div className="card-number">{card.n}</div>
                          <div className="card-info-row">
                            <div><div className="card-label">Limite usado</div><div className="card-value-sm">{card.u}</div></div>
                            <div><div className="card-label">Disponível</div><div className="card-value-sm">{card.d}</div></div>
                          </div>
                          <div className="card-limit-bar"><div className="card-limit-fill" style={{ width: card.w }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'decisao' && (
              <div className="demo-panel">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo"><LogoMark size={22} /> FinZap</div><div className="app-title-center">Analisar decisão</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="decisao-context">
                      <div className="decisao-ctx-label">Sua situação agora</div>
                      <div className="decisao-ctx-info">
                        <span><Wallet /> Saldo: R$ 3.240</span>
                        <span><Film /> Lazer disponível: R$ 60</span>
                      </div>
                    </div>
                    <div>
                      <div className="dq-label">Quanto você quer gastar em lazer agora?</div>
                      <div className="decisao-options">
                        <div className="decisao-opt opt-safe">
                          <div className="opt-header"><span className="opt-badge opt-badge-safe"><CheckCircle2 /> Recomendado</span></div>
                          <div className="opt-value">R$ 50,00</div>
                          <div className="opt-desc">Sobram R$ 10 no cofrinho.<br />Reserva intacta.</div>
                          <div className="opt-result safe-result">Você termina o mês no controle</div>
                        </div>
                        <div className="decisao-opt opt-risky">
                          <div className="opt-header"><span className="opt-badge opt-badge-risky"><AlertTriangle /> Arriscado</span></div>
                          <div className="opt-value">R$ 140,00</div>
                          <div className="opt-desc">Cofrinho fica negativo.<br />Precisa puxar da reserva.</div>
                          <div className="opt-result risky-result">Compromete o restante do mês</div>
                        </div>
                      </div>
                    </div>
                    <div className="decisao-insight">
                      <span className="insight-icon"><Brain /></span>
                      <span>Com R$ 50 você curte e mantém o controle. Com R$ 140, você abre uma brecha que custa três semanas de aperto. <strong>É a mesma noite — com finais diferentes.</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="section section-beneficios" id="beneficios">
        <div className="container">
          <div className="beneficios-layout">
            <div className="beneficios-left">
              <p className="section-tag">O que muda na sua vida</p>
              <h2 className="section-title">Mais do que controle. <span className="gradient-text">Liberdade financeira real.</span></h2>
              <p className="section-desc">Quem usa o FinZap não sente que está "se segurando". Sente que está, finalmente, <strong>no comando</strong>.</p>
              <button onClick={goAuth} className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
                Começar agora <ArrowRight size={18} />
              </button>
            </div>
            <div className="beneficios-right">
              {[
                { I: Target,     t: 'Você sabe o que pode gastar agora — sem culpa, sem medo', d: 'Em tempo real, o sistema te diz o valor seguro. Acabaram os "será que dá?". Acabaram os arrependimentos.' },
                { I: Calendar,   t: 'Final de mês deixa de ser sufoco', d: 'Com cofrinhos alocados antes, você nunca mais chega no dia 25 sem entender para onde foi o salário.' },
                { I: Brain,      t: 'Decisões financeiras viram hábito inteligente', d: 'Toda compra passa por uma análise simples. Em poucas semanas, você decide melhor sem nem perceber.' },
                { I: Smartphone, t: 'Interface que cabe na sua rotina', d: 'Sem planilhas, sem complexidade. Abre, decide, fecha. Funciona no celular, no impulso, na vida real.' },
                { I: Shield,     t: 'Reserva calculada e acompanhada por você', d: 'Você vê exatamente quantos meses está protegido — e o que falta para dormir tranquilo.' },
                { I: Sparkles,   t: 'Confiança que se reflete fora das finanças', d: 'Quando o dinheiro está no lugar, a cabeça também fica. Você decide melhor em outras áreas da vida.' },
              ].map((b) => (
                <div key={b.t} className="beneficio-item">
                  <div className="ben-icon"><b.I /></div>
                  <div className="ben-content"><h3>{b.t}</h3><p>{b.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPARAÇÃO */}
      <section className="section section-compare" id="compare">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">FinZap vs. apps comuns</p>
            <h2 className="section-title">A diferença está em <span className="gradient-text">quando</span> você decide.</h2>
            <p className="section-desc">Apps comuns te ajudam a olhar para trás. O FinZap te ajuda a <strong>olhar para frente</strong>.</p>
          </div>
          <div className="compare-table">
            <div className="compare-col">
              <div className="compare-col-header"><CircleAlert /> <span>Apps comuns</span></div>
              <div className="compare-row bad"><XCircle /> Mostram onde você gastou — depois</div>
              <div className="compare-row bad"><XCircle /> Saldo único, misturado, sem contexto</div>
              <div className="compare-row bad"><XCircle /> Nenhuma análise antes do gasto</div>
              <div className="compare-row bad"><XCircle /> Reserva manual, sempre esquecida</div>
              <div className="compare-row bad"><XCircle /> Você ainda decide no escuro</div>
            </div>
            <div className="compare-col compare-finzap">
              <div className="compare-col-header finzap-header"><Zap /> <span>FinZap</span></div>
              <div className="compare-row good"><CheckCircle2 /> Mostra o impacto <strong>antes</strong> de gastar</div>
              <div className="compare-row good"><CheckCircle2 /> Cofrinhos por finalidade, com limite vivo</div>
              <div className="compare-row good"><CheckCircle2 /> Análise de decisão em tempo real</div>
              <div className="compare-row good"><CheckCircle2 /> Reserva calculada e acompanhada</div>
              <div className="compare-row good"><CheckCircle2 /> Você decide com clareza absoluta</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section section-cta" id="cta">
        <div className="cta-bg" />
        <div className="container cta-content">
          <div className="cta-badge"><Zap /> Comece em 30 segundos</div>
          <h2 className="cta-headline">Ou você comanda seu dinheiro,<br /><span className="gradient-text">ou ele continua comandando você.</span></h2>
          <p className="cta-sub">Quem termina o mês bem não ganha mais — <strong>decide melhor</strong>. O FinZap te entrega exatamente essa vantagem.</p>
          <button onClick={goAuth} className="btn btn-primary btn-xl">
            <span>Criar minha conta grátis</span><ArrowRight size={20} />
          </button>
          <p className="cta-disclaimer">Sem cartão · Cadastro em 30 segundos · Cancele quando quiser</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="logo">
              <LogoMark />
              <span>Fin<span className="logo-accent">Zap</span></span>
            </a>
            <p className="footer-tagline">O sistema que transforma a forma como você decide com o seu dinheiro.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Produto</h4>
              <a onClick={() => scrollTo('solucao')}>Como funciona</a>
              <a onClick={() => scrollTo('demo')}>Demonstração</a>
              <a onClick={() => scrollTo('beneficios')}>Benefícios</a>
            </div>
            <div className="footer-col">
              <h4>Acesso</h4>
              <a onClick={goAuth}>Criar conta</a>
              <a onClick={goAuth}>Entrar</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a onClick={() => navigate('/legal/privacidade')}>Privacidade</a>
              <a onClick={() => navigate('/legal/termos')}>Termos de uso</a>
              <a onClick={() => navigate('/legal/consentimento')}>Consentimento</a>
              <a onClick={() => navigate('/legal/seguranca')}>Segurança</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>© {new Date().getFullYear()} FinZap. Todos os direitos reservados.</span>
            <span className="footer-made">Feito para quem quer <strong>decidir</strong>, não só registrar.</span>
          </div>
        </div>
      </footer>
      <PWAInstallBanner />
    </div>
  );
};

export default Index;
