
-- 1) Restrict UPDATE/DELETE on cofrinho_closures (immutable history)
CREATE POLICY "No updates on cofrinho closures"
  ON public.cofrinho_closures
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes on cofrinho closures"
  ON public.cofrinho_closures
  FOR DELETE
  TO authenticated
  USING (false);

-- 2) Revoke EXECUTE from anon on SECURITY DEFINER helper functions in public schema
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_subscription() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notif_prefs() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.aplicar_transacao_cofrinho() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.gerar_parcelas_cartao() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fechar_mes_cofrinhos(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.executar_recorrencias_usuario(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transferir_entre_cofrinhos(uuid, uuid, uuid, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_cofrinho_cascade(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_credit_card_cascade(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_card_purchase_safe(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_card_purchase_safe(uuid, text, numeric, integer, uuid, date, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.card_purchase_edit_impact(uuid) FROM anon, public;

-- Re-grant to authenticated (and service_role) where needed
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fechar_mes_cofrinhos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.executar_recorrencias_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_entre_cofrinhos(uuid, uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_cofrinho_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_credit_card_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_card_purchase_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_card_purchase_safe(uuid, text, numeric, integer, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.card_purchase_edit_impact(uuid) TO authenticated;
