import { registerJob } from 'wasp/server/jobs/core/pgBoss'
import { provisionZeroclawForUser } from '../../../../../src/zeroclaw/provisioningJob'
import { provisionZeroclawJob as _waspJobDefinition } from 'wasp/server/jobs'

registerJob({
  job: _waspJobDefinition,
  jobFn: provisionZeroclawForUser,
})
