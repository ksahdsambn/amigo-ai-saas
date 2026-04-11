export declare function provisionInstance(opts: {
    userId: string;
    instanceId: string;
    numericId: number;
    port: number;
    pathPrefix: string;
}): Promise<{
    success: boolean;
    dashboardUrl: string;
}>;
export declare function deprovisionInstance(instanceId: string): Promise<void>;
export declare function getInstanceStatus(instanceId: string): Promise<Record<string, unknown> | null>;
export declare function updateInstanceApiKey(instanceId: string, provider: string, apiKey: string): Promise<void>;
//# sourceMappingURL=provisioning.d.ts.map