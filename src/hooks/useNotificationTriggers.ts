import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/lib/notificationService';
import type { Transaction } from '@/hooks/useTransactions';
import type { BudgetPlan } from '@/hooks/useBudget';
import type { Subscription } from '@/hooks/useSubscription';

interface TriggerParams {
  transactions: Transaction[];
  budgetPlans: BudgetPlan[];
  subscription: Subscription | null;
  monthId: string | undefined;
}

/**
 * Runs automatic notification triggers based on financial events.
 * Each trigger fires at most once per session per threshold.
 */
export const useNotificationTriggers = ({
  transactions,
  budgetPlans,
  subscription,
  monthId,
}: TriggerParams) => {
  const { user } = useAuth();
  const firedRef = useRef<Set<string>>(new Set());

  // Reset fired set when month changes
  useEffect(() => {
    firedRef.current.clear();
  }, [monthId]);

  // Budget threshold triggers
  useEffect(() => {
    if (!user || !monthId || budgetPlans.length === 0) return;

    const expenses = transactions.filter(t => t.type === 'expense');
    const totalPlanned = budgetPlans.reduce((s, b) => s + Number(b.planned_amount), 0);
    if (totalPlanned <= 0) return;

    const totalSpent = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const pct = (totalSpent / totalPlanned) * 100;

    const checkThreshold = async (threshold: number, type: 'budget_50' | 'budget_80' | 'budget_100') => {
      const key = `${monthId}_${type}`;
      if (pct >= threshold && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        await createNotification(user.id, type);
      }
    };

    checkThreshold(100, 'budget_100');
    checkThreshold(80, 'budget_80');
    checkThreshold(50, 'budget_50');
  }, [user, monthId, transactions, budgetPlans]);

  // Subscription due trigger
  useEffect(() => {
    if (!user || !subscription?.expires_at) return;
    // Only warn about renewals for paying customers — not trial/free users.
    // Free/trial users shouldn't see billing-style notifications.
    if (subscription.plan !== 'premium') return;
    if (subscription.status !== 'active') return;
    const key = `sub_due_${subscription.id}`;
    if (firedRef.current.has(key)) return;

    const expiresAt = new Date(subscription.expires_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3 && daysLeft >= 0 && subscription.status === 'active') {
      firedRef.current.add(key);
      createNotification(user.id, 'subscription_due', { days: daysLeft });
    }
  }, [user, subscription]);

  // Invisible spending trigger
  useEffect(() => {
    if (!user || !monthId || transactions.length === 0) return;
    const key = `invisible_${monthId}`;
    if (firedRef.current.has(key)) return;

    const smallExpenses = transactions.filter(
      t => t.type === 'expense' && Number(t.amount) < 50
    );

    if (smallExpenses.length >= 5) {
      const total = smallExpenses.reduce((s, t) => s + Number(t.amount), 0);
      firedRef.current.add(key);
      createNotification(user.id, 'invisible_spending', { total });
    }
  }, [user, monthId, transactions]);
};
