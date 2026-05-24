import { LegalLayout, LegalSection, LegalCallout } from "@/components/legal/LegalLayout";

const Security = () => (
  <LegalLayout
    eyebrow="Segurança"
    title="Como protegemos seus dados financeiros"
    description="Segurança não é um recurso — é a fundação do FinZap. Veja as práticas técnicas e organizacionais que aplicamos."
  >
    <LegalCallout tone="success" title="Princípios de segurança">
      Mínimo privilégio · Criptografia por padrão · Defesa em camadas · Transparência sobre incidentes.
    </LegalCallout>

    <LegalSection title="1. Criptografia">
      <ul>
        <li>
          <strong>Em trânsito:</strong> todo o tráfego usa TLS 1.2+ com certificados modernos.
        </li>
        <li>
          <strong>Em repouso:</strong> banco de dados criptografado em nível de disco.
        </li>
        <li>
          <strong>Senhas:</strong> nunca armazenadas em texto puro — usamos hashing forte com salt.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Controle de acesso">
      <ul>
        <li>
          Cada usuário acessa <strong>somente seus próprios dados</strong>, isolados por Row-Level Security no banco.
        </li>
        <li>Acesso administrativo é restrito a contas autorizadas e auditadas.</li>
        <li>Suporte humano nunca acessa dados financeiros sem solicitação explícita do usuário.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Infraestrutura">
      <ul>
        <li>
          Servidores hospedados em provedores com certificações <strong>ISO 27001, SOC 2 e PCI-DSS</strong>.
        </li>
        <li>Backups automáticos diários com retenção e recuperação testadas.</li>
        <li>Monitoramento contínuo de disponibilidade e anomalias.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Open Finance (em breve)">
      <p>
        Quando ativarmos a sincronização bancária, ela ocorrerá exclusivamente via instituições autorizadas pelo Banco
        Central, dentro do ecossistema Open Finance regulado. <strong>Nunca</strong> pediremos sua senha de banco.
      </p>
    </LegalSection>

    <LegalSection title="5. Resposta a incidentes">
      <p>
        Em caso de incidente de segurança que afete seus dados, comunicaremos você e a Autoridade Nacional de Proteção
        de Dados (ANPD) dentro dos prazos legais, com detalhes sobre o ocorrido e as medidas tomadas.
      </p>
    </LegalSection>

    <LegalSection title="6. Reporte uma vulnerabilidade">
      <p>
        Encontrou algo? Reporte de forma responsável para{" "}
        <a href="mailto:finzapsuporte@gmail.com">finzapsuporte@gmail.com</a>. Reconhecemos publicamente pesquisadores
        que colaboram com a segurança do FinZap.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Security;
