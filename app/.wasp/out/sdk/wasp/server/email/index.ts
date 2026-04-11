import { env } from '../env.js';
import { initEmailSender } from "./core/index.js";
import { EmailSender } from "./core/types.js";

const emailProvider = {
  type: "mailgun",
  apiKey: env.MAILGUN_API_KEY,
  domain: env.MAILGUN_DOMAIN,
  apiUrl: env.MAILGUN_API_URL,
} as const;

// PUBLIC API
export const emailSender: EmailSender = initEmailSender(emailProvider);

// PUBLIC API
export type { Email, EmailFromField, EmailSender, SentMessageInfo } from "./core/types.js";
