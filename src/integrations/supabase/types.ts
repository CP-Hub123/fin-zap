export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insights_cache: {
        Row: {
          context_hash: string
          context_snapshot: Json | null
          created_at: string
          level: string
          message: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_hash: string
          context_snapshot?: Json | null
          created_at?: string
          level: string
          message: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_hash?: string
          context_snapshot?: Json | null
          created_at?: string
          level?: string
          message?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_plans: {
        Row: {
          category: string
          id: string
          month_id: string
          planned_amount: number
        }
        Insert: {
          category: string
          id?: string
          month_id: string
          planned_amount?: number
        }
        Update: {
          category?: string
          id?: string
          month_id?: string
          planned_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: false
            referencedRelation: "months"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_screenshots: {
        Row: {
          bug_report_id: string
          created_at: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          bug_report_id: string
          created_at?: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          bug_report_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_screenshots_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          app_version: string | null
          browser_info: Json | null
          category: Database["public"]["Enums"]["bug_category"]
          created_at: string
          description: string
          device_info: Json | null
          id: string
          priority: Database["public"]["Enums"]["bug_priority"]
          route: string | null
          screen_size: string | null
          status: Database["public"]["Enums"]["bug_status"]
          theme: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          app_version?: string | null
          browser_info?: Json | null
          category?: Database["public"]["Enums"]["bug_category"]
          created_at?: string
          description: string
          device_info?: Json | null
          id?: string
          priority?: Database["public"]["Enums"]["bug_priority"]
          route?: string | null
          screen_size?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          app_version?: string | null
          browser_info?: Json | null
          category?: Database["public"]["Enums"]["bug_category"]
          created_at?: string
          description?: string
          device_info?: Json | null
          id?: string
          priority?: Database["public"]["Enums"]["bug_priority"]
          route?: string | null
          screen_size?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: []
      }
      cofrinho_closures: {
        Row: {
          ano: number
          closed_at: string
          cofrinho_id: string
          gasto_mes: number
          id: string
          mes: number
          orcamento_mensal: number
          saldo_final: number
          user_id: string
        }
        Insert: {
          ano: number
          closed_at?: string
          cofrinho_id: string
          gasto_mes: number
          id?: string
          mes: number
          orcamento_mensal: number
          saldo_final: number
          user_id: string
        }
        Update: {
          ano?: number
          closed_at?: string
          cofrinho_id?: string
          gasto_mes?: number
          id?: string
          mes?: number
          orcamento_mensal?: number
          saldo_final?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cofrinho_closures_cofrinho_id_fkey"
            columns: ["cofrinho_id"]
            isOneToOne: false
            referencedRelation: "cofrinhos"
            referencedColumns: ["id"]
          },
        ]
      }
      cofrinhos: {
        Row: {
          ano_ref: number
          cor: string
          cover_preset: string
          created_at: string
          custo_mensal: number
          gasto_mes: number
          icon: string
          id: string
          mes_ref: number
          meses_protegidos: number
          meta_valor: number
          nome: string
          orcamento_mensal: number
          ordem: number
          prioridade: number
          saldo: number
          tipo: Database["public"]["Enums"]["cofrinho_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_ref?: number
          cor?: string
          cover_preset?: string
          created_at?: string
          custo_mensal?: number
          gasto_mes?: number
          icon?: string
          id?: string
          mes_ref?: number
          meses_protegidos?: number
          meta_valor?: number
          nome: string
          orcamento_mensal?: number
          ordem?: number
          prioridade?: number
          saldo?: number
          tipo?: Database["public"]["Enums"]["cofrinho_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_ref?: number
          cor?: string
          cover_preset?: string
          created_at?: string
          custo_mensal?: number
          gasto_mes?: number
          icon?: string
          id?: string
          mes_ref?: number
          meses_protegidos?: number
          meta_valor?: number
          nome?: string
          orcamento_mensal?: number
          ordem?: number
          prioridade?: number
          saldo?: number
          tipo?: Database["public"]["Enums"]["cofrinho_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          balance: number
          bank_logo: string | null
          bank_name: string | null
          created_at: string
          id: string
          last_sync: string | null
          pluggy_account_id: string | null
          pluggy_item_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          balance?: number
          bank_logo?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          last_sync?: string | null
          pluggy_account_id?: string | null
          pluggy_item_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          balance?: number
          bank_logo?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          last_sync?: string | null
          pluggy_account_id?: string | null
          pluggy_item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_card_purchases: {
        Row: {
          card_id: string
          categoria: string | null
          cofrinho_id: string | null
          created_at: string
          data_compra: string
          descricao: string
          id: string
          parcelas: number
          user_id: string
          valor_total: number
        }
        Insert: {
          card_id: string
          categoria?: string | null
          cofrinho_id?: string | null
          created_at?: string
          data_compra?: string
          descricao: string
          id?: string
          parcelas?: number
          user_id: string
          valor_total: number
        }
        Update: {
          card_id?: string
          categoria?: string | null
          cofrinho_id?: string | null
          created_at?: string
          data_compra?: string
          descricao?: string
          id?: string
          parcelas?: number
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_purchases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_purchases_cofrinho_id_fkey"
            columns: ["cofrinho_id"]
            isOneToOne: false
            referencedRelation: "cofrinhos"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          ativo: boolean
          bandeira: string
          cor: string
          created_at: string
          fechamento_dia: number
          id: string
          limite: number
          nome: string
          ordem: number
          updated_at: string
          user_id: string
          vencimento_dia: number
        }
        Insert: {
          ativo?: boolean
          bandeira?: string
          cor?: string
          created_at?: string
          fechamento_dia?: number
          id?: string
          limite?: number
          nome: string
          ordem?: number
          updated_at?: string
          user_id: string
          vencimento_dia?: number
        }
        Update: {
          ativo?: boolean
          bandeira?: string
          cor?: string
          created_at?: string
          fechamento_dia?: number
          id?: string
          limite?: number
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
          vencimento_dia?: number
        }
        Relationships: []
      }
      financial_commitments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          notify_at: string | null
          status: string
          title: string
          transaction_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          notify_at?: string | null
          status?: string
          title: string
          transaction_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          notify_at?: string | null
          status?: string
          title?: string
          transaction_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_commitments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_rhythm_state: {
        Row: {
          inactivity_level: string
          last_notification_at: string | null
          last_open_at: string | null
          last_transaction_at: string | null
          predictability_score: number
          previous_predictability_score: number | null
          rhythm_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          inactivity_level?: string
          last_notification_at?: string | null
          last_open_at?: string | null
          last_transaction_at?: string | null
          predictability_score?: number
          previous_predictability_score?: number | null
          rhythm_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          inactivity_level?: string
          last_notification_at?: string | null
          last_open_at?: string | null
          last_transaction_at?: string | null
          predictability_score?: number
          previous_predictability_score?: number | null
          rhythm_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_closures: {
        Row: {
          closed_at: string
          final_balance: number
          id: string
          month_id: string
          planned_total: number
          realized_total: number
          total_expense: number
          total_income: number
        }
        Insert: {
          closed_at?: string
          final_balance?: number
          id?: string
          month_id: string
          planned_total?: number
          realized_total?: number
          total_expense?: number
          total_income?: number
        }
        Update: {
          closed_at?: string
          final_balance?: number
          id?: string
          month_id?: string
          planned_total?: number
          realized_total?: number
          total_expense?: number
          total_income?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closures_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: true
            referencedRelation: "months"
            referencedColumns: ["id"]
          },
        ]
      }
      months: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          initial_balance: number
          month: number
          reopened_at: string | null
          reopened_count: number
          status: Database["public"]["Enums"]["month_status"]
          user_id: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          month: number
          reopened_at?: string | null
          reopened_count?: number
          status?: Database["public"]["Enums"]["month_status"]
          user_id: string
          year: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          month?: number
          reopened_at?: string | null
          reopened_count?: number
          status?: Database["public"]["Enums"]["month_status"]
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alertas_criticos: boolean
          atualizacao_diaria: boolean
          cartoes: boolean
          created_at: string
          insights: boolean
          lembrete_diario: boolean
          metas_cofrinhos: boolean
          quiet_hours_end: number
          quiet_hours_start: number
          recorrencias: boolean
          resumo_semanal: boolean
          ritmo_financeiro: boolean
          saldo_orcamento: boolean
          sistema_novidades: boolean
          timezone: string
          updated_at: string
          user_id: string
          vencimentos: boolean
        }
        Insert: {
          alertas_criticos?: boolean
          atualizacao_diaria?: boolean
          cartoes?: boolean
          created_at?: string
          insights?: boolean
          lembrete_diario?: boolean
          metas_cofrinhos?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          recorrencias?: boolean
          resumo_semanal?: boolean
          ritmo_financeiro?: boolean
          saldo_orcamento?: boolean
          sistema_novidades?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          vencimentos?: boolean
        }
        Update: {
          alertas_criticos?: boolean
          atualizacao_diaria?: boolean
          cartoes?: boolean
          created_at?: string
          insights?: boolean
          lembrete_diario?: boolean
          metas_cofrinhos?: boolean
          quiet_hours_end?: number
          quiet_hours_start?: number
          recorrencias?: boolean
          resumo_semanal?: boolean
          ritmo_financeiro?: boolean
          saldo_orcamento?: boolean
          sistema_novidades?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          vencimentos?: boolean
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          action_url: string | null
          category: string | null
          clicked_at: string | null
          dedupe_key: string | null
          delivered_at: string | null
          error: string | null
          id: string
          message: string
          priority: string
          read: boolean
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          clicked_at?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          message: string
          priority?: string
          read?: boolean
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          clicked_at?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          message?: string
          priority?: string
          read?: boolean
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          reserva_emergencia: number
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          reserva_emergencia?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          reserva_emergencia?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: Json | null
          endpoint: string
          failure_count: number
          id: string
          last_error: string | null
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          failure_count?: number
          id?: string
          last_error?: string | null
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          failure_count?: number
          id?: string
          last_error?: string | null
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          ativo: boolean
          cofrinho_id: string
          created_at: string
          dia_do_mes: number
          id: string
          lancar_se_dia_passou: boolean
          nome: string
          proxima_execucao: string | null
          tipo: string
          ultima_execucao: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          cofrinho_id: string
          created_at?: string
          dia_do_mes?: number
          id?: string
          lancar_se_dia_passou?: boolean
          nome: string
          proxima_execucao?: string | null
          tipo: string
          ultima_execucao?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          ativo?: boolean
          cofrinho_id?: string
          created_at?: string
          dia_do_mes?: number
          id?: string
          lancar_se_dia_passou?: boolean
          nome?: string
          proxima_execucao?: string | null
          tipo?: string
          ultima_execucao?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          discount_tag: string | null
          expires_at: string | null
          id: string
          is_manual: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_tag?: string | null
          expires_at?: string | null
          id?: string
          is_manual?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_tag?: string | null
          expires_at?: string | null
          id?: string
          is_manual?: boolean
          plan?: Database["public"]["Enums"]["subscription_plan"]
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          card_purchase_id: string | null
          category: string | null
          cofrinho_id: string | null
          created_at: string
          date: string
          descricao: string | null
          external_id: string | null
          id: string
          impacta_saldo: boolean
          is_fixed: boolean
          month_id: string | null
          name: string
          origem: string
          parcela_num: number | null
          provider: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          source: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          sync_status: Database["public"]["Enums"]["sync_status_type"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          card_purchase_id?: string | null
          category?: string | null
          cofrinho_id?: string | null
          created_at?: string
          date: string
          descricao?: string | null
          external_id?: string | null
          id?: string
          impacta_saldo?: boolean
          is_fixed?: boolean
          month_id?: string | null
          name: string
          origem?: string
          parcela_num?: number | null
          provider?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          card_purchase_id?: string | null
          category?: string | null
          cofrinho_id?: string | null
          created_at?: string
          date?: string
          descricao?: string | null
          external_id?: string | null
          id?: string
          impacta_saldo?: boolean
          is_fixed?: boolean
          month_id?: string | null
          name?: string
          origem?: string
          parcela_num?: number | null
          provider?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          sync_status?: Database["public"]["Enums"]["sync_status_type"] | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_purchase_id_fkey"
            columns: ["card_purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_card_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cofrinho_id_fkey"
            columns: ["cofrinho_id"]
            isOneToOne: false
            referencedRelation: "cofrinhos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: false
            referencedRelation: "months"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorials: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_proxima_execucao: {
        Args: { _dia: number; _from: string }
        Returns: string
      }
      card_purchase_edit_impact: {
        Args: { _purchase_id: string }
        Returns: {
          future_amount: number
          future_count: number
          locked_amount: number
          locked_count: number
        }[]
      }
      convert_commitment_to_transaction: {
        Args: { _commitment_id: string }
        Returns: string
      }
      delete_card_purchase_safe: {
        Args: { _purchase_id: string }
        Returns: undefined
      }
      delete_cofrinho_cascade: {
        Args: { _cofrinho_id: string }
        Returns: undefined
      }
      delete_credit_card_cascade: {
        Args: { _card_id: string }
        Returns: undefined
      }
      delete_month_cascade: { Args: { _month_id: string }; Returns: undefined }
      executar_recorrencias_usuario: {
        Args: { _user_id: string }
        Returns: number
      }
      executar_recorrencias_usuario_admin: {
        Args: { _user_id: string }
        Returns: number
      }
      fechar_mes_cofrinhos: { Args: { _user_id: string }; Returns: number }
      fechar_mes_cofrinhos_admin: {
        Args: { _user_id: string }
        Returns: number
      }
      has_active_subscription: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      run_monthly_autotasks: { Args: never; Returns: Json }
      set_app_config: {
        Args: { _key: string; _value: string }
        Returns: undefined
      }
      transferir_entre_cofrinhos: {
        Args: {
          _descricao?: string
          _destino_id: string
          _origem_id: string
          _user_id: string
          _valor: number
        }
        Returns: undefined
      }
      update_card_purchase_safe: {
        Args: {
          _card_id: string
          _categoria?: string
          _data_compra: string
          _descricao: string
          _parcelas: number
          _purchase_id: string
          _valor_total: number
        }
        Returns: undefined
      }
    }
    Enums: {
      bug_category:
        | "visual"
        | "financial"
        | "recurring"
        | "cofrinhos"
        | "dashboard"
        | "open_finance"
        | "performance"
        | "other"
      bug_priority: "low" | "medium" | "high" | "critical"
      bug_status: "new" | "analyzing" | "fixing" | "resolved" | "ignored"
      category_type: "income" | "expense"
      cofrinho_tipo: "reserva" | "mensal" | "meta"
      month_status:
        | "draft"
        | "in_progress"
        | "ready_to_close"
        | "closed"
        | "archived"
      recurrence_type: "none" | "monthly"
      subscription_plan: "trial" | "premium" | "founders"
      subscription_status: "active" | "expired"
      sync_status_type: "pending" | "synced" | "error"
      transaction_source: "manual" | "external" | "recurring"
      transaction_status: "planned" | "realized"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bug_category: [
        "visual",
        "financial",
        "recurring",
        "cofrinhos",
        "dashboard",
        "open_finance",
        "performance",
        "other",
      ],
      bug_priority: ["low", "medium", "high", "critical"],
      bug_status: ["new", "analyzing", "fixing", "resolved", "ignored"],
      category_type: ["income", "expense"],
      cofrinho_tipo: ["reserva", "mensal", "meta"],
      month_status: [
        "draft",
        "in_progress",
        "ready_to_close",
        "closed",
        "archived",
      ],
      recurrence_type: ["none", "monthly"],
      subscription_plan: ["trial", "premium", "founders"],
      subscription_status: ["active", "expired"],
      sync_status_type: ["pending", "synced", "error"],
      transaction_source: ["manual", "external", "recurring"],
      transaction_status: ["planned", "realized"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
