import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "Listar lançamentos",
  description:
    "Lista lançamentos (receitas e despesas) do FinZap, opcionalmente filtrados por mês, tipo ou intervalo de datas.",
  inputSchema: {
    year: z.number().int().optional().describe("Ano do mês a filtrar."),
    month: z.number().int().optional().describe("Número do mês a filtrar, de 1 a 12."),
    type: z.enum(["income", "expense"]).optional().describe("Tipo do lançamento."),
    from: z.string().optional().describe("Data inicial no formato AAAA-MM-DD."),
    to: z.string().optional().describe("Data final no formato AAAA-MM-DD."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, month, type, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 50, 1), 200);

    let monthId: string | undefined;
    if (year && month) {
      const { data: m } = await supabase
        .from("months")
        .select("id")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (!m)
        return {
          content: [{ type: "text", text: `Nenhum mês ${month}/${year} encontrado.` }],
          isError: true,
        };
      monthId = m.id;
    }

    let q = supabase
      .from("transactions")
      .select("id, name, amount, type, category, date, status, impacta_saldo, cofrinho_id")
      .order("date", { ascending: false })
      .limit(max);
    if (monthId) q = q.eq("month_id", monthId);
    if (type) q = q.eq("type", type);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});