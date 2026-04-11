import { HttpError } from "wasp/server";
import { provisionZeroclawJob } from "wasp/server/jobs";
import { updateInstanceApiKey } from "./provisioning";
import * as z from "zod";
export const getZeroclawInstance = async (_args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Not authenticated");
    }
    return context.entities.ZeroclawInstance.findUnique({
        where: { userId: context.user.id },
    });
};
const setApiKeySchema = z.object({
    provider: z.string().min(1),
    apiKey: z.string().min(1),
});
export const setZeroclawApiKey = async (rawArgs, context) => {
    if (!context.user) {
        throw new HttpError(401, "Not authenticated");
    }
    const args = setApiKeySchema.parse(rawArgs);
    const instance = await context.entities.ZeroclawInstance.findUnique({
        where: { userId: context.user.id },
    });
    if (!instance) {
        throw new HttpError(404, "No ZeroClaw instance found");
    }
    if (instance.status !== "active") {
        throw new HttpError(400, "Instance is not active");
    }
    await updateInstanceApiKey(instance.instanceId, args.provider, args.apiKey);
    await context.entities.ZeroclawInstance.update({
        where: { id: instance.id },
        data: {
            provider: args.provider,
            userApiKeyEncrypted: args.apiKey,
        },
    });
    return { success: true };
};
export const retryProvision = async (_args, context) => {
    if (!context.user) {
        throw new HttpError(401, "Not authenticated");
    }
    const instance = await context.entities.ZeroclawInstance.findUnique({
        where: { userId: context.user.id },
    });
    if (instance && instance.status !== "failed") {
        throw new HttpError(400, "Instance is not in a failed state");
    }
    await provisionZeroclawJob.submit({ userId: context.user.id });
    return { success: true };
};
//# sourceMappingURL=operations.js.map