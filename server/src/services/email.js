import { resend, emailFrom } from "../config/resend.js";
import { ApiError } from "../middleware/errorHandler.js";

// fullName and admin-written rejection notes are user/admin-controlled text
// embedded straight into HTML email bodies below — escape before interpolating.
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

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
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Welcome to Abopay",
    `<p>Hi ${name},</p>
     <p>Your Abopay account is ready. Fund your wallet, pay bills, and send money — all in one place.</p>
     <p>— The Abopay Team</p>`
  );
}

export function sendKycReviewedEmail(to, fullName, status, note) {
  const name = escapeHtml(fullName) || "there";
  const verified = status === "verified";
  return send(
    to,
    verified ? "Your identity has been verified" : "Your identity verification was rejected",
    verified
      ? `<p>Hi ${name},</p>
         <p>Your identity verification has been approved. You're all set.</p>
         <p>— The Abopay Team</p>`
      : `<p>Hi ${name},</p>
         <p>Your identity verification could not be approved.</p>
         <p><strong>Reason:</strong> ${escapeHtml(note) || "Not specified."}</p>
         <p>Please log in to Abopay and resubmit your documents.</p>
         <p>— The Abopay Team</p>`
  );
}

// Unlike the transactional senders above, a broadcast genuinely needs to
// reach every user — so a missing Resend config or a failure is a real
// problem for the caller (the admin's "queue for all users" button), not
// something to swallow silently. The free Resend tier caps at 100 sends/day;
// sequential sending (not Promise.all) keeps this from hammering that limit
// all at once, and a failure partway through still reports how many made it.
export async function sendBroadcastEmail(recipients, subject, html) {
  if (!resend) throw new ApiError(503, "No email provider is configured yet (set RESEND_API_KEY).");

  let sent = 0;
  const failures = [];
  for (const to of recipients) {
    if (!to) continue;
    try {
      await resend.emails.send({ from: emailFrom, to, subject, html });
      sent++;
    } catch (err) {
      failures.push(to);
    }
  }
  return { sent, failed: failures.length };
}

export function sendPinResetApprovedEmail(to, fullName) {
  const name = escapeHtml(fullName) || "there";
  return send(
    to,
    "Your PIN reset has been approved",
    `<p>Hi ${name},</p>
     <p>Your transaction PIN reset request has been approved. Log in and set a new PIN in Settings before making any transfers or purchases.</p>
     <p>— The Abopay Team</p>`
  );
}
