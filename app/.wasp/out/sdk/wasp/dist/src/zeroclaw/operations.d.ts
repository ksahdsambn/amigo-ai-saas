import type { ZeroclawInstance } from "wasp/entities";
import { type GetZeroclawInstance, type SetZeroclawApiKey, type RetryProvision } from "wasp/server/operations";
import * as z from "zod";
export declare const getZeroclawInstance: GetZeroclawInstance<void, ZeroclawInstance | null>;
declare const setApiKeySchema: z.ZodObject<{
    provider: z.ZodString;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    provider: string;
    apiKey: string;
}, {
    provider: string;
    apiKey: string;
}>;
export declare const setZeroclawApiKey: SetZeroclawApiKey<z.infer<typeof setApiKeySchema>, {
    success: boolean;
}>;
export declare const retryProvision: RetryProvision<void, {
    success: boolean;
}>;
export {};
//# sourceMappingURL=operations.d.ts.map