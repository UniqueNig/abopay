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

function headers() {
  // VTpass requires both Basic auth (username:password encoded) AND an api-key header
  const credentials = Buffer.from(`${env.vtpassPublicKey}:${env.vtpassSecretKey}`).toString("base64");
  return {
    "api-key": env.vtpassApiKey,
    "public-key": env.vtpassPublicKey,
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

export async function vtpassPay(payload, timeout = 15000) {
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

export async function vtpassRequery(requestId) {
  const res = await axios.post(
    `${env.vtpassBaseUrl}/requery`,
    { request_id: requestId },
    { headers: headers(), timeout: 15000 }
  );
  return res.data;
}
