import { LegalLayout, LegalSection, LegalCallout } from '@/components/legal/LegalLayout';

const Terms = () => (
  <LegalLayout
    eyebrow="Termos de Uso"
    title="As regras que tornam tudo isso possível"
    description="Os termos abaixo regem o uso do FinZap. São diretos, justos e pensados para uma relação saudável entre você e o produto."
  >
    <p>
      Ao criar uma conta no <strong>FinZap</strong>, você concorda com estes Termos de Uso. Recomendamos uma leitura
      atenta — não há juridiquês escondido aqui.
    </p>

    <LegalCallout title="O que o FinZap é">
      Uma ferramenta de organização financeira pessoal. Ajudamos você a registrar, projetar e decidir sobre o seu
      dinheiro. Não somos uma instituição financeira, não realizamos transferências e não oferecemos crédito.
    </LegalCallout>

    <LegalSection title="1. Conta e elegibilidade">
      <ul>
        <li>Você deve ter pelo menos 18 anos para criar uma conta.</li>
        <li>As informações de cadastro devem ser verdadeiras e atualizadas.</li>
        <li>Você é responsável por manter a confidencialidade da sua senha.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Uso adequado">
      <p>Você concorda em <strong>não</strong>:</p>
      <ul>
        <li>Utilizar o FinZap para atividades ilegais ou fraudulentas.</li>
        <li>Tentar acessar contas de terceiros ou áreas restritas do sistema.</li>
        <li>Realizar engenharia reversa, automatizações abusivas ou scraping massivo.</li>
        <li>Inserir conteúdo que viole direitos de terceiros.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Planos e cobranças">
      <p>
        O FinZap oferece um <strong>plano gratuito</strong> com limites e planos pagos opcionais (Pro e Ultra).
        Assinaturas pagas são cobradas de forma recorrente conforme o ciclo escolhido. Você pode cancelar a qualquer
        momento — o acesso premium permanece ativo até o fim do ciclo já pago.
      </p>
    </LegalSection>

    <LegalSection title="4. Propriedade intelectual">
      <p>
        Todo o software, marca, design e conteúdo do FinZap pertencem à equipe FinZap. Você mantém integralmente a
        propriedade dos dados que registra no sistema.
      </p>
    </LegalSection>

    <LegalSection title="5. Limitação de responsabilidade">
      <p>
        O FinZap é uma ferramenta de apoio à decisão. Insights, projeções e sugestões são baseados nos dados que você
        registra e <strong>não constituem aconselhamento financeiro profissional</strong>. As decisões financeiras
        finais são sempre suas.
      </p>
      <p>
        Faremos o máximo para manter o serviço disponível e correto, mas não nos responsabilizamos por prejuízos
        decorrentes de decisões tomadas com base nas informações apresentadas.
      </p>
    </LegalSection>

    <LegalSection title="6. Encerramento">
      <p>
        Você pode encerrar sua conta a qualquer momento nas configurações. Podemos suspender ou encerrar contas que
        violem estes termos, sempre com comunicação prévia quando possível.
      </p>
    </LegalSection>

    <LegalSection title="7. Alterações destes termos">
      <p>
        Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas com pelo menos 15 dias de
        antecedência. O uso continuado após a notificação significa concordância com os novos termos.
      </p>
    </LegalSection>

    <LegalSection title="8. Lei aplicável e foro">
      <p>
        Estes termos são regidos pelas leis brasileiras. Conflitos serão resolvidos no foro da comarca do usuário,
        salvo disposição legal em contrário.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Terms;
