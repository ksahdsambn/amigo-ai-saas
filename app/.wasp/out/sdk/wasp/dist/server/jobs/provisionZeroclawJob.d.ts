import type { JSONValue, JSONObject } from 'wasp/core/serialization';
import { type JobFn } from 'wasp/server/jobs/core/pgBoss';
declare const entities: {
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    ZeroclawInstance: import(".prisma/client").Prisma.ZeroclawInstanceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
};
export type ProvisionZeroclawJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>;
export declare const provisionZeroclawJob: import("./core/pgBoss/pgBossJob").PgBossJob<JSONObject, void | JSONValue, {
    User: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
    ZeroclawInstance: import(".prisma/client").Prisma.ZeroclawInstanceDelegate<import("@prisma/client/runtime/library.js").DefaultArgs>;
}>;
export {};
//# sourceMappingURL=provisionZeroclawJob.d.ts.map