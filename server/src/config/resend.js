import { Resend } from "resend";
import { env } from "./env.js";

// null when RESEND_API_KEY isn't set — services/email.js treats that as
// "skip sending" rather than an error, so the app works before an operator
// has had a chance to set up Resend.
export const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

// resend.dev's shared sandbox sender only delivers to the Resend account's
// own verified email — set RESEND_FROM_EMAIL to a verified domain address
// for real delivery to users.
export const emailFrom = env.resendFromEmail || "Abopay <onboarding@resend.dev>";
