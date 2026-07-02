// ============================================================
// MASTER BTS — kolom sesuai data asli
// ============================================================
export interface MasterBTS {
  id: string;              // Tower ID (Primary Key)
  towerName: string;       // Tower Name
  newTowerOADate: string;  // New Tower OA Date (NewTower Activated)
  latitude: number;        // Lat
  longitude: number;       // Long
  cluster: string;         // Cluster
  qtySPSeedingByBrands: string; // Qty SP Seeding per BTS
  spm: string;             // PM
  spv: string;             // SPV
  kabupaten: string;       // Kabupaten
  // optional / legacy
  kecamatan: string;
  kelurahan: string;
  xl: string;
  region: string;
  branch: string;
  statusTower: string;
  priority: string;
}

// ============================================================
// MASTER PROMOTOR
// ============================================================
export interface MasterPromotor {
  namaPromotor: string;    // Nama Promotor Outstore
  spv: string;
  area: string;
  status: string;
}

// ============================================================
// MASTER SPV
// ============================================================
export interface MasterSPV {
  namaSPV: string;
  area: string;
}

// ============================================================
// TRANSACTION — field sesuai form input
// ============================================================
export interface Transaction {
  id: string;
  timestamp: string;
  tanggal: string;
  jam: string;
  supervisor: string;          // Supervisor
  idBTS: string;               // ID BTS
  promotor: string;            // Nama Promotor Outstore
  brand: string;               // Brand (Smartfren/XL/Axis)
  mdn: string;                 // MDN Aktivasi
  photoURL: string;            // Dokumentasi
  latitudeUser: number;
  longitudeUser: number;
  distanceFromBTS: number;
  googleMapsURL: string;
  device: string;
  browser: string;
  status: string;
  speedtest: string;           // Hasil speedtest (Mbps)
  speedtestPhotoURL: string;   // URL foto dokumentasi speedtest
}

export interface TransactionInput {
  supervisor: string;
  idBTS: string;
  promotor: string;
  brand: string;
  mdn: string;
  photoFile: File | null;
  latitudeUser: number;
  longitudeUser: number;
}

// ============================================================
// DASHBOARD
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
// ANALYTICS
// ============================================================
export interface DailyTrend    { date: string;  count: number; }
export interface WeeklyTrend   { week: string;  count: number; }
export interface MonthlyTrend  { month: string; count: number; }
export interface PerformanceItem { name: string; count: number; percent: number; }
export interface HourlyActivation  { hour: number; count: number; }
export interface WeekdayActivation { day: string;  count: number; }

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
// GALLERY
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
// FILTER
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
// API RESPONSES
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
// MAP
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
// SETTINGS
// ============================================================
export interface AppSettings {
  radiusGPS: number;
  defaultMapView: "street" | "satellite" | "terrain";
  theme: "light" | "dark" | "system";
  refreshInterval: number;
  imageCompression: number;
}

// ============================================================
// FORM
// ============================================================
export interface InputFormValues {
  supervisor: string;
  idBTS: string;
  promotor: string;
  brand: string;
  mdn: string;
  photo: FileList | null;
}

// ============================================================
// OFFLINE QUEUE
// ============================================================
export interface OfflineQueueItem {
  id: string;
  timestamp: string;
  formData: {
    supervisor: string;
    idBTS: string;
    promotor: string;
    brand: string;
    mdn: string;
    photoBase64: string;
    latitudeUser: number;
    longitudeUser: number;
  };
  retryCount: number;
}

// ============================================================
// IMPORT
// ============================================================
export type ImportTarget = "bts" | "promotor" | "spv";

export interface ImportPreview {
  target: ImportTarget;
  headers: string[];
  rows: Record<string, string>[];
  total: number;
  mapped: number;
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
