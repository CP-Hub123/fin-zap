import { LegalLayout, LegalSection, LegalCallout } from '@/components/legal/LegalLayout';

const Privacy = () => (
  <LegalLayout
    eyebrow="Política de Privacidade"
    title="Como cuidamos dos seus dados"
    description="Transparência total sobre o que coletamos, por que coletamos e como protegemos suas informações financeiras."
  >
    <p>
      Esta política descreve como o <strong>FinZap</strong> trata seus dados pessoais e financeiros, em conformidade
      com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
    </p>

    <LegalCallout tone="success" title="O que nunca faremos">
      Não vendemos seus dados. Não compartilhamos suas transações com anunciantes. Não usamos suas informações
      financeiras para criar perfis de crédito ou marketing externo.
    </LegalCallout>

    <LegalSection title="1. Dados que coletamos">
      <p>Para que o FinZap funcione, processamos as seguintes categorias de dados:</p>
      <ul>
        <li><strong>Cadastro:</strong> nome, email e senha (criptografada).</li>
        <li><strong>Financeiros:</strong> transações, categorias, cartões de crédito, recorrências, cofrinhos, orçamentos e fechamentos mensais que você registra manualmente.</li>
        <li><strong>Uso:</strong> métricas de uso anônimas para melhorar o produto (quais telas funcionam, onde há fricção).</li>
        <li><strong>Dispositivo:</strong> tipo de aparelho e navegador para entregar a melhor experiência como Progressive Web App (PWA) e enviar notificações push, quando autorizadas.</li>
        <li><strong>Open Finance (opcional, futuro):</strong> apenas com seu consentimento explícito, sincronizamos dados bancários via instituições autorizadas pelo Banco Central.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Por que utilizamos">
      <ul>
        <li>Para entregar o serviço contratado (registrar, projetar e organizar suas finanças).</li>
        <li>Para gerar insights e projeções financeiras a partir dos seus próprios dados, ajudando você a decidir melhor.</li>
        <li>Para garantir segurança, prevenção a fraudes e estabilidade técnica.</li>
        <li>Para cumprir obrigações legais e regulatórias.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Como protegemos">
      <ul>
        <li>Criptografia em trânsito (TLS) e em repouso.</li>
        <li>Acesso restrito por autenticação e Row-Level Security em banco de dados.</li>
        <li>Servidores em provedores reconhecidos com certificações internacionais.</li>
        <li>Logs de auditoria para operações sensíveis.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Seus direitos (LGPD)">
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>Confirmar a existência de tratamento dos seus dados.</li>
        <li>Acessar e exportar seus dados.</li>
        <li>Corrigir dados incompletos ou desatualizados.</li>
        <li>Solicitar a exclusão completa da sua conta e dos dados associados.</li>
        <li>Revogar consentimentos previamente concedidos.</li>
      </ul>
      <p>Para exercer qualquer direito, escreva para <a href="mailto:finzapsuporte@gmail.com">finzapsuporte@gmail.com</a>.</p>
    </LegalSection>

    <LegalSection title="5. Retenção e exclusão">
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar exclusão, removemos seus dados pessoais
        em até <strong>30 dias</strong>, exceto registros que precisamos manter por obrigação legal (por exemplo,
        registros fiscais por 5 anos), sempre de forma anonimizada quando possível.
      </p>
    </LegalSection>

    <LegalSection title="6. Compartilhamento com terceiros">
      <p>Compartilhamos dados apenas com operadores essenciais para o serviço:</p>
      <ul>
        <li>Provedores de infraestrutura em nuvem (banco de dados e autenticação).</li>
        <li>Canais de pagamento manual (como WhatsApp) utilizados na ativação do plano FinZap Founders Vitalício. Processadores automatizados poderão ser adicionados no futuro.</li>
        <li>Provedores de notificação push, com identificadores anônimos.</li>
      </ul>
      <p>Todos sob contrato e obrigações de confidencialidade.</p>
    </LegalSection>

    <LegalSection title="7. Alterações nesta política">
      <p>
        Podemos atualizar esta política para refletir melhorias do produto ou mudanças regulatórias.
        Mudanças relevantes serão comunicadas por email e dentro do app.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Privacy;
