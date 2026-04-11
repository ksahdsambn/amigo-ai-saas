import { requireNodeEnvVar } from "../server/utils";
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["PastDue"] = "past_due";
    SubscriptionStatus["CancelAtPeriodEnd"] = "cancel_at_period_end";
    SubscriptionStatus["Active"] = "active";
    SubscriptionStatus["Deleted"] = "deleted";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export var PaymentPlanId;
(function (PaymentPlanId) {
    PaymentPlanId["Hobby"] = "hobby";
    PaymentPlanId["Pro"] = "pro";
})(PaymentPlanId || (PaymentPlanId = {}));
export const paymentPlans = {
    [PaymentPlanId.Hobby]: {
        getPaymentProcessorPlanId: (billingCycle) => {
            const envVar = billingCycle === "monthly"
                ? "PAYMENTS_HOBBY_MONTHLY_PLAN_ID"
                : "PAYMENTS_HOBBY_YEARLY_PLAN_ID";
            return requireNodeEnvVar(envVar);
        },
        effect: { kind: "subscription" },
        trialDays: 30,
    },
    [PaymentPlanId.Pro]: {
        getPaymentProcessorPlanId: (billingCycle) => {
            const envVar = billingCycle === "monthly"
                ? "PAYMENTS_PRO_MONTHLY_PLAN_ID"
                : "PAYMENTS_PRO_YEARLY_PLAN_ID";
            return requireNodeEnvVar(envVar);
        },
        effect: { kind: "subscription" },
        trialDays: 14,
    },
};
export function prettyPaymentPlanName(planId) {
    const planToName = {
        [PaymentPlanId.Hobby]: "Hobby",
        [PaymentPlanId.Pro]: "Pro",
    };
    return planToName[planId];
}
export function parsePaymentPlanId(planId) {
    if (Object.values(PaymentPlanId).includes(planId)) {
        return planId;
    }
    else {
        throw new Error(`Invalid PaymentPlanId: ${planId}`);
    }
}
export function getSubscriptionPaymentPlanIds() {
    return Object.values(PaymentPlanId).filter((planId) => paymentPlans[planId].effect.kind === "subscription");
}
export function getPaymentPlanIdByPaymentProcessorPlanId(paymentProcessorPlanId) {
    for (const [planId, plan] of Object.entries(paymentPlans)) {
        for (const cycle of ["monthly", "yearly"]) {
            if (plan.getPaymentProcessorPlanId(cycle) === paymentProcessorPlanId) {
                return planId;
            }
        }
    }
    throw new Error(`Unknown payment processor plan ID: ${paymentProcessorPlanId}`);
}
//# sourceMappingURL=plans.js.map