import { HttpError } from "wasp/server";
import * as z from "zod";
import { PaymentPlanId, paymentPlans, } from "../payment/plans";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { paymentProcessor } from "./paymentProcessor";
const generateCheckoutSessionSchema = z.object({
    planId: z.nativeEnum(PaymentPlanId),
    billingCycle: z.enum(["monthly", "yearly"]),
});
export const generateCheckoutSession = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
    }
    const { planId, billingCycle } = ensureArgsSchemaOrThrowHttpError(generateCheckoutSessionSchema, rawArgs);
    const userId = context.user.id;
    const userEmail = context.user.email;
    if (!userEmail) {
        throw new HttpError(403, "User needs an email to make a payment.");
    }
    const paymentPlan = paymentPlans[planId];
    const { session } = await paymentProcessor.createCheckoutSession({
        userId,
        userEmail,
        paymentPlan,
        billingCycle,
        prismaUserDelegate: context.entities.User,
    });
    return {
        sessionUrl: session.url,
        sessionId: session.id,
    };
};
export const getCustomerPortalUrl = async (_args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
    }
    return paymentProcessor.fetchCustomerPortalUrl({
        userId: context.user.id,
        prismaUserDelegate: context.entities.User,
    });
};
//# sourceMappingURL=operations.js.map