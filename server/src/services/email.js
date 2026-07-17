import { resend, emailFrom } from "../config/resend.js";

// Never throws — a failed or skipped (unconfigured) email must not break the
// signup/admin-review flow that triggered it.
async function send(to, subject, html) {
  if (!resend || !to) return;
  try {
    await resend.emails.send({ from: emailFrom, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

export function sendWelcomeEmail(to, fullName) {
  return send(
    to,
    "Welcome to Abopay",
    `<p>Hi ${fullName || "there"},</p>
     <p>Your Abopay account is ready. Fund your wallet, pay bills, and send money — all in one place.</p>
     <p>— The Abopay Team</p>`
  );
}

export function sendKycReviewedEmail(to, fullName, status, note) {
  const verified = status === "verified";
  return send(
    to,
    verified ? "Your identity has been verified" : "Your identity verification was rejected",
    verified
      ? `<p>Hi ${fullName || "there"},</p>
         <p>Your identity verification has been approved. You're all set.</p>
         <p>— The Abopay Team</p>`
      : `<p>Hi ${fullName || "there"},</p>
         <p>Your identity verification could not be approved.</p>
         <p><strong>Reason:</strong> ${note || "Not specified."}</p>
         <p>Please log in to Abopay and resubmit your documents.</p>
         <p>— The Abopay Team</p>`
  );
}

export function sendPinResetApprovedEmail(to, fullName) {
  return send(
    to,
    "Your PIN reset has been approved",
    `<p>Hi ${fullName || "there"},</p>
     <p>Your transaction PIN reset request has been approved. Log in and set a new PIN in Settings before making any transfers or purchases.</p>
     <p>— The Abopay Team</p>`
  );
}
