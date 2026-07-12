import { firebaseAuth } from "../config/firebaseAdmin.js";

// Admin status lives on the Firebase ID token as a custom claim (admin: true),
// set server-side only via scripts/grant-admin.js — never settable from the
// browser, so this can't be spoofed by a regular user.
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    if (decoded.admin !== true) return res.status(403).json({ error: "Admin access required." });
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}
