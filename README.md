# FinZap: Decisão Financeira Inteligente

Você é um arquiteto de software, product manager e designer de experiência.

Sua tarefa é criar um WebApp chamado “FinZap” — um sistema de gestão financeira pessoal com experiência premium, onboarding simples e lógica profissional.

O objetivo NÃO é criar uma planilha online.

O objetivo é criar um sistema guiado, com fluxo claro, retenção e valor percebido alto.

---

🎯 OBJETIVO DO PRODUTO

Ajudar usuários a:

- organizar suas finanças mensais

- planejar gastos e receitas

- acompanhar execução em tempo real

- fechar o mês com clareza financeira

Tudo isso em um fluxo simples, linear e intuitivo.

---

🧠 CONCEITO CENTRAL

O sistema deve funcionar como um fluxo em 4 etapas sequenciais:

1. Resumo do Mês

2. Base de Dados

3. Planejamento (Orçado vs Real)

4. Fechamento do Mês

O usuário sempre sabe onde está e qual o próximo passo.

Sem menus confusos.

Sem excesso de opções.

---

⚙️ EXPERIÊNCIA DO USUÁRIO

- O usuário entende o sistema em menos de 10 segundos

- Interface limpa, moderna e objetiva

- Linguagem simples, não técnica

- Cada tela tem um único foco claro

---

🚀 ONBOARDING (CRÍTICO)

Criar um onboarding guiado com:

1. Tela de boas-vindas

   - “Você vai organizar sua vida financeira em 4 passos”

   - Botão: “Começar agora”

2. Criação do primeiro mês

   - Selecionar mês/ano

   - Definir saldo inicial

3. Tutorial interativo leve

   - Destaques na tela explicando:

     - onde lançar receitas

     - onde lançar despesas

     - como funciona o fluxo

4. Primeira ação obrigatória:

   - cadastrar 1 receita ou 1 despesa

Sem isso, o usuário não avança.

---

📊 ESTRUTURA DO SISTEMA

### 1. RESUMO DO MÊS

Exibir:

- Total de receitas

- Total de despesas

- Saldo atual

- Status do orçamento (positivo / negativo)

Visual:

- Cards grandes

- Cores claras (verde, vermelho, neutro)

- Indicador de progresso do mês

---

### 2. BASE DE DADOS

Tela única para cadastro:

- Receitas

- Despesas

Campos:

- Nome

- Valor

- Categoria

- Tipo (fixo / variável)

- Data

- Status (previsto / realizado)

Funcionalidades:

- edição rápida

- duplicação

- filtros simples

- proteção contra exclusão acidental

---

### 3. PLANEJAMENTO (ORÇADO VS REAL)

Tabela comparativa:

- Categoria

- Valor planejado

- Valor realizado

- Diferença

Regras:

- Planejado é definido pelo usuário

- Realizado vem automaticamente da base de dados

Destaques:

- alertas visuais quando ultrapassar orçamento

- indicador de performance financeira

---

### 4. FECHAMENTO DO MÊS

Tela de consolidação:

- Total planejado vs total realizado

- Resultado final do mês

- Diferença geral

Ação principal:

- Botão: “Fechar mês”

Regras:

- Após fechar, o mês fica bloqueado para edição

- Permitir reabertura apenas com confirmação

---

🧩 COMPONENTES PRINCIPAIS

- Cards de resumo financeiro

- Tabelas editáveis

- Indicadores de status

- Barra de progresso do mês

- Sistema de notificações leves

- Tooltips explicativos

- Modal de confirmação (ações críticas)

---

🧠 LÓGICA DO SISTEMA

- Tudo parte da base de dados

- Planejamento puxa dados automaticamente

- Resumo é sempre atualizado em tempo real

- Fechamento trava alterações

Estados:

- mês ativo

- mês fechado

- item previsto

- item realizado

---

🗄️ ESTRUTURA DE DADOS (ALTO NÍVEL)

Usuário:

- id

- nome

- email

Meses:

- id

- user_id

- mes

- ano

- saldo_inicial

- status (ativo / fechado)

Transações:

- id

- mes_id

- tipo (receita/despesa)

- nome

- valor

- categoria

- data

- status (previsto/realizado)

