import { prisma } from 'wasp/server'

import { setZeroclawApiKey } from '../../../../../src/zeroclaw/operations'


export default async function (args, context) {
  return (setZeroclawApiKey as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      ZeroclawInstance: prisma.zeroclawInstance,
    },
  })
}
