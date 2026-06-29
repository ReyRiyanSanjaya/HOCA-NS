// ============================================================
// APPLICATION CONFIGURATION
// ============================================================

export const APP_CONFIG = {
  name: "HCA NS Seeding Dashboard",
  version: "1.0.0",
  description: "XL AXIS SmartFren New Site Seeding Operation Dashboard",
} as const;

// Google Apps Script Web App URL
export const GAS_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://script.google.com/macros/s/AKfycbzmwQgWGw-sJPAd2aB1YEODYyYfAAnwDXAntmKA5WWOldKwN5wDNfkdCNgLce-rwxjdaw/exec";

export const API_ENDPOINTS = {
  masterBTS:      `${GAS_BASE_URL}?action=master-bts`,
  masterPromotor: `${GAS_BASE_URL}?action=master-promotor`,
  masterSPV:      `${GAS_BASE_URL}?action=master-spv`,
  transaction:    GAS_BASE_URL,
  dashboard:      `${GAS_BASE_URL}?action=dashboard`,
  analytics:      `${GAS_BASE_URL}?action=analytics`,
  gallery:        `${GAS_BASE_URL}?action=gallery`,
} as const;

export const CACHE_KEYS = {
  masterBTS:      "master-bts",
  masterPromotor: "master-promotor",
  masterSPV:      "master-spv",
  dashboard:      "dashboard",
  analytics:      "analytics",
  gallery:        "gallery",
  transactions:   "transactions",
} as const;

export const CACHE_TIMES = {
  masterData: 10 * 60 * 1000, // 10 menit
  dashboard:  30 * 1000,       // 30 detik
  analytics:  60 * 1000,       // 1 menit
  gallery:    60 * 1000,
} as const;

export const DEFAULT_SETTINGS = {
  radiusGPS:        500,
  defaultMapView:   "street" as const,
  theme:            "system" as const,
  refreshInterval:  30,
  imageCompression: 0.7,
};

// Brand sesuai data asli
export const BRANDS = [
  "Smartfren",
  "XL",
  "Axis",
] as const;

export const MAP_CENTER: [number, number] = [-2.5489, 118.0149];
export const MAP_DEFAULT_ZOOM = 5;

export const MARKER_COLORS = {
  never:   "#6B7280",
  today:   "#10B981",
  week:    "#3B82F6",
  month:   "#F59E0B",
  problem: "#EF4444",
} as const;

export const STORAGE_KEYS = {
  settings:     "axis-seeding-settings",
  offlineQueue: "axis-seeding-offline-queue",
  cachedBTS:    "axis-seeding-bts-cache",
} as const;

// ============================================================
// IMPORT PASSWORD
// Kata sandi proteksi import data master
// Ganti sesuai keinginan — simpan di .env untuk produksi
// ============================================================
export const IMPORT_PASSWORD =
  process.env.NEXT_PUBLIC_IMPORT_PASSWORD || "HocaNS2025";
