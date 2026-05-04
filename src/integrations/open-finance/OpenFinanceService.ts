import type { ConnectedAccount, ExternalTransaction, OpenFinanceProvider } from './OpenFinanceProvider';

/**
 * OpenFinanceService — fachada agnóstica de provedor.
 * Hoje todos os métodos são placeholders. Quando integrarmos um provedor
 * real, basta registrá-lo via `registerProvider()`.
 */

let activeProvider: OpenFinanceProvider | null = null;

export const OpenFinanceService = {
  registerProvider(provider: OpenFinanceProvider) {
    activeProvider = provider;
  },

  isAvailable(): boolean {
    return activeProvider !== null;
  },

  async connectAccount(_userId: string): Promise<ConnectedAccount> {
    throw new Error('Open Finance ainda não está disponível.');
  },

  async fetchTransactions(_accountId: string): Promise<ExternalTransaction[]> {
    throw new Error('Open Finance ainda não está disponível.');
  },

  async disconnect(_accountId: string): Promise<void> {
    throw new Error('Open Finance ainda não está disponível.');
  },

  async listConnectedAccounts(_userId: string): Promise<ConnectedAccount[]> {
    return [];
  },
};
