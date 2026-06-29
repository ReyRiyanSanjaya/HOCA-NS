// ============================================================
// APPLICATION CONFIGURATION
// ============================================================

export const APP_CONFIG = {
  name: "AXIS Seeding Dashboard",
  version: "1.0.0",
  description: "XL AXIS Smart Fren New Site Seeding Operation Dashboard",
} as const;

// Google Apps Script Web App URL - update with actual deployment URL
export const GAS_BASE_URL =
  process.env.NEXT_PUBLIC_GAS_URL ||
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

export const API_ENDPOINTS = {
  masterBTS: `${GAS_BASE_URL}?action=master-bts`,
  masterPromotor: `${GAS_BASE_URL}?action=master-promotor`,
  masterSPV: `${GAS_BASE_URL}?action=master-spv`,
  transaction: GAS_BASE_URL,
  dashboard: `${GAS_BASE_URL}?action=dashboard`,
  analytics: `${GAS_BASE_URL}?action=analytics`,
  gallery: `${GAS_BASE_URL}?action=gallery`,
} as const;

export const CACHE_KEYS = {
  masterBTS: "master-bts",
  masterPromotor: "master-promotor",
  masterSPV: "master-spv",
  dashboard: "dashboard",
  analytics: "analytics",
  gallery: "gallery",
  transactions: "transactions",
} as const;

export const CACHE_TIMES = {
  masterData: 10 * 60 * 1000, // 10 minutes
  dashboard: 30 * 1000, // 30 seconds
  analytics: 60 * 1000, // 1 minute
  gallery: 60 * 1000, // 1 minute
} as const;

export const DEFAULT_SETTINGS = {
  radiusGPS: 500, // meters
  defaultMapView: "street" as const,
  theme: "system" as const,
  refreshInterval: 30, // seconds
  imageCompression: 0.7,
};

export const BRANDS = [
  "XL",
  "AXIS",
  "SmartFren",
  "Telkomsel",
  "Indosat",
  "3",
] as const;

export const MAP_CENTER: [number, number] = [-2.5489, 118.0149]; // Indonesia center
export const MAP_DEFAULT_ZOOM = 5;

export const MARKER_COLORS = {
  never: "#6B7280", // gray
  today: "#10B981", // green
  week: "#3B82F6", // blue
  month: "#F59E0B", // orange
  problem: "#EF4444", // red
} as const;

export const STORAGE_KEYS = {
  settings: "axis-seeding-settings",
  offlineQueue: "axis-seeding-offline-queue",
  cachedBTS: "axis-seeding-bts-cache",
} as const;
