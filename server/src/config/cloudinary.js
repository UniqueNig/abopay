import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { ApiError } from "../middleware/errorHandler.js";

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

// Checked lazily at upload/read time rather than at server startup — see
// config/env.js for why these aren't in the required-env-vars list.
export function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new ApiError(500, "KYC uploads are not configured yet. Contact support.");
  }
}

export { cloudinary };
