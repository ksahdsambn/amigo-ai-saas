import { prisma } from 'wasp/server'

import { getZeroclawInstance } from '../../../../../src/zeroclaw/operations'


export default async function (args, context) {
  return (getZeroclawInstance as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
      ZeroclawInstance: prisma.zeroclawInstance,
    },
  })
}
