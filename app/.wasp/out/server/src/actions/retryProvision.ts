import { prisma } from 'wasp/server'

import { retryProvision } from '../../../../../src/zeroclaw/operations'


export default async function (args, context) {
  return (retryProvision as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      ZeroclawInstance: prisma.zeroclawInstance,
    },
  })
}