Planejamento:

- id

- mes_id

- categoria

- valor_planejado

---

💰 MONETIZAÇÃO

Modelo Freemium:

Plano Gratuito:

- 1 mês ativo

- funcionalidades básicas

Plano Premium:

- múltiplos meses

- relatórios avançados

- histórico completo

- exportação

- vídeos exclusivos

---

🔁 RETENÇÃO

- progresso visual do mês

- sensação de “controle”

- fechamento mensal (gatilho psicológico forte)

- comparações claras (orçado vs real)

- histórico acumulado

---

📈 DIFERENCIAIS

- fluxo sequencial (não é dashboard solto)

- onboarding guiado

- linguagem simples

- sistema “à prova de leigo”

- sensação de método profissional

---

🎥 EXTRA

Adicionar:

- área de tutoriais

- vídeos curtos explicando cada etapa

---

⚠️ REGRAS IMPORTANTES

- NÃO criar interface complexa

- NÃO usar dashboards confusos

- NÃO adicionar features desnecessárias

- Tudo deve ser simples, direto e funcional

---

STACK:

- Frontend: Next.js

- Backend: Supabase

- Estrutura compatível com Base44 / Lovable

---

Resultado esperado:

Um WebApp funcional, simples, intuitivo e com aparência de produto premium, não uma planilha online.

---

---

🔐 PAINEL ADMIN (ACESSO RESTRITO)

Criar uma área administrativa oculta, acessível apenas por usuários com permissão de administrador.

Essa área NÃO deve aparecer na navegação principal.

Acesso apenas via:

- URL direta (/admin)

- E controle de permissão (role = admin)

---

🎯 OBJETIVO DO ADMIN

Permitir controle total do sistema sem depender de código.

---

🧩 FUNCIONALIDADES DO ADMIN

### 1. GESTÃO DE USUÁRIOS

- Listar usuários cadastrados

- Ver:

  - nome

  - email

  - status (ativo/inativo)

  - plano (free/premium)

  - data de criação

Ações:

- ativar/desativar usuário

- alterar plano manualmente

- excluir usuário (com confirmação)

---

### 2. CONTROLE DE ASSINATURA

- Alterar plano do usuário manualmente

- Definir:

  - início do plano

  - validade

Estados:

- ativo

- expirado

- trial

---

### 3. GESTÃO DE CONTEÚDO (TUTORIAIS)

- Criar / editar / excluir:

Campos:

- título

- descrição

- link do vídeo (YouTube/Vimeo)

- ordem de exibição

---

### 4. CONFIGURAÇÕES GERAIS

- Nome do sistema (editável)

- Mensagem global (ex: aviso no topo)

- Status do sistema:

  - ativo

  - manutenção

---

### 5. MÉTRICAS BÁSICAS

Exibir:

- total de usuários

- usuários ativos

- usuários premium

- taxa de conversão (free → premium)

Sem gráficos complexos.

Apenas números claros.

---

🧠 LÓGICA DE PERMISSÃO

Criar campo no usuário:

- role: "user" | "admin"

Regras:

- Apenas admin acessa /admin

- Qualquer outro usuário:

  → redirecionado automaticamente

---

🗄️ ATUALIZAÇÃO NA ESTRUTURA DE DADOS

Adicionar ao modelo de usuário:

- role (user/admin)

- plano (free/premium)

- status (ativo/inativo)

- subscription_expiration (data)

---

🔒 SEGURANÇA

- Todas ações críticas exigem confirmação

- Exclusão não pode ser revertida

- Proteção contra acesso direto via URL

---

⚙️ EXPERIÊNCIA DO ADMIN

- Interface simples

- Foco em ação rápida

- Sem poluição visual

- Tudo editável em poucos cliques

---

⚠️ REGRAS IMPORTANTES

- NÃO misturar admin com área do usuário

- NÃO expor dados sensíveis sem necessidade

- NÃO complicar com dashboards avançados

- Admin é operacional, não analítico

---

Resultado esperado:

Um painel administrativo funcional, seguro e direto, que permite gerenciar usuários, planos e conteúdo sem depender de desenvolvedor.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fin-zap.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bff57a79-b453-4650-bb20-597d3e11860a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
