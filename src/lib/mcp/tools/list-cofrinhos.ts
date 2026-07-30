import { defineTool } from "@lovable.dev/mcp-js";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_cofrinhos",
  title: "Listar cofrinhos",
  description:
    "Lista os cofrinhos do usuário no FinZap: orçamentos mensais, metas e reservas, com saldo, orçamento e gasto do mês.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const { data, error } = await supabaseForUser(ctx)
      .from("cofrinhos")
      .select("id, nome, tipo, saldo, meta_valor, orcamento_mensal, gasto_mes, prioridade")
      .order("ordem", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { cofrinhos: data ?? [] },
    };
  },
});