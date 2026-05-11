import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import './landing.css';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { isMaintenanceMode, isLoading: statusLoading } = useSystemStatus();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'cofrinhos' | 'cartoes' | 'decisao'>('visao-geral');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statusLoading || isLoading) return;
    if (isMaintenanceMode) {
      navigate('/maintenance', { replace: true });
      return;
    }
    if (user) navigate('/app');
  }, [user, isLoading, isMaintenanceMode, statusLoading, navigate]);

  // Scroll behaviors: navbar shadow + reveal animations + scroll indicator fade
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reveal = () => {
      root.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add('visible');
      });
    };
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      reveal();
    };
    // Tag elements
    root.querySelectorAll('.problema-card, .step-item, .section-header, .demo-container, .compare-table, .cta-content').forEach((el) =>
      el.classList.add('fade-up'),
    );
    root.querySelectorAll('.beneficio-item').forEach((el) => el.classList.add('fade-right'));
    root.querySelectorAll('.beneficios-left').forEach((el) => el.classList.add('fade-left'));
    reveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goAuth = () => navigate('/auth');
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  const Arrow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );

  return (
    <div ref={rootRef} className="finzap-landing">
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Fin<span className="logo-accent">Zap</span></span>
          </a>
          <div className="nav-links">
            <a className="nav-link" onClick={() => scrollTo('problema')}>Problema</a>
            <a className="nav-link" onClick={() => scrollTo('solucao')}>Solução</a>
            <a className="nav-link" onClick={() => scrollTo('demo')}>Demo</a>
            <a className="nav-link" onClick={() => scrollTo('beneficios')}>Benefícios</a>
          </div>
          <div className="nav-cta">
            <button onClick={goAuth} className="btn btn-ghost">Entrar</button>
            <button onClick={goAuth} className="btn btn-primary">Criar conta</button>
          </div>
          <button
            className="hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
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
          <button onClick={goAuth} className="btn btn-primary w-full">Criar conta</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="hero-bg" />
        <div className="hero-diagonal" />
        <div className="container hero-content">
          <div className="hero-text">
            <div className="badge">
              <span className="badge-dot" />
              Sistema de Decisão Financeira
            </div>
            <h1 className="hero-headline">
              Você não está<br />
              <span className="gradient-text">sem dinheiro.</span><br />
              Você está sem controle.
            </h1>
            <p className="hero-sub">
              O FinZap mostra exatamente para onde seu dinheiro vai — e te obriga a <strong>decidir melhor</strong> antes de gastar.
            </p>
            <div className="hero-cta">
              <button onClick={goAuth} className="btn btn-primary btn-lg pulse-btn">
                <span>Criar conta grátis</span><Arrow />
              </button>
              <button onClick={goAuth} className="btn btn-outline btn-lg">Já tenho conta</button>
            </div>
            <div className="hero-trust">
              <div className="trust-item"><span className="trust-icon">🔒</span><span>100% seguro</span></div>
              <div className="trust-item"><span className="trust-icon">⚡</span><span>Cadastro em 30 segundos</span></div>
              <div className="trust-item"><span className="trust-icon">✅</span><span>Sem cartão de crédito</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-mock">
              <div className="dash-header">
                <div className="dash-greeting">Olá, Marcos 👋</div>
                <div className="dash-date">Abril 2026</div>
              </div>
              <div className="dash-balance-card">
                <div className="dash-balance-label">Saldo disponível</div>
                <div className="dash-balance-value">R$ 3.240<span className="dash-cents">,00</span></div>
                <div className="dash-balance-bar"><div className="dash-balance-bar-fill" style={{ width: '68%' }} /></div>
                <div className="dash-balance-info"><span>Orçamento: R$ 4.800</span><span className="safe-label">✅ Seguro</span></div>
              </div>
              <div className="dash-section-label">Cofrinhos</div>
              <div className="dash-jars">
                {[
                  { i: '🍽️', n: 'Alimentação', w: '55%', g: 'linear-gradient(90deg,#22C55E,#16a34a)', v: 'R$ 330', l: '/ R$ 600' },
                  { i: '🎮', n: 'Lazer', w: '80%', g: 'linear-gradient(90deg,#F59E0B,#d97706)', v: 'R$ 240', l: '/ R$ 300' },
                  { i: '🏠', n: 'Contas fixas', w: '100%', g: 'linear-gradient(90deg,#3A7BFF,#2563eb)', v: 'R$ 1.200', l: '/ R$ 1.200' },
                ].map((j) => (
                  <div key={j.n} className="jar-item">
                    <div className="jar-icon">{j.i}</div>
                    <div className="jar-info">
                      <div className="jar-name">{j.n}</div>
                      <div className="jar-bar"><div className="jar-bar-fill" style={{ width: j.w, background: j.g }} /></div>
                      <div className="jar-values"><span>{j.v}</span><span className="jar-limit">{j.l}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dash-decision">
                <div className="decision-title">⚡ Análise de decisão</div>
                <div className="decision-body">
                  <div className="decision-choice safe"><span className="decision-badge">✅ Recomendado</span><span className="decision-amount">R$ 100</span></div>
                  <div className="decision-vs">ou</div>
                  <div className="decision-choice risky"><span className="decision-badge">⚠️ Risco</span><span className="decision-amount">R$ 140</span></div>
                </div>
              </div>
            </div>
            <div className="float-card float-1"><span className="float-icon">🛡️</span><div><div className="float-title">Reserva de emergência</div><div className="float-value">4,2 meses protegidos</div></div></div>
            <div className="float-card float-2"><span className="float-icon">📈</span><div><div className="float-title">Economia este mês</div><div className="float-value float-green">+R$ 560,00</div></div></div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="section section-problema" id="problema">
        <div className="container">
          <div className="section-header">
            <p className="section-tag">Você se identifica?</p>
            <h2 className="section-title">A ilusão do saldo <span className="gradient-text">positivo</span></h2>
            <p className="section-desc">Ter dinheiro na conta não significa que você pode gastar. O problema é que você não sabe <strong>para onde ele vai ir</strong>.</p>
          </div>
          <div className="problema-grid">
            {[
              { i: '😰', t: '"Você acha que tem dinheiro…"', d: 'Você olha o saldo e parece que está bem. Aí chega o boleto, o aluguel, a fatura — e de repente você não sabe onde foi parar.', tag: 'Falta de clareza' },
              { i: '☕', t: '"Gasta em pequenas coisas..."', d: 'R$ 15 aqui, R$ 30 ali. Individualmente parece nada. Mas no fim do mês, você perdeu centenas de reais sem perceber.', tag: 'Gastos invisíveis' },
              { i: '🤔', t: '"Não sei se posso pagar isso agora"', d: 'Surgiu um gasto. Você quer comprar. Mas fica aquela dúvida: "Se eu pagar isso, vou me ferrar no final do mês?"', tag: 'Insegurança' },
              { i: '🔄', t: '"Todo mês o mesmo ciclo"', d: 'Começa bem, vai gastando sem perceber, sofre no final. Mês que vem: repete. Sem sistema, é impossível sair desse ciclo.', tag: 'Ciclo vicioso' },
            ].map((p) => (
              <div key={p.t} className="problema-card">
                <div className="problema-icon">{p.i}</div>
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
            <p className="section-tag">Como o FinZap resolve</p>
            <h2 className="section-title">Não é controle — é <span className="gradient-text">decisão</span></h2>
            <p className="section-desc">Aplicativos comuns mostram onde você gastou. O FinZap te <strong>obriga a decidir antes</strong> de gastar.</p>
          </div>
          <div className="solucao-steps">
            <div className="step-item">
              <div className="step-visual"><div className="step-number">01</div><div className="step-icon-big">🪣</div></div>
              <div className="step-content">
                <h3 className="step-title">Sistema de Cofrinhos</h3>
                <p className="step-desc">Seu dinheiro <strong>não fica solto</strong>. Cada real é alocado em um cofrinho: Alimentação, Lazer, Contas, Reserva...</p>
                <ul className="step-list">
                  <li>✅ Para gastar, você retira de um cofrinho específico</li>
                  <li>✅ Isso cria consciência em cada decisão</li>
                  <li>✅ Você nunca gasta "do nada" — sabe exatamente de onde vem</li>
                </ul>
                <div className="step-highlight"><span className="highlight-icon">💡</span><span>Diferente de apps comuns que só registram: aqui você <strong>decide antes</strong>.</span></div>
              </div>
            </div>
            <div className="step-item step-reverse">
              <div className="step-visual"><div className="step-number">02</div><div className="step-icon-big">⚖️</div></div>
              <div className="step-content">
                <h3 className="step-title">Análise de Decisão em Tempo Real</h3>
                <p className="step-desc">Surgiu um gasto? O FinZap analisa <strong>qual opção é mais segura</strong> para o seu momento financeiro atual.</p>
                <div className="decision-demo">
                  <div className="decision-demo-title">Exemplo real:</div>
                  <div className="decision-demo-cards">
                    <div className="demo-card demo-safe"><div className="demo-card-label">✅ Recomendado</div><div className="demo-card-value">R$ 100</div><div className="demo-card-desc">Mantém você seguro</div></div>
                    <div className="demo-card-vs">ou</div>
                    <div className="demo-card demo-risky"><div className="demo-card-label">⚠️ Risco</div><div className="demo-card-value">R$ 140</div><div className="demo-card-desc">Compromete lazer</div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-visual"><div className="step-number">03</div><div className="step-icon-big">🛡️</div></div>
              <div className="step-content">
                <h3 className="step-title">Reserva de Emergência Automática</h3>
                <p className="step-desc">O FinZap calcula automaticamente sua reserva de emergência e mostra <strong>quantos meses você está protegido</strong>.</p>
                <div className="reserva-demo">
                  <div className="reserva-formula">
                    <div className="reserva-item"><span className="reserva-label">Custo mensal</span><span className="reserva-value">R$ 3.200</span></div>
                    <div className="reserva-operator">×</div>
                    <div className="reserva-item"><span className="reserva-label">Meta</span><span className="reserva-value">6 meses</span></div>
                    <div className="reserva-operator">=</div>
                    <div className="reserva-item reserva-result"><span className="reserva-label">Reserva ideal</span><span className="reserva-value reserva-highlight">R$ 19.200</span></div>
                  </div>
                  <div className="reserva-progress-label"><span>Sua reserva atual</span><span className="reserva-months">4,2 meses protegidos</span></div>
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
            <p className="section-tag">Veja na prática</p>
            <h2 className="section-title">O FinZap em <span className="gradient-text">ação</span></h2>
            <p className="section-desc">Uma visão real de como o dashboard funciona — simples, direto, poderoso.</p>
          </div>
          <div className="demo-container">
            <div className="demo-tabs">
              {[
                { k: 'visao-geral', l: 'Visão Geral' },
                { k: 'cofrinhos', l: 'Cofrinhos' },
                { k: 'cartoes', l: 'Cartões' },
                { k: 'decisao', l: 'Decisão' },
              ].map((t) => (
                <button
                  key={t.k}
                  className={`demo-tab ${activeTab === t.k ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.k as typeof activeTab)}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {activeTab === 'visao-geral' && (
              <div className="demo-panel active">
                <div className="demo-app">
                  <div className="app-header">
                    <div className="app-logo">⚡ FinZap</div>
                    <div className="app-top-actions"><div className="app-notif">🔔</div><div className="app-avatar">M</div></div>
                  </div>
                  <div className="app-body">
                    <div className="app-greeting">Bom dia, Marcos!</div>
                    <div className="app-summary-cards">
                      <div className="summary-card summary-green"><div className="sc-label">Disponível</div><div className="sc-value">R$ 3.240</div><div className="sc-sub">↑ 12% este mês</div></div>
                      <div className="summary-card summary-blue"><div className="sc-label">Comprometido</div><div className="sc-value">R$ 1.560</div><div className="sc-sub">Fixos + variáveis</div></div>
                      <div className="summary-card summary-yellow"><div className="sc-label">Reserva</div><div className="sc-value">R$ 13.440</div><div className="sc-sub">4,2 meses</div></div>
                    </div>
                    <div className="app-section-title">Orçamento do mês</div>
                    <div className="app-budget">
                      <div className="budget-bar-wrap"><div className="budget-bar-fill" style={{ width: '68%' }}><span className="budget-bar-label">68%</span></div></div>
                      <div className="budget-info"><span>Usado: R$ 3.264</span><span>Total: R$ 4.800</span></div>
                    </div>
                    <div className="app-section-title">Últimas movimentações</div>
                    <div className="app-transactions">
                      <div className="txn-item"><div className="txn-icon txn-out">🍔</div><div className="txn-info"><div className="txn-name">iFood</div><div className="txn-cat">📦 Alimentação</div></div><div className="txn-amount txn-neg">- R$ 38,90</div></div>
                      <div className="txn-item"><div className="txn-icon txn-out">🎬</div><div className="txn-info"><div className="txn-name">Netflix</div><div className="txn-cat">🎮 Lazer</div></div><div className="txn-amount txn-neg">- R$ 55,90</div></div>
                      <div className="txn-item"><div className="txn-icon txn-in">💰</div><div className="txn-info"><div className="txn-name">Salário</div><div className="txn-cat">✅ Receita</div></div><div className="txn-amount txn-pos">+ R$ 5.200</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cofrinhos' && (
              <div className="demo-panel active">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo">⚡ FinZap</div><div className="app-title-center">Meus Cofrinhos</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="cofrinhos-grid">
                      {[
                        { c: 'cf-green', e: '🍽️', n: 'Alimentação', v: 'R$ 330', w: '55%', bg: '#22C55E', a: '55%', b: 'de R$ 600' },
                        { c: 'cf-yellow', e: '🎮', n: 'Lazer', v: 'R$ 240', w: '80%', bg: '#F59E0B', a: '80%', b: 'de R$ 300' },
                        { c: 'cf-blue', e: '🏠', n: 'Contas Fixas', v: 'R$ 1.200', w: '100%', bg: '#3A7BFF', a: '100%', b: 'de R$ 1.200' },
                        { c: 'cf-purple', e: '✈️', n: 'Viagem', v: 'R$ 800', w: '40%', bg: '#8B5CF6', a: '40%', b: 'de R$ 2.000' },
                        { c: 'cf-teal', e: '🛡️', n: 'Reserva', v: 'R$ 13.440', w: '70%', bg: '#14B8A6', a: '4,2 meses', b: 'meta: 6' },
                      ].map((c) => (
                        <div key={c.n} className={`cofrinho-card ${c.c}`}>
                          <div className="cf-emoji">{c.e}</div>
                          <div className="cf-name">{c.n}</div>
                          <div className="cf-value">{c.v}</div>
                          <div className="cf-bar"><div className="cf-bar-fill" style={{ width: c.w, background: c.bg }} /></div>
                          <div className="cf-info"><span>{c.a}</span><span>{c.b}</span></div>
                        </div>
                      ))}
                      <div className="cofrinho-card cf-add"><div className="cf-emoji">➕</div><div className="cf-name cf-add-text">Novo cofrinho</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cartoes' && (
              <div className="demo-panel active">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo">⚡ FinZap</div><div className="app-title-center">Cartões</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="cards-list">
                      {[
                        { c: 'nubank-card', b: 'Nubank', n: '•••• •••• •••• 4321', u: 'R$ 1.240', d: 'R$ 3.760', w: '25%', bg: undefined as string | undefined },
                        { c: 'c6-card', b: 'C6 Bank', n: '•••• •••• •••• 8899', u: 'R$ 900', d: 'R$ 2.100', w: '30%', bg: '#F59E0B' },
                        { c: 'itau-card', b: 'Itaú', n: '•••• •••• •••• 5566', u: 'R$ 460', d: 'R$ 1.540', w: '23%', bg: '#f97316' },
                      ].map((card) => (
                        <div key={card.b} className={`bank-card ${card.c}`}>
                          <div className="card-brand">{card.b}</div>
                          <div className="card-number">{card.n}</div>
                          <div className="card-info-row">
                            <div><div className="card-label">Limite usado</div><div className="card-value-sm">{card.u}</div></div>
                            <div><div className="card-label">Disponível</div><div className="card-value-sm">{card.d}</div></div>
                          </div>
                          <div className="card-limit-bar"><div className="card-limit-fill" style={{ width: card.w, ...(card.bg ? { background: card.bg } : {}) }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'decisao' && (
              <div className="demo-panel active">
                <div className="demo-app">
                  <div className="app-header"><div className="app-logo">⚡ FinZap</div><div className="app-title-center">Analisar Decisão</div><div className="app-top-actions"><div className="app-avatar">M</div></div></div>
                  <div className="app-body">
                    <div className="decisao-context">
                      <div className="decisao-ctx-label">Situação atual</div>
                      <div className="decisao-ctx-info"><span>💰 Saldo: R$ 3.240</span><span>📦 Lazer: R$ 60 restando</span></div>
                    </div>
                    <div className="decisao-question">
                      <div className="dq-label">Você quer gastar em lazer:</div>
                      <div className="decisao-options">
                        <div className="decisao-opt opt-safe">
                          <div className="opt-header"><span className="opt-badge opt-badge-safe">✅ Recomendado</span></div>
                          <div className="opt-value">R$ 50,00</div>
                          <div className="opt-desc">Sobram R$ 10 no cofrinho<br />Reserva: intacta</div>
                          <div className="opt-result safe-result">✅ Decisão segura</div>
                        </div>
                        <div className="decisao-opt opt-risky">
                          <div className="opt-header"><span className="opt-badge opt-badge-risky">⚠️ Risco</span></div>
                          <div className="opt-value">R$ 140,00</div>
                          <div className="opt-desc">Cofrinho: negativo<br />Precisaria retirar da reserva</div>
                          <div className="opt-result risky-result">⚠️ Compromete mês</div>
                        </div>
                      </div>
                    </div>
                    <div className="decisao-insight"><span className="insight-icon">🧠</span><span>Com R$ 50, você aproveita e mantém o controle. Com R$ 140, você compromete o restante do mês.</span></div>
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
              <p className="section-tag">Por que o FinZap?</p>
              <h2 className="section-title">O que você <span className="gradient-text">realmente ganha</span></h2>
              <p className="section-desc">Mais do que controle — você ganha <strong>clareza e confiança</strong> para tomar decisões financeiras.</p>
              <button onClick={goAuth} className="btn btn-primary btn-lg">Quero esse controle →</button>
            </div>
            <div className="beneficios-right">
              {[
                { i: '🎯', t: 'Você sabe exatamente quanto pode gastar', d: 'Sem adivinhação. O sistema te diz, em tempo real, o que é seguro gastar agora.' },
                { i: '📅', t: 'Evita ficar sem dinheiro no fim do mês', d: 'Com cofrinhos, você distribui antes. O dinheiro certo para a coisa certa — sempre.' },
                { i: '🧠', t: 'Toma decisões financeiras mais inteligentes', d: 'Antes de gastar, você vê o impacto real. A decisão fica clara — não é um chute.' },
                { i: '📱', t: 'Visual simples e direto', d: 'Zero complexidade. Fácil de usar no dia a dia, sem curva de aprendizado.' },
                { i: '🛡️', t: 'Reserva de emergência calculada automaticamente', d: 'Você sabe exatamente quantos meses está protegido — e o que falta para chegar na meta.' },
              ].map((b) => (
                <div key={b.t} className="beneficio-item">
                  <div className="ben-icon">{b.i}</div>
                  <div className="ben-content"><h4>{b.t}</h4><p>{b.d}</p></div>
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
            <h2 className="section-title">A diferença que <span className="gradient-text">importa</span></h2>
          </div>
          <div className="compare-table">
            <div className="compare-col compare-others">
              <div className="compare-col-header"><span className="col-icon">📒</span><span>Apps comuns</span></div>
              <div className="compare-row bad">❌ Mostra onde você gastou (depois)</div>
              <div className="compare-row bad">❌ Saldo único e misturado</div>
              <div className="compare-row bad">❌ Sem análise de decisão</div>
              <div className="compare-row bad">❌ Reserva manual e esquecida</div>
              <div className="compare-row bad">❌ Você ainda não sabe se pode gastar</div>
            </div>
            <div className="compare-col compare-finzap">
              <div className="compare-col-header finzap-header"><span className="col-icon">⚡</span><span>FinZap</span></div>
              <div className="compare-row good">✅ Mostra o impacto <strong>antes</strong> de gastar</div>
              <div className="compare-row good">✅ Cofrinhos separados por finalidade</div>
              <div className="compare-row good">✅ Análise de decisão em tempo real</div>
              <div className="compare-row good">✅ Reserva calculada automaticamente</div>
              <div className="compare-row good">✅ Você sabe exatamente o que é seguro</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section section-cta" id="cta">
        <div className="cta-bg" />
        <div className="container cta-content">
          <div className="cta-badge">⚡ Comece hoje</div>
          <h2 className="cta-headline">Ou você controla seu dinheiro,<br /><span className="gradient-text">ou ele controla você.</span></h2>
          <p className="cta-sub">A diferença entre quem termina o mês bem e quem sofre é simples: <strong>decisão</strong>. O FinZap te dá essa vantagem.</p>
          <button onClick={goAuth} className="btn btn-primary btn-xl pulse-btn"><span>Começar agora — é grátis</span><Arrow /></button>
          <p className="cta-disclaimer">Sem cartão de crédito · Cadastro em 30 segundos · 100% seguro</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">Fin<span className="logo-accent">Zap</span></span>
            </a>
            <p className="footer-tagline">Sistema de decisão financeira inteligente.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h5>Produto</h5>
              <a onClick={() => scrollTo('solucao')}>Como funciona</a>
              <a onClick={() => scrollTo('demo')}>Demo</a>
              <a onClick={() => scrollTo('beneficios')}>Benefícios</a>
            </div>
            <div className="footer-col">
              <h5>Acesso</h5>
              <a onClick={goAuth}>Criar conta</a>
              <a onClick={goAuth}>Entrar</a>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <a>Privacidade</a>
              <a>Termos de uso</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>© {new Date().getFullYear()} FinZap. Todos os direitos reservados.</span>
            <span className="footer-made">Feito para quem quer <strong>decisão</strong>, não só controle. ⚡</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

/* ===== FAQ Accordion Item ===== */
const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left p-4 rounded-xl bg-background border shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-sm">{question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground">{answer}</p>}
    </button>
  );
};

export default Index;
