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
