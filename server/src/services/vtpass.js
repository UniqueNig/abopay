import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";

export const VTPASS_SERVICE = {
  airtime: { mtn: "mtn", airtel: "airtel", glo: "glo", "9mobile": "etisalat" },
  data: { mtn: "mtn-data", airtel: "airtel-data", glo: "glo-data", "9mobile": "etisalat-data" },
  electricity: {
    EKEDC: "eko-electric",
    IKEDC: "ikeja-electric",
    AEDC: "abuja-electric",
    PHEDC: "phed",
    BEDC: "benin-electric",
    EEDC: "enugu-electric",
    KEDCO: "kaduna-electric",
    JED: "jos-electric",
  },
  cable: { DSTV: "dstv", GOtv: "gotv", StarTimes: "startimes" },
};

// Per VTpass's actual docs (vtpass.com/documentation/authentication/): POST
// requests authenticate with api-key + secret-key headers — no Basic Auth,
// no public-key (that pair is only for GET requests). The previous version of
// this function sent all three, which is what caused "Invalid credentials".
function headers() {
  return {
    "api-key": env.vtpassApiKey,
    "secret-key": env.vtpassSecretKey,
    "Content-Type": "application/json",
  };
}

export async function vtpassPay(payload, timeout = 25000) {
  let res;
  try {
    res = await axios.post(`${env.vtpassBaseUrl}/pay`, payload, { headers: headers(), timeout });
  } catch (err) {
    console.error("VTpass call error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not complete delivery. No charge made.");
  }

  const code = res.data?.code;
  // "000" = success, "099" = processing (treat as ok, reconcile later via requery)
  if (code !== "000" && code !== "099") {
    console.error("VTpass returned non-success:", res.data);
    throw new ApiError(502, `Delivery failed: ${res.data?.response_description || "Unknown error"}`);
  }

  return res.data;
}

// GET requests use api-key + public-key (per VTpass docs — different from the
// api-key + secret-key pair used for POST /pay above). Used to fetch the real
// variation codes for data bundles / cable bouquets — the frontend can't just
// guess a code like "mtn-1000", VTpass has its own fixed list per service.
export async function vtpassVariations(serviceID) {
  try {
    const res = await axios.get(`${env.vtpassBaseUrl}/service-variations`, {
      params: { serviceID },
      headers: { "api-key": env.vtpassApiKey, "public-key": env.vtpassPublicKey },
      timeout: 15000,
    });
    return res.data;
  } catch (err) {
    console.error("VTpass variations error:", err.response?.data || err.message);
    throw new ApiError(502, "Could not load plans. Try again.");
  }
}

// Confirms a cable smartcard number belongs to a real, active subscription
// before payment — same trust pattern as resolving a bank account name
// before a transfer. POST, so api-key + secret-key per VTpass's documented
// rule. Deliberately does NOT surface a "renewal amount" from this response —
// VTpass's own docs don't clearly confirm that field's exact name, and
// guessing wrong could silently charge the wrong amount. The bouquet price
// from vtpassVariations (already confirmed correct) is what's actually billed.
export async function vtpassMerchantVerify({ billersCode, serviceID }) {
  try {
    const res = await axios.post(
      `${env.vtpassBaseUrl}/merchant-verify`,
      { billersCode, serviceID },
      { headers: headers(), timeout: 15000 }
    );
    return res.data?.content;
  } catch (err) {
    console.error("VTpass merchant-verify error:", err.response?.data || err.message);
    throw new ApiError(400, "Could not verify that smartcard number. Check it and try again.");
  }
}

export async function vtpassRequery(requestId) {
  const res = await axios.post(
    `${env.vtpassBaseUrl}/requery`,
    { request_id: requestId },
    { headers: headers(), timeout: 25000 }
  );
  return res.data;
}
