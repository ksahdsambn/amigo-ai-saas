import { config } from "wasp/server";
import { fetchUserPaymentProcessorUserId, updateUserPaymentProcessorUserId, } from "../user";
import { createStripeCheckoutSession, ensureStripeCustomer, } from "./checkoutUtils";
import { stripeClient } from "./stripeClient";
import { stripeMiddlewareConfigFn, stripeWebhook } from "./webhook";
export const stripePaymentProcessor = {
    id: "stripe",
    createCheckoutSession: async ({ userId, userEmail, paymentPlan, billingCycle, prismaUserDelegate, }) => {
        const customer = await ensureStripeCustomer(userEmail);
        await updateUserPaymentProcessorUserId({ userId, paymentProcessorUserId: customer.id }, prismaUserDelegate);
        const checkoutSession = await createStripeCheckoutSession({
            customerId: customer.id,
            priceId: paymentPlan.getPaymentProcessorPlanId(billingCycle),
            mode: "subscription",
            trialPeriodDays: paymentPlan.trialDays,
        });
        if (!checkoutSession.url) {
            throw new Error("Stripe checkout session URL is missing. Checkout session might not be active.");
        }
        return {
            session: {
                url: checkoutSession.url,
                id: checkoutSession.id,
            },
        };
    },
    fetchCustomerPortalUrl: async ({ prismaUserDelegate, userId, }) => {
        const paymentProcessorUserId = await fetchUserPaymentProcessorUserId(userId, prismaUserDelegate);
        if (!paymentProcessorUserId) {
            return null;
        }
        const billingPortalSession = await stripeClient.billingPortal.sessions.create({
            customer: paymentProcessorUserId,
            return_url: `${config.frontendUrl}/account`,
        });
        return billingPortalSession.url;
    },
    webhook: stripeWebhook,
    webhookMiddlewareConfigFn: stripeMiddlewareConfigFn,
};
//# sourceMappingURL=paymentProcessor.js.map