import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMonths from "./tools/list-months";
import getMonthSummary from "./tools/get-month-summary";
import listTransactions from "./tools/list-transactions";
import listCofrinhos from "./tools/list-cofrinhos";
import createTransaction from "./tools/create-transaction";

// O issuer OAuth precisa ser o host direto do Supabase, derivado do project ref
// (inlined pelo Vite no build — mantém o módulo import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "finzap-decis-o-financeira-inteligente",
  title: "FinZap: Decisão Financeira Inteligente",
  version: "0.1.0",
  instructions:
    "Ferramentas do FinZap, app de organização financeira pessoal em português (valores em BRL). " +
    "Use `list_months` para descobrir meses disponíveis, `get_month_summary` para o panorama de um mês, " +
    "`list_transactions` para detalhar lançamentos, `list_cofrinhos` para orçamentos/metas/reservas e " +
    "`create_transaction` para registrar uma nova receita ou despesa.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMonths, getMonthSummary, listTransactions, listCofrinhos, createTransaction],
});