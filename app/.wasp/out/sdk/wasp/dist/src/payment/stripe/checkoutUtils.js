import { config } from "wasp/server";
import { stripeClient } from "./stripeClient";
export async function ensureStripeCustomer(userEmail) {
    const customers = await stripeClient.customers.list({
        email: userEmail,
    });
    if (customers.data.length === 0) {
        return stripeClient.customers.create({
            email: userEmail,
        });
    }
    else {
        return customers.data[0];
    }
}
export function createStripeCheckoutSession({ priceId, customerId, mode, trialPeriodDays, }) {
    return stripeClient.checkout.sessions.create({
        customer: customerId,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode,
        success_url: `${config.frontendUrl}/checkout?status=success`,
        cancel_url: `${config.frontendUrl}/checkout?status=canceled`,
        automatic_tax: { enabled: true },
        allow_promotion_codes: true,
        customer_update: {
            address: "auto",
        },
        subscription_data: mode === "subscription" && trialPeriodDays
            ? { trial_period_days: trialPeriodDays }
            : undefined,
    });
}
//# sourceMappingURL=checkoutUtils.js.map