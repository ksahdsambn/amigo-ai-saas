import { type QueryFor, createQuery } from './core'
import { GetPaginatedUsers_ext } from 'wasp/server/operations/queries'
import { GetGptResponses_ext } from 'wasp/server/operations/queries'
import { GetAllTasksByUser_ext } from 'wasp/server/operations/queries'
import { GetCustomerPortalUrl_ext } from 'wasp/server/operations/queries'
import { GetDailyStats_ext } from 'wasp/server/operations/queries'
import { GetZeroclawInstance_ext } from 'wasp/server/operations/queries'

// PUBLIC API
export const getPaginatedUsers: QueryFor<GetPaginatedUsers_ext> = createQuery<GetPaginatedUsers_ext>(
  'operations/get-paginated-users',
  ['User'],
)

// PUBLIC API
export const getGptResponses: QueryFor<GetGptResponses_ext> = createQuery<GetGptResponses_ext>(
  'operations/get-gpt-responses',
  ['User', 'GptResponse'],
)

// PUBLIC API
export const getAllTasksByUser: QueryFor<GetAllTasksByUser_ext> = createQuery<GetAllTasksByUser_ext>(
  'operations/get-all-tasks-by-user',
  ['Task'],
)

// PUBLIC API
export const getCustomerPortalUrl: QueryFor<GetCustomerPortalUrl_ext> = createQuery<GetCustomerPortalUrl_ext>(
  'operations/get-customer-portal-url',
  ['User'],
)

// PUBLIC API
export const getDailyStats: QueryFor<GetDailyStats_ext> = createQuery<GetDailyStats_ext>(
  'operations/get-daily-stats',
  ['User', 'DailyStats'],
)

// PUBLIC API
export const getZeroclawInstance: QueryFor<GetZeroclawInstance_ext> = createQuery<GetZeroclawInstance_ext>(
  'operations/get-zeroclaw-instance',
  ['User', 'ZeroclawInstance'],
)

// PRIVATE API (used in SDK)
export { buildAndRegisterQuery } from './core'
