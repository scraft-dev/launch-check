export type BillingPlanId = "starter" | "growth" | "enterprise";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceMonthly: number;
  description: string;
  limits: {
    scansPerMonth: number;
    pagesPerScan: number;
  };
};

export type BillingUsageStatus = {
  canContinue: boolean;
  remaining: number;
  message: string;
};

export type BillingSummary = {
  planId: BillingPlanId;
  planName: string;
  currentUsage: number;
  remaining: number;
  canContinue: boolean;
  message: string;
};

const billingPlans: Record<BillingPlanId, BillingPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    description: "For small teams validating a few campaigns each month.",
    limits: {
      scansPerMonth: 100,
      pagesPerScan: 5,
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 79,
    description:
      "For scaling product squads that regularly audit launch readiness.",
    limits: {
      scansPerMonth: 1000,
      pagesPerScan: 20,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 299,
    description:
      "For larger organizations needing higher throughput and support.",
    limits: {
      scansPerMonth: 5000,
      pagesPerScan: 100,
    },
  },
};

export function getBillingPlan(planId: BillingPlanId): BillingPlan | null {
  return billingPlans[planId] ?? null;
}

export function getPlanUsageStatus(
  planId: BillingPlanId,
  currentUsage: number,
): BillingUsageStatus {
  const plan = getBillingPlan(planId);

  if (!plan) {
    return {
      canContinue: false,
      remaining: 0,
      message: "Unknown plan.",
    };
  }

  const remaining = Math.max(0, plan.limits.scansPerMonth - currentUsage);
  return {
    canContinue: currentUsage < plan.limits.scansPerMonth,
    remaining,
    message:
      remaining > 0
        ? `${remaining} scans still available this month.`
        : "Your plan limit has been reached.",
  };
}

export function buildBillingSummary(
  planId: BillingPlanId,
  currentUsage: number,
): BillingSummary {
  const plan = getBillingPlan(planId);

  if (!plan) {
    return {
      planId,
      planName: "Unknown plan",
      currentUsage,
      remaining: 0,
      canContinue: false,
      message: "Unknown plan.",
    };
  }

  const status = getPlanUsageStatus(planId, currentUsage);

  return {
    planId: plan.id,
    planName: plan.name,
    currentUsage,
    remaining: status.remaining,
    canContinue: status.canContinue,
    message: status.message,
  };
}
