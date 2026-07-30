import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { brl, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_transaction",
  title: "Criar lançamento",
  description:
    "Cria um lançamento (receita ou despesa) no FinZap para o mês correspondente à data informada. O mês precisa existir e não estar fechado.",
  inputSchema: {
    name: z.string().describe("Descrição curta do lançamento."),
    amount: z.number().describe("Valor em reais, sempre positivo."),
    type: z.enum(["income", "expense"]).describe("Receita (income) ou despesa (expense)."),
    date: z.string().describe("Data do lançamento no formato AAAA-MM-DD."),
    category: z.string().optional().describe("Categoria do lançamento."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, amount, type, date, category }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { content: [{ type: "text", text: "Data inválida. Use AAAA-MM-DD." }], isError: true };
    if (!(amount > 0))
      return { content: [{ type: "text", text: "O valor deve ser maior que zero." }], isError: true };

    const supabase = supabaseForUser(ctx);
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));

    const { data: m, error: mErr } = await supabase
      .from("months")
      .select("id, status")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();
    if (mErr) return { content: [{ type: "text", text: mErr.message }], isError: true };
    if (!m)
      return {
        content: [{ type: "text", text: `O mês ${month}/${year} ainda não existe no FinZap.` }],
        isError: true,
      };
    if (m.status === "closed")
      return {
        content: [{ type: "text", text: `O mês ${month}/${year} está fechado.` }],
        isError: true,
      };

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: ctx.getUserId(),
        month_id: m.id,
        name: name.trim(),
        amount,
        type,
        date,
        category: category ?? null,
      })
      .select("id, name, amount, type, date, category")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [
        {
          type: "text",
          text: `Lançamento criado: ${data.name} — ${brl(Number(data.amount))} (${type === "income" ? "receita" : "despesa"}) em ${data.date}.`,
        },
      ],
      structuredContent: { transaction: data },
    };
  },
});