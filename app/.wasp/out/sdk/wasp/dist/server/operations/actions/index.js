import { prisma } from 'wasp/server';
import { createAuthenticatedOperation, } from '../wrappers.js';
import { updateIsUserAdminById as updateIsUserAdminById_ext } from 'wasp/src/user/operations';
import { generateGptResponse as generateGptResponse_ext } from 'wasp/src/demo-ai-app/operations';
import { createTask as createTask_ext } from 'wasp/src/demo-ai-app/operations';
import { deleteTask as deleteTask_ext } from 'wasp/src/demo-ai-app/operations';
import { updateTask as updateTask_ext } from 'wasp/src/demo-ai-app/operations';
import { generateCheckoutSession as generateCheckoutSession_ext } from 'wasp/src/payment/operations';
import { setZeroclawApiKey as setZeroclawApiKey_ext } from 'wasp/src/zeroclaw/operations';
import { retryProvision as retryProvision_ext } from 'wasp/src/zeroclaw/operations';
// PUBLIC API
export const updateIsUserAdminById = createAuthenticatedOperation(updateIsUserAdminById_ext, {
    User: prisma.user,
});
// PUBLIC API
export const generateGptResponse = createAuthenticatedOperation(generateGptResponse_ext, {
    User: prisma.user,
    Task: prisma.task,
    GptResponse: prisma.gptResponse,
});
// PUBLIC API
export const createTask = createAuthenticatedOperation(createTask_ext, {
    Task: prisma.task,
});
// PUBLIC API
export const deleteTask = createAuthenticatedOperation(deleteTask_ext, {
    Task: prisma.task,
});
// PUBLIC API
export const updateTask = createAuthenticatedOperation(updateTask_ext, {
    Task: prisma.task,
});
// PUBLIC API
export const generateCheckoutSession = createAuthenticatedOperation(generateCheckoutSession_ext, {
    User: prisma.user,
});
// PUBLIC API
export const setZeroclawApiKey = createAuthenticatedOperation(setZeroclawApiKey_ext, {
    User: prisma.user,
    ZeroclawInstance: prisma.zeroclawInstance,
});
// PUBLIC API
export const retryProvision = createAuthenticatedOperation(retryProvision_ext, {
    User: prisma.user,
    ZeroclawInstance: prisma.zeroclawInstance,
});
//# sourceMappingURL=index.js.map