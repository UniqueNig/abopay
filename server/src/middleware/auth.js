import { firebaseAuth } from "../config/firebaseAdmin.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}
