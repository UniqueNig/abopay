import { AppSettings } from "../models/AppSettings.js";
import { ApiError } from "../middleware/errorHandler.js";

// Singleton — creates the one settings doc with schema defaults on first
// read if it doesn't exist yet, so every route can call this without
// worrying about a missing document.
export async function getSettings() {
  let settings = await AppSettings.findOne();
  if (!settings) settings = await AppSettings.create({});
  return settings;
}

export function assertNotMaintenance(settings) {
  if (settings.maintenanceMode) {
    throw new ApiError(503, "Abopay is temporarily down for maintenance. Please try again shortly.");
  }
}

export function assertServiceEnabled(settings, key) {
  if (settings.servicesEnabled?.[key] === false) {
    throw new ApiError(503, "This service is temporarily unavailable. Please try again later.");
  }
}
