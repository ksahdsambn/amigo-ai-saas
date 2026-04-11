export declare enum SubscriptionStatus {
    PastDue = "past_due",
    CancelAtPeriodEnd = "cancel_at_period_end",
    Active = "active",
    Deleted = "deleted"
}
export declare enum PaymentPlanId {
    Hobby = "hobby",
    Pro = "pro"
}
export type BillingCycle = "monthly" | "yearly";
export interface PaymentPlan {
    getPaymentProcessorPlanId: (billingCycle: BillingCycle) => string;
    effect: PaymentPlanEffect;
    trialDays: number;
}
export type PaymentPlanEffect = {
    kind: "subscription";
};
export declare const paymentPlans: {
    readonly hobby: {
        readonly getPaymentProcessorPlanId: (billingCycle: BillingCycle) => string;
        readonly effect: {
            readonly kind: "subscription";
        };
        readonly trialDays: 30;
    };
    readonly pro: {
        readonly getPaymentProcessorPlanId: (billingCycle: BillingCycle) => string;
        readonly effect: {
            readonly kind: "subscription";
        };
        readonly trialDays: 14;
    };
};
export declare function prettyPaymentPlanName(planId: PaymentPlanId): string;
export declare function parsePaymentPlanId(planId: string): PaymentPlanId;
export declare function getSubscriptionPaymentPlanIds(): PaymentPlanId[];
export declare function getPaymentPlanIdByPaymentProcessorPlanId(paymentProcessorPlanId: string): PaymentPlanId;
//# sourceMappingURL=plans.d.ts.map