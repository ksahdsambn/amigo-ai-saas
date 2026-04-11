import Stripe from "stripe";
import { User } from "wasp/entities";
import { config } from "wasp/server";
import { stripeClient } from "./stripeClient";

export async function ensureStripeCustomer(
  userEmail: NonNullable<User["email"]>,
): Promise<Stripe.Customer> {
  const customers = await stripeClient.customers.list({
    email: userEmail,
  });

  if (customers.data.length === 0) {
    return stripeClient.customers.create({
      email: userEmail,
    });
  } else {
    return customers.data[0];
  }
}

interface CreateStripeCheckoutSessionParams {
  priceId: Stripe.Price["id"];
  customerId: Stripe.Customer["id"];
  mode: Stripe.Checkout.Session.Mode;
  trialPeriodDays?: number;
}

export function createStripeCheckoutSession({
  priceId,
  customerId,
  mode,
  trialPeriodDays,
}: CreateStripeCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
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
    subscription_data:
      mode === "subscription" && trialPeriodDays
        ? { trial_period_days: trialPeriodDays }
        : undefined,
  });
}
