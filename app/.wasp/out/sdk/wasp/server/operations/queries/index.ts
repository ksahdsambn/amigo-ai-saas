
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { getPaginatedUsers as getPaginatedUsers_ext } from 'wasp/src/user/operations'
import { getGptResponses as getGptResponses_ext } from 'wasp/src/demo-ai-app/operations'
import { getAllTasksByUser as getAllTasksByUser_ext } from 'wasp/src/demo-ai-app/operations'
import { getCustomerPortalUrl as getCustomerPortalUrl_ext } from 'wasp/src/payment/operations'
import { getDailyStats as getDailyStats_ext } from 'wasp/src/analytics/operations'
import { getZeroclawInstance as getZeroclawInstance_ext } from 'wasp/src/zeroclaw/operations'

// PRIVATE API
export type GetPaginatedUsers_ext = typeof getPaginatedUsers_ext

// PUBLIC API
export const getPaginatedUsers: AuthenticatedOperationFor<GetPaginatedUsers_ext> =
  createAuthenticatedOperation(
    getPaginatedUsers_ext,
    {
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetGptResponses_ext = typeof getGptResponses_ext

// PUBLIC API
export const getGptResponses: AuthenticatedOperationFor<GetGptResponses_ext> =
  createAuthenticatedOperation(
    getGptResponses_ext,
    {
      User: prisma.user,
      GptResponse: prisma.gptResponse,
    },
  )


// PRIVATE API
export type GetAllTasksByUser_ext = typeof getAllTasksByUser_ext

// PUBLIC API
export const getAllTasksByUser: AuthenticatedOperationFor<GetAllTasksByUser_ext> =
  createAuthenticatedOperation(
    getAllTasksByUser_ext,
    {
      Task: prisma.task,
    },
  )


// PRIVATE API
export type GetCustomerPortalUrl_ext = typeof getCustomerPortalUrl_ext

// PUBLIC API
export const getCustomerPortalUrl: AuthenticatedOperationFor<GetCustomerPortalUrl_ext> =
  createAuthenticatedOperation(
    getCustomerPortalUrl_ext,
    {
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetDailyStats_ext = typeof getDailyStats_ext

// PUBLIC API
export const getDailyStats: AuthenticatedOperationFor<GetDailyStats_ext> =
  createAuthenticatedOperation(
    getDailyStats_ext,
    {
      User: prisma.user,
      DailyStats: prisma.dailyStats,
    },
  )


// PRIVATE API
export type GetZeroclawInstance_ext = typeof getZeroclawInstance_ext

// PUBLIC API
export const getZeroclawInstance: AuthenticatedOperationFor<GetZeroclawInstance_ext> =
  createAuthenticatedOperation(
    getZeroclawInstance_ext,
    {
      User: prisma.user,
      ZeroclawInstance: prisma.zeroclawInstance,
    },
  )

