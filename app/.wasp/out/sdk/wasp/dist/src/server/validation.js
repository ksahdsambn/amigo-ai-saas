import { HttpError } from "wasp/server";
export function ensureArgsSchemaOrThrowHttpError(schema, rawArgs) {
    console.log("Validation rawArgs:", JSON.stringify(rawArgs));
    const parseResult = schema.safeParse(rawArgs);
    if (!parseResult.success) {
        console.error("Validation failed:", JSON.stringify(parseResult.error.errors));
        throw new HttpError(400, `Operation arguments validation failed: ${JSON.stringify(parseResult.error.errors)}`, {
            errors: parseResult.error.errors,
        });
    }
    else {
        return parseResult.data;
    }
}
//# sourceMappingURL=validation.js.map