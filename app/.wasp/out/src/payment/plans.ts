import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Hobby = "hobby",
  Pro = "pro",
}

export type BillingCycle = "monthly" | "yearly";

export interface PaymentPlan {
  getPaymentProcessorPlanId: (billingCycle: BillingCycle) => string;
  effect: PaymentPlanEffect;
  trialDays: number;
}

export type PaymentPlanEffect = { kind: "subscription" };

export const paymentPlans = {
  [PaymentPlanId.Hobby]: {
    getPaymentProcessorPlanId: (billingCycle: BillingCycle) => {
      const envVar =
        billingCycle === "monthly"
          ? "PAYMENTS_HOBBY_MONTHLY_PLAN_ID"
          : "PAYMENTS_HOBBY_YEARLY_PLAN_ID";
      return requireNodeEnvVar(envVar);
    },
    effect: { kind: "subscription" },
    trialDays: 30,
  },
  [PaymentPlanId.Pro]: {
    getPaymentProcessorPlanId: (billingCycle: BillingCycle) => {
      const envVar =
        billingCycle === "monthly"
          ? "PAYMENTS_PRO_MONTHLY_PLAN_ID"
          : "PAYMENTS_PRO_YEARLY_PLAN_ID";
      return requireNodeEnvVar(envVar);
    },
    effect: { kind: "subscription" },
    trialDays: 14,
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Hobby]: "Hobby",
    [PaymentPlanId.Pro]: "Pro",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}

export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, plan] of Object.entries(paymentPlans)) {
    for (const cycle of ["monthly", "yearly"] as BillingCycle[]) {
      if (plan.getPaymentProcessorPlanId(cycle) === paymentProcessorPlanId) {
        return planId as PaymentPlanId;
      }
    }
  }
  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
