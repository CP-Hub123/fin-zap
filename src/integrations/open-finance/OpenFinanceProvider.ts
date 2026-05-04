/**
 * OpenFinanceProvider — contrato que qualquer integração de Open Finance
 * (Pluggy, Belvo, Klavi, etc.) deverá implementar.
 *
 * NÃO IMPLEMENTAR agora. Apenas estrutura.
 */

export interface ConnectedAccount {
  id: string;
  provider: string;
  bankName: string;
  accountMask: string;
  status: 'active' | 'error' | 'disconnected';
  lastSyncAt?: string;
}

export interface ExternalTransaction {
  externalId: string;
  provider: string;
  amount: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
}

export interface OpenFinanceProvider {
  readonly name: string;
  connectAccount(userId: string): Promise<ConnectedAccount>;
  fetchTransactions(accountId: string, since?: Date): Promise<ExternalTransaction[]>;
  disconnect(accountId: string): Promise<void>;
}
