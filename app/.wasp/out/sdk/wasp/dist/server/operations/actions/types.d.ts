import { type _User, type _Task, type _GptResponse, type _File, type _ZeroclawInstance, type AuthenticatedActionDefinition, type Payload } from 'wasp/server/_types';
export type UpdateIsUserAdminById<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type GenerateGptResponse<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _Task,
    _GptResponse
], Input, Output>;
export type CreateTask<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Task
], Input, Output>;
export type DeleteTask<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Task
], Input, Output>;
export type UpdateTask<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _Task
], Input, Output>;
export type GenerateCheckoutSession<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type CreateFileUploadUrl<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type AddFileToDb<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type DeleteFile<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
export type SetZeroclawApiKey<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _ZeroclawInstance
], Input, Output>;
export type RetryProvision<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _ZeroclawInstance
], Input, Output>;
//# sourceMappingURL=types.d.ts.map