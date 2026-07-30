import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { brl, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_month_summary",
  title: "Resumo do mês",
  description:
    "Retorna o resumo financeiro de um mês do FinZap: receitas, despesas, saldo do período e principais categorias de gasto.",
  inputSchema: {
    year: z.number().int().describe("Ano do mês, ex.: 2026."),
    month: z.number().int().describe("Número do mês, de 1 a 12."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, month }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data: m, error: mErr } = await supabase
      .from("months")
      .select("id, year, month, status, initial_balance")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();
    if (mErr) return { content: [{ type: "text", text: mErr.message }], isError: true };
    if (!m)
      return {
        content: [{ type: "text", text: `Nenhum mês ${month}/${year} encontrado.` }],
        isError: true,
      };

    const { data: txs, error } = await supabase
      .from("transactions")
      .select("type, amount, category, impacta_saldo")
      .eq("month_id", m.id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (txs ?? []).filter((t) => t.impacta_saldo !== false);
    const sum = (type: string) =>
      rows.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalIncome = sum("income");
    const totalExpense = sum("expense");

    const byCat = new Map<string, number>();
    rows
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const k = t.category || "Outros";
        byCat.set(k, (byCat.get(k) ?? 0) + Number(t.amount || 0));
      });
    const topCategories = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, total]) => ({ category, total }));

    const summary = {
      month_id: m.id,
      ref: `${String(month).padStart(2, "0")}/${year}`,
      status: m.status,
      initial_balance: Number(m.initial_balance || 0),
      total_income: totalIncome,
      total_expense: totalExpense,
      net: totalIncome - totalExpense,
      balance: Number(m.initial_balance || 0) + totalIncome - totalExpense,
      transactions_count: rows.length,
      top_expense_categories: topCategories,
    };

    return {
      content: [
        {
          type: "text",
          text:
            `Mês ${summary.ref} (${summary.status}) — Receitas: ${brl(totalIncome)}, ` +
            `Despesas: ${brl(totalExpense)}, Saldo do período: ${brl(summary.net)}, ` +
            `Saldo com inicial: ${brl(summary.balance)}.`,
        },
      ],
      structuredContent: summary,
    };
  },
});