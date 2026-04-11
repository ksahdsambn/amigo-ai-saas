import { prisma } from 'wasp/server';
import { createJobDefinition } from 'wasp/server/jobs/core/pgBoss';
const entities = {
    User: prisma.user,
    ZeroclawInstance: prisma.zeroclawInstance,
};
const jobSchedule = null;
// PUBLIC API
export const provisionZeroclawJob = createJobDefinition({
    jobName: 'provisionZeroclawJob',
    defaultJobOptions: {},
    jobSchedule,
    entities,
});
//# sourceMappingURL=provisionZeroclawJob.js.map