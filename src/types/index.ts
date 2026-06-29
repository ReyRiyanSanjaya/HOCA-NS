// ============================================================
// MASTER DATA TYPES
// ============================================================

export interface MasterBTS {
  id: string; // Primary Key - ID BTS
  towerName: string;
  latitude: number;
  longitude: number;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  cluster: string;
  xl: string;
  spm: string;
  spv: string;
  region: string;
  branch: string;
  newTowerOADate: string;
  qtySPSeedingByBrands: string;
  statusTower: string;
  priority: string;
}

export interface MasterPromotor {
  namaPromotor: string;
  spv: string;
  area: string;
  status: string;
}

export interface MasterSPV {
  namaSPV: string;
  area: string;
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

export interface Transaction {
  id: string;
  timestamp: string;
  tanggal: string;
  jam: string;
  supervisor: string;
  promotor: string;
  brand: string;
  idBTS: string;
  mdn: string;
  photoURL: string;
  latitudeUser: number;
  longitudeUser: number;
  distanceFromBTS: number;
  googleMapsURL: string;
  device: string;
  browser: string;
  status: string;
}

export interface TransactionInput {
  supervisor: string;
  promotor: string;
  brand: string;
  idBTS: string;
  mdn: string;
  photoFile: File | null;
  latitudeUser: number;
  longitudeUser: number;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardKPI {
  todayActivation: number;
  weeklyActivation: number;
  monthlyActivation: number;
  totalBTS: number;
  activatedBTS: number;
  pendingBTS: number;
  activationPercent: number;
  totalPromotor: number;
  activePromotor: number;
  totalSPV: number;
  totalKabupaten: number;
  totalCluster: number;
  totalPM: number;
  brandDistribution: BrandCount[];
  avgActivationPerBTS: number;
  avgActivationPerPromotor: number;
  avgActivationPerSPV: number;
}

export interface BrandCount {
  brand: string;
  count: number;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface DailyTrend {
  date: string;
  count: number;
}

export interface WeeklyTrend {
  week: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface PerformanceItem {
  name: string;
  count: number;
  percent: number;
}

export interface HourlyActivation {
  hour: number;
  count: number;
}

export interface WeekdayActivation {
  day: string;
  count: number;
}

export interface AnalyticsData {
  dailyTrend: DailyTrend[];
  weeklyTrend: WeeklyTrend[];
  monthlyTrend: MonthlyTrend[];
  brandDistribution: BrandCount[];
  supervisorPerformance: PerformanceItem[];
  promotorPerformance: PerformanceItem[];
  kabupatenPerformance: PerformanceItem[];
  clusterPerformance: PerformanceItem[];
  pmPerformance: PerformanceItem[];
  hourlyActivation: HourlyActivation[];
  weekdayActivation: WeekdayActivation[];
  top10Promotor: PerformanceItem[];
  top10BTS: PerformanceItem[];
  topKabupaten: PerformanceItem[];
  topCluster: PerformanceItem[];
  topPM: PerformanceItem[];
  brandShare: BrandCount[];
  growthPercent: number;
  movingAverage: DailyTrend[];
}

// ============================================================
// GALLERY TYPES
// ============================================================

export interface GalleryItem {
  id: string;
  timestamp: string;
  tanggal: string;
  promotor: string;
  supervisor: string;
  brand: string;
  idBTS: string;
  towerName: string;
  kabupaten: string;
  cluster: string;
  pm: string;
  photoURL: string;
  latitudeUser: number;
  longitudeUser: number;
  googleMapsURL: string;
}

// ============================================================
// FILTER TYPES
// ============================================================

export interface GlobalFilter {
  dateFrom: string;
  dateTo: string;
  supervisor: string;
  promotor: string;
  brand: string;
  kabupaten: string;
  cluster: string;
  pm: string;
  statusTower: string;
  keyword: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PostTransactionResponse {
  success: boolean;
  id: string;
  message: string;
}

// ============================================================
// MAP TYPES
// ============================================================

export type MarkerStatus = "never" | "today" | "week" | "month" | "problem";

export interface BTSMarker extends MasterBTS {
  markerStatus: MarkerStatus;
  activationCount: number;
  lastActivation: string | null;
  lastPromotor: string | null;
  lastPhotoURL: string | null;
}

// ============================================================
// SETTINGS TYPES
// ============================================================

export interface AppSettings {
  radiusGPS: number; // meters
  defaultMapView: "street" | "satellite" | "terrain";
  theme: "light" | "dark" | "system";
  refreshInterval: number; // seconds
  imageCompression: number; // 0-1
}

// ============================================================
// FORM TYPES
// ============================================================

export interface InputFormValues {
  supervisor: string;
  promotor: string;
  brand: string;
  idBTS: string;
  mdn: string;
  photo: FileList | null;
}

// ============================================================
// OFFLINE QUEUE TYPES
// ============================================================

export interface OfflineQueueItem {
  id: string;
  timestamp: string;
  formData: {
    supervisor: string;
    promotor: string;
    brand: string;
    idBTS: string;
    mdn: string;
    photoBase64: string;
    latitudeUser: number;
    longitudeUser: number;
  };
  retryCount: number;
}

// ============================================================
// IMPORT TYPES
// ============================================================

export type ImportTarget = "bts" | "promotor" | "spv";

export interface ImportPreview {
  target: ImportTarget;
  headers: string[];
  rows: Record<string, string>[];
  total: number;
  mapped: number; // rows with required fields filled
  errors: string[];
}

export interface ImportResponse {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  message: string;
}
