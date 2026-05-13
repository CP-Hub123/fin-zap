import { LegalLayout, LegalSection, LegalCallout } from '@/components/legal/LegalLayout';

const Consent = () => (
  <LegalLayout
    eyebrow="Consentimento de Dados"
    title="Você no controle das suas informações"
    description="Aqui detalhamos exatamente o que você autoriza ao usar o FinZap, e como pode revogar cada consentimento."
  >
    <p>
      O FinZap acredita que <strong>consentimento real é consentimento informado</strong>. Por isso, separamos cada
      uso de dados em uma autorização independente, que pode ser revogada a qualquer momento.
    </p>

    <LegalCallout tone="primary" title="Princípio: o mínimo necessário">
      Pedimos apenas o consentimento estritamente necessário para o serviço funcionar e gerar valor para você.
      Recursos opcionais (como Open Finance) exigem autorização separada.
    </LegalCallout>

    <LegalSection title="1. Consentimento essencial">
      <p>Necessário para o funcionamento do FinZap:</p>
      <ul>
        <li>Tratamento dos dados financeiros que você registra (transações, cartões, cofrinhos, recorrências).</li>
        <li>Armazenamento seguro em servidores na nuvem.</li>
        <li>Geração de insights, projeções e fechamentos a partir dos seus próprios dados.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Consentimentos opcionais">
      <ul>
        <li><strong>Notificações push:</strong> avisos de fechamento, lembretes e insights. Você ativa nas configurações.</li>
        <li><strong>Open Finance (em breve):</strong> sincronização com bancos via APIs reguladas pelo Banco Central, apenas se você conectar uma instituição.</li>
        <li><strong>Análises agregadas:</strong> uso de métricas anônimas para melhorar o produto.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Como revogar">
      <p>Você pode revogar consentimentos a qualquer momento:</p>
      <ul>
        <li>Notificações: nas configurações do app.</li>
        <li>Open Finance: desconectando a instituição correspondente.</li>
        <li>Tratamento geral: solicitando exclusão da conta em <a href="mailto:privacidade@finzap.app">privacidade@finzap.app</a>.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Decisões automatizadas">
      <p>
        O FinZap utiliza algoritmos para gerar insights e projeções, mas <strong>nenhuma decisão automatizada</strong>
        afeta direitos seus de forma irreversível. Todas as recomendações são sugestões — você decide.
      </p>
    </LegalSection>

    <LegalSection title="5. Base legal">
      <p>O tratamento de dados é fundamentado em:</p>
      <ul>
        <li><strong>Execução de contrato</strong> (Art. 7º, V da LGPD) — para entregar o serviço.</li>
        <li><strong>Consentimento</strong> (Art. 7º, I) — para recursos opcionais.</li>
        <li><strong>Legítimo interesse</strong> (Art. 7º, IX) — para segurança e melhoria do produto.</li>
        <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II) — quando aplicável.</li>
      </ul>
    </LegalSection>
  </LegalLayout>
);

export default Consent;
