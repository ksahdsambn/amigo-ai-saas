import Stripe from "stripe";
import { User } from "wasp/entities";
export declare function ensureStripeCustomer(userEmail: NonNullable<User["email"]>): Promise<Stripe.Customer>;
interface CreateStripeCheckoutSessionParams {
    priceId: Stripe.Price["id"];
    customerId: Stripe.Customer["id"];
    mode: Stripe.Checkout.Session.Mode;
    trialPeriodDays?: number;
}
export declare function createStripeCheckoutSession({ priceId, customerId, mode, trialPeriodDays, }: CreateStripeCheckoutSessionParams): Promise<Stripe.Checkout.Session>;
export {};
//# sourceMappingURL=checkoutUtils.d.ts.map