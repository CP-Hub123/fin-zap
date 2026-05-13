import { LegalLayout, LegalSection, LegalCallout } from '@/components/legal/LegalLayout';

const Cookies = () => (
  <LegalLayout
    eyebrow="Política de Cookies"
    title="Cookies e tecnologias similares"
    description="O FinZap utiliza cookies e armazenamento local apenas para o que é necessário ao funcionamento do produto."
  >
    <LegalCallout tone="success" title="Sem rastreamento publicitário">
      Não usamos cookies de terceiros para anúncios. Não vendemos dados de navegação. Não rastreamos você em outros
      sites.
    </LegalCallout>

    <LegalSection title="1. Cookies essenciais">
      <p>São indispensáveis para o funcionamento e não podem ser desativados:</p>
      <ul>
        <li><strong>Sessão e autenticação:</strong> mantêm você logado com segurança.</li>
        <li><strong>Preferências do app:</strong> tema escuro/claro, idioma, mês selecionado.</li>
        <li><strong>Segurança:</strong> proteção contra requisições maliciosas.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Cookies analíticos (opcionais)">
      <p>
        Quando habilitados, coletamos métricas anônimas para entender como o produto é usado e onde melhorar. Não
        identificam você individualmente.
      </p>
    </LegalSection>

    <LegalSection title="3. Como gerenciar">
      <p>
        Você pode bloquear cookies nas configurações do seu navegador. Cookies essenciais bloqueados podem
        comprometer o funcionamento do FinZap (login, persistência de mês ativo, etc.).
      </p>
    </LegalSection>

    <LegalSection title="4. Armazenamento local">
      <p>
        Utilizamos <code>localStorage</code> e <code>IndexedDB</code> para guardar preferências e cache leve no seu
        dispositivo. Esses dados ficam apenas no seu navegador e podem ser limpos a qualquer momento pelo próprio
        navegador.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Cookies;
