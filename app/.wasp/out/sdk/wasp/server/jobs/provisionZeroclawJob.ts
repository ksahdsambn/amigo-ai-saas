import { prisma } from 'wasp/server'
import type { JSONValue, JSONObject } from 'wasp/core/serialization'
import { type JobFn, createJobDefinition } from 'wasp/server/jobs/core/pgBoss'

const entities = {
  User: prisma.user,
  ZeroclawInstance: prisma.zeroclawInstance,
}

// PUBLIC API
export type ProvisionZeroclawJob<Input extends JSONObject, Output extends JSONValue | void> = JobFn<Input, Output, typeof entities>

const jobSchedule = null

// PUBLIC API
export const provisionZeroclawJob = createJobDefinition({
  jobName: 'provisionZeroclawJob',
  defaultJobOptions: {},
  jobSchedule,
  entities,
})
