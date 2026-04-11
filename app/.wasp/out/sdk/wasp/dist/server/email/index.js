import { env } from '../env.js';
import { initEmailSender } from "./core/index.js";
const emailProvider = {
    type: "mailgun",
    apiKey: env.MAILGUN_API_KEY,
    domain: env.MAILGUN_DOMAIN,
    apiUrl: env.MAILGUN_API_URL,
};
// PUBLIC API
export const emailSender = initEmailSender(emailProvider);
//# sourceMappingURL=index.js.map