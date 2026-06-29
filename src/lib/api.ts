import axios from "axios";
import type {
  MasterBTS,
  MasterPromotor,
  MasterSPV,
  Transaction,
  DashboardKPI,
  AnalyticsData,
  GalleryItem,
  PostTransactionResponse,
  GlobalFilter,
} from "@/types";
import { API_ENDPOINTS, GAS_BASE_URL } from "./config";

// ============================================================
// AXIOS INSTANCE
// ============================================================

const apiClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// MASTER DATA APIs
// ============================================================

export async function fetchMasterBTS(): Promise<MasterBTS[]> {
  const { data } = await apiClient.get(API_ENDPOINTS.masterBTS);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Master BTS");
}

export async function fetchMasterPromotor(): Promise<MasterPromotor[]> {
  const { data } = await apiClient.get(API_ENDPOINTS.masterPromotor);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Master Promotor");
}

export async function fetchMasterSPV(): Promise<MasterSPV[]> {
  const { data } = await apiClient.get(API_ENDPOINTS.masterSPV);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Master SPV");
}

// ============================================================
// DASHBOARD APIs
// ============================================================

export async function fetchDashboard(
  filter?: Partial<GlobalFilter>
): Promise<DashboardKPI> {
  const params = new URLSearchParams({ action: "dashboard" });
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Dashboard");
}

// ============================================================
// ANALYTICS APIs
// ============================================================

export async function fetchAnalytics(
  filter?: Partial<GlobalFilter>
): Promise<AnalyticsData> {
  const params = new URLSearchParams({ action: "analytics" });
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Analytics");
}

// ============================================================
// GALLERY APIs
// ============================================================

export async function fetchGallery(
  filter?: Partial<GlobalFilter>
): Promise<GalleryItem[]> {
  const params = new URLSearchParams({ action: "gallery" });
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Gallery");
}

// ============================================================
// TRANSACTIONS APIs
// ============================================================

export async function fetchTransactions(
  filter?: Partial<GlobalFilter>
): Promise<Transaction[]> {
  const params = new URLSearchParams({ action: "transactions" });
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Transactions");
}

export async function postTransaction(
  formData: FormData
): Promise<PostTransactionResponse> {
  const { data } = await apiClient.post(GAS_BASE_URL, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (data.success) return data;
  throw new Error(data.error || "Failed to submit transaction");
}

// ============================================================
// MAP APIs
// ============================================================

export async function fetchMapData(
  filter?: Partial<GlobalFilter>
): Promise<{
  markers: Array<{
    id: string;
    towerName: string;
    latitude: number;
    longitude: number;
    kabupaten: string;
    cluster: string;
    pm: string;
    spv: string;
    markerStatus: string;
    activationCount: number;
    lastActivation: string | null;
    lastPromotor: string | null;
    lastPhotoURL: string | null;
  }>;
}> {
  const params = new URLSearchParams({ action: "map" });
  if (filter) {
    Object.entries(filter).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch Map Data");
}

export async function fetchBTSHistory(idBTS: string): Promise<Transaction[]> {
  const params = new URLSearchParams({
    action: "bts-history",
    idBTS,
  });
  const { data } = await apiClient.get(`${GAS_BASE_URL}?${params}`);
  if (data.success) return data.data;
  throw new Error(data.error || "Failed to fetch BTS History");
}

// ============================================================
// IMPORT APIs
// ============================================================

import type { ImportResponse, ImportTarget } from "@/types";

const BATCH_SIZE = 50; // rows per request to avoid GAS timeout

export async function importMasterData(
  target: ImportTarget,
  rows: Record<string, string>[],
  mode: "append" | "replace" = "append",
  onProgress?: (done: number, total: number) => void
): Promise<ImportResponse> {
  const params = new URLSearchParams({ action: "import" });
  const url    = `${GAS_BASE_URL}?${params}`;

  const total: ImportResponse = { success: true, inserted: 0, updated: 0, skipped: 0, errors: [], message: "" };

  // Split into batches
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    const batchMode = b === 0 ? mode : "append"; // only first batch can replace
    const payload   = JSON.stringify({ target, rows: batches[b], mode: batchMode });

    const { data } = await apiClient.post(url, payload, {
      headers: { "Content-Type": "text/plain" },
      timeout: 90000, // 90s per batch
    });

    if (!data.success) throw new Error(data.errors?.[0] || data.message || "Import batch gagal");

    total.inserted += data.inserted || 0;
    total.updated  += data.updated  || 0;
    total.skipped  += data.skipped  || 0;
    if (data.errors?.length) total.errors.push(...data.errors);

    onProgress?.(Math.min((b + 1) * BATCH_SIZE, rows.length), rows.length);
  }

  total.message = `${total.inserted} baris ditambah, ${total.updated} diperbarui, ${total.skipped} dilewati.`;
  return total;
}
