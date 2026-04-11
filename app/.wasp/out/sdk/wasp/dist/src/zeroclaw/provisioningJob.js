import { allocatePort } from "./portAllocator";
import { provisionInstance } from "./provisioning";
export const provisionZeroclawForUser = async ({ userId }, context) => {
    const existing = await context.entities.ZeroclawInstance.findUnique({
        where: { userId },
    });
    if (existing && existing.status !== "failed") {
        console.log(`User ${userId} already has instance ${existing.instanceId}, skipping`);
        return;
    }
    let port;
    let numericId;
    let instanceId;
    let pathPrefix;
    let dashboardUrl;
    if (existing && existing.status === "failed") {
        port = existing.port;
        numericId = existing.numericId;
        instanceId = existing.instanceId;
        pathPrefix = existing.pathPrefix;
        dashboardUrl = existing.dashboardUrl || "";
    }
    else {
        const allocated = await allocatePort();
        port = allocated.port;
        numericId = allocated.numericId;
        instanceId = "u" + String(numericId).padStart(3, "0");
        pathPrefix = "/" + instanceId;
        dashboardUrl = (process.env.ZEROCLOW_DASHBOARD_BASE_URL || "") + pathPrefix + "/";
    }
    if (!existing) {
        await context.entities.ZeroclawInstance.create({
            data: {
                userId,
                instanceId,
                numericId,
                status: "provisioning",
                port,
                pathPrefix,
                dashboardUrl,
            },
        });
    }
    else {
        await context.entities.ZeroclawInstance.update({
            where: { id: existing.id },
            data: {
                status: "provisioning",
                provisioningError: null,
            },
        });
    }
    try {
        const result = await provisionInstance({
            userId,
            instanceId,
            numericId,
            port,
            pathPrefix,
        });
        await context.entities.ZeroclawInstance.update({
            where: { userId },
            data: {
                status: "active",
                dashboardUrl: result.dashboardUrl || dashboardUrl,
                lastHealthCheck: new Date(),
            },
        });
        console.log(`Successfully provisioned ZeroClaw instance ${instanceId} for user ${userId}`);
    }
    catch (error) {
        await context.entities.ZeroclawInstance.update({
            where: { userId },
            data: {
                status: "failed",
                provisioningError: error?.message || String(error),
            },
        });
        throw error;
    }
};
//# sourceMappingURL=provisioningJob.js.map