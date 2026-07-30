import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_months",
  title: "Listar meses",
  description:
    "Lista os meses financeiros do usuário no FinZap, com ano, mês, status (draft/in_progress/closed) e saldo inicial.",
  inputSchema: {
    year: z.number().int().optional().describe("Filtrar por ano, ex.: 2026."),
    limit: z.number().int().optional().describe("Quantidade máxima de meses (padrão 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const max = Math.min(Math.max(limit ?? 12, 1), 60);
    let q = supabaseForUser(ctx)
      .from("months")
      .select("id, year, month, status, initial_balance, closed_at")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(max);
    if (year) q = q.eq("year", year);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { months: data ?? [] },
    };
  },
});