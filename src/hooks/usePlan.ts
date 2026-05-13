import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { PLANS, PlanTier, PlanLimits, isLimitReached } from '@/lib/plans';

/**
 * Map current subscription state to a plan tier.
 * - Active trial OR active premium → pro (full premium experience while paying or on trial)
 * - Expired or no sub → free
 * Future tiers (ultra) will be unlocked via subscription.plan === 'ultra' once supported.
 */
export function usePlan() {
  const sub = useSubscription();

  const tier: PlanTier = useMemo(() => {
    if (!sub.subscription) return 'free';
    if (sub.subscription.status !== 'active') return 'free';
    // @ts-expect-error future enum values
    if (sub.subscription.plan === 'ultra') return 'ultra';
    return 'pro';
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
    isUltra: tier === 'ultra',
    canCreate,
  };
}
