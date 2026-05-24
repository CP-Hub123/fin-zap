import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { PLANS, PlanTier, PlanLimits, isLimitReached } from '@/lib/plans';

/**
 * Map current subscription state to a plan tier.
 * - Active trial / premium / founders → pro (full premium experience)
 * - Founders = lifetime (expires_at IS NULL), kept on the same `pro` tier so the
 *   whole app shares one feature gate. Future paid tiers can branch from here.
 * - Expired or no sub → free.
 */
export function usePlan() {
  const sub = useSubscription();

  const tier: PlanTier = useMemo(() => {
    if (!sub.subscription) return 'free';
    if (sub.subscription.status !== 'active') return 'free';
    return 'pro';
  }, [sub.subscription]);

  const isFounders = useMemo(() => {
    const s = sub.subscription;
    return !!s && s.status === 'active' && (s.plan === 'founders' || (s.is_manual && !s.expires_at));
  }, [sub.subscription]);

  const plan = PLANS[tier];
  const limits: PlanLimits = plan.limits;

  function canCreate(feature: keyof PlanLimits, currentCount: number) {
    const lim = limits[feature];
    if (typeof lim === 'boolean') return lim;
    if (typeof lim !== 'number') return true;
    return !isLimitReached(currentCount, lim);
  }

  return {
    ...sub,
    tier,
    plan,
    limits,
    isFree: tier === 'free',
    isPro: tier === 'pro',
    isFounders,
    canCreate,
  };
}
