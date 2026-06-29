"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Navigation, X, Radio, MapPin, Calendar, Users, ExternalLink,
  Image as ImageIcon, Target, CheckCircle2, AlertTriangle, XCircle,
  Activity, Layers, Filter, ChevronDown, ChevronUp, BarChart2,
  RefreshCw, Eye, EyeOff, List,
} from "lucide-react";
import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { Badge }      from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton }   from "@/components/ui/skeleton";
import { Progress }   from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchMapData, fetchBTSHistory } from "@/lib/api";
import { useMasterBTS } from "@/hooks/use-master-data";
import { CACHE_KEYS } from "@/lib/config";
import { formatDateTime, formatDistance, getGoogleMapsNavigationURL, cn, formatNumber } from "@/lib/utils";
import type { GlobalFilter } from "@/types";

// ─── constants ───────────────────────────────────────────────────────────────
const TARGET_MULTIPLIER = 3;

// ─── target-aware marker status ──────────────────────────────────────────────
type TargetStatus = "achieved" | "on_progress" | "not_started" | "no_target" | "problem" | "today";

interface EnrichedMarker {
  id: string;
  towerName: string;
  latitude: number;
  longitude: number;
  kabupaten: string;
  cluster: string;
  pm: string;
  spv: string;
  markerStatus: string;   // original (never/today/week/month/problem)
  targetStatus: TargetStatus;
  activationCount: number;
  target: number;
  qtySP: number;
  progressPct: number;
  gap: number;
  lastActivation: string | null;
  lastPromotor: string | null;
  lastPhotoURL: string | null;
}

function parseQtySP(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n <= 0 ? 0 : Math.round(n);
}

const TARGET_COLORS: Record<TargetStatus, string> = {
  achieved:    "#22c55e",   // green
  on_progress: "#eab308",   // yellow
  not_started: "#ef4444",   // red
  no_target:   "#6b7280",   // gray
  today:       "#3b82f6",   // blue — activated today (override)
  problem:     "#a855f7",   // purple
};

const TARGET_LABELS: Record<TargetStatus, string> = {
  achieved:    "Achieved",
  on_progress: "On Progress",
  not_started: "Not Started",
  no_target:   "No Target",
  today:       "Aktif Hari Ini",
  problem:     "Problem",
};

function getTargetStatus(
  activationCount: number,
  target: number,
  markerStatus: string,
): TargetStatus {
  if (markerStatus === "problem") return "problem";
  if (markerStatus === "today")   return "today";
  if (target === 0) {
    return activationCount > 0 ? "on_progress" : "not_started";
  }
  const pct = (activationCount / target) * 100;
  if (pct >= 100)  return "achieved";
  if (pct > 0)     return "on_progress";
  return "not_started";
}

type MapView = "street" | "satellite" | "terrain";

interface BTSMapProps { filter: Partial<GlobalFilter>; }

// ─── inject bounce + pulse CSS once ─────────────────────────────────────────
function injectMarkerCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("bts-marker-css")) return;
  const style = document.createElement("style");
  style.id = "bts-marker-css";
  style.textContent = `
    @keyframes bts-bounce {
      0%,100% { transform: translateY(0) scale(1); }
      30%      { transform: translateY(-10px) scale(1.1); }
      60%      { transform: translateY(-4px) scale(1.05); }
    }
    @keyframes bts-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.8; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes bts-selected-pop {
      0%   { transform: scale(0.8); }
      60%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
    .bts-bounce   { animation: bts-bounce 1.4s ease-in-out infinite; }
    .bts-pulse    { animation: bts-pulse-ring 1.6s ease-out infinite; }
    .bts-selected { animation: bts-selected-pop 0.3s cubic-bezier(.36,.07,.19,.97) both; }
  `;
  document.head.appendChild(style);
}

// ─── marker SVG factory ──────────────────────────────────────────────────────
function makeMarkerHtml(
  color: string,
  isToday: boolean,
  pct: number,
  status: TargetStatus,
  isSelected = false,
): string {
  const shouldBounce  = status === "not_started";
  const shouldPulse   = status === "not_started" || status === "problem";
  const size          = isSelected ? 34 : status === "not_started" ? 28 : 26;
  const border        = isSelected ? "3px solid white" : "2.5px solid white";

  let shadow = `box-shadow:0 2px 8px rgba(0,0,0,0.4)`;
  if (isToday)    shadow = `box-shadow:0 0 0 3px ${color}55,0 2px 10px ${color}88`;
  if (isSelected) shadow = `box-shadow:0 0 0 4px ${color}66,0 4px 16px ${color}99`;

  const innerBar = pct > 0 && pct < 100
    ? `<div style="position:absolute;bottom:0;left:0;right:0;height:${Math.min(pct,100)*0.28}px;
        background:rgba(255,255,255,0.5);border-radius:0 0 50% 50%;"></div>`
    : "";

  // Pulse ring (separate element behind the dot)
  const pulseRing = shouldPulse
    ? `<div class="bts-pulse" style="
        position:absolute;width:${size}px;height:${size}px;border-radius:50%;
        background:${color};top:0;left:0;pointer-events:none;z-index:0;
      "></div>`
    : "";

  const wrapClass = [
    shouldBounce  ? "bts-bounce"   : "",
    isSelected    ? "bts-selected" : "",
  ].filter(Boolean).join(" ");

  return `<div style="position:relative;width:${size}px;height:${size}px;">
    ${pulseRing}
    <div class="${wrapClass}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background-color:${color};
      border:${border};
      ${shadow};
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;position:relative;overflow:hidden;z-index:1;
      transition:transform 0.15s;
    ">
      ${innerBar}
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
        fill="none" stroke="white" stroke-width="2.5" style="position:relative;z-index:1">
        <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/>
        <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
        <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/>
        <path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>
      </svg>
    </div>
  </div>`;
}

// ─── rich tooltip content ─────────────────────────────────────────────────────
function makeTooltipHtml(bts: EnrichedMarker): string {
  const color   = TARGET_COLORS[bts.targetStatus];
  const pctStr  = bts.target > 0 ? `${Math.min(bts.progressPct, 100).toFixed(0)}%` : "—";
  const gapStr  = bts.gap > 0 ? `Kurang: <b style="color:#ef4444">${bts.gap}</b> aktivasi` : bts.target > 0 ? `<span style="color:#22c55e">✓ Target tercapai</span>` : "";

  const actionMap: Record<TargetStatus, string> = {
    not_started: "🚨 Segera kirim promotor ke tower ini",
    on_progress: "⚡ Tingkatkan frekuensi kunjungan",
    achieved:    "✅ Pertahankan — target sudah tercapai",
    today:       "🔵 Tower aktif hari ini",
    problem:     "⚠️ Cek kondisi tower — ada masalah",
    no_target:   "📋 Set target di master BTS",
  };

  return `<div style="font-family:inherit;min-width:200px;max-width:240px;padding:2px 0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};shrink:0;flex-shrink:0"></div>
      <b style="font-size:12px">${bts.id}</b>
    </div>
    ${bts.towerName ? `<p style="font-size:11px;color:#888;margin:0 0 6px">${bts.towerName}</p>` : ""}
    <div style="background:${color}18;border-radius:8px;padding:6px 8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:${color};font-weight:700">${TARGET_LABELS[bts.targetStatus]}</span>
        <span style="font-size:14px;font-weight:800;color:${color}">${pctStr}</span>
      </div>
      <div style="font-size:10px;color:#888;margin-top:2px">${bts.activationCount} aktivasi / ${bts.target > 0 ? `${bts.target} target` : "no target"}</div>
      ${bts.target > 0 ? `
        <div style="margin-top:5px;height:5px;background:rgba(0,0,0,0.1);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${Math.min(bts.progressPct,100)}%;background:${color};border-radius:99px"></div>
        </div>` : ""}
      ${gapStr ? `<div style="font-size:10px;margin-top:3px">${gapStr}</div>` : ""}
    </div>
    <div style="font-size:10px;color:#666;display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-bottom:6px">
      <span>📍 ${bts.kabupaten||"—"}</span>
      <span>📡 ${bts.cluster||"—"}</span>
      ${bts.spv ? `<span>👤 SPV: ${bts.spv}</span>` : ""}
      ${bts.pm  ? `<span>🏢 PM: ${bts.pm}</span>` : ""}
    </div>
    ${bts.lastActivation ? `<div style="font-size:10px;color:#888;margin-bottom:6px">🕒 Terakhir: ${bts.lastActivation}</div>` : ""}
    <div style="font-size:10px;background:#f1f5f9;border-radius:6px;padding:5px 7px;color:#475569;font-style:italic">
      ${actionMap[bts.targetStatus]}
    </div>
    <div style="font-size:9px;color:#aaa;margin-top:4px;text-align:center">Klik untuk detail lengkap</div>
  </div>`;
}

// ─── Legend panel component ───────────────────────────────────────────────────
const LEGEND_ACTIONS: Record<TargetStatus, string> = {
  not_started: "Belum ada aktivasi — prioritas utama",
  on_progress: "Sudah berjalan, belum capai target",
  achieved:    "Target sudah tercapai",
  today:       "Ada aktivasi hari ini",
  problem:     "Ada masalah pada tower",
  no_target:   "Target belum diset di master BTS",
};

const LEGEND_ICONS: Record<TargetStatus, string> = {
  not_started: "🔴",
  on_progress: "🟡",
  achieved:    "✅",
  today:       "🔵",
  problem:     "🟣",
  no_target:   "⬜",
};

function LegendPanel({
  summary, enrichedCount, visibleCount,
}: {
  summary: Record<TargetStatus, number>;
  enrichedCount: number;
  visibleCount: number;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const achieved = summary.achieved;
  const total    = enrichedCount;
  const overallPct = total > 0 ? Math.round((achieved / total) * 100) : 0;
  const critical   = summary.not_started + summary.problem;

  return (
    <div className="bg-card/97 backdrop-blur-md rounded-2xl border border-border/60 shadow-lg overflow-hidden max-w-[220px]">
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <div className="h-5 w-5 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
          <Layers className="h-3 w-3 text-blue-500" />
        </div>
        <span className="text-[10px] font-bold text-foreground flex-1 text-left">Status Tower</span>
        {critical > 0 && (
          <span className="text-[9px] bg-red-500/15 text-red-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">
            {critical}⚠
          </span>
        )}
        {expanded
          ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          : <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30">
          {/* Overall bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Overall Achieved</span>
              <span className="text-[10px] font-bold text-green-600">{overallPct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${overallPct}%`, background: overallPct >= 70 ? "#22c55e" : overallPct >= 40 ? "#eab308" : "#ef4444" }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
              Tampil: {visibleCount}/{enrichedCount} tower
            </p>
          </div>

          {/* Status rows */}
          <div className="space-y-1.5">
            {(["achieved","on_progress","not_started","today","problem","no_target"] as TargetStatus[]).map(s => {
              const cnt = summary[s];
              const pct = enrichedCount > 0 ? Math.round((cnt / enrichedCount) * 100) : 0;
              return (
                <div key={s} className="group">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full shrink-0 border-2 border-white/50",
                        s === "not_started" ? "bts-bounce" : ""
                      )}
                      style={{ backgroundColor: TARGET_COLORS[s], boxShadow: `0 0 0 1px ${TARGET_COLORS[s]}40` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium">{LEGEND_ICONS[s]} {TARGET_LABELS[s]}</span>
                        <span className="text-[10px] font-bold tabular-nums ml-1 shrink-0">{cnt}</span>
                      </div>
                      <div className="h-0.5 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TARGET_COLORS[s] }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground ml-5 leading-tight mt-0.5">
                    {LEGEND_ACTIONS[s]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bounce indicator */}
          <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-2 py-1.5 text-[9px] text-red-600 dark:text-red-400">
            🔴 Marker merah <b>memantul</b> = butuh tindakan segera
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function BTSMap({ filter }: BTSMapProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInstanceRef= useRef<unknown>(null);
  const markersLayerRef = useRef<unknown[]>([]);
  const [L, setL]     = useState<typeof import("leaflet") | null>(null);

  // UI state
  const [mapView,      setMapView]      = useState<MapView>("street");
  const [selectedBTS,  setSelectedBTS]  = useState<EnrichedMarker | null>(null);
  const [sideOpen,     setSideOpen]     = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [userMarker,   setUserMarker]   = useState<unknown>(null);
  const [showList,     setShowList]     = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | TargetStatus>("all");
  const [filterKab,    setFilterKab]    = useState("all");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [listSearch,   setListSearch]   = useState("");

  // Data
  const { data: mapData, isLoading, refetch } = useQuery({
    queryKey: [CACHE_KEYS.masterBTS, "map", filter],
    queryFn: () => fetchMapData(filter),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const { data: btsData } = useMasterBTS();
  const { data: btsHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["bts-history", selectedBTS?.id],
    queryFn: () => fetchBTSHistory(selectedBTS!.id),
    enabled: !!selectedBTS && sideOpen,
  });

  // Build enriched markers (merge map data with master BTS for target info)
  const enriched = useMemo<EnrichedMarker[]>(() => {
    if (!mapData?.markers) return [];
    const btsMap: Record<string, { qtySPSeedingByBrands: string }> = {};
    if (btsData) {
      for (const b of btsData) btsMap[b.id] = b;
    }
    return mapData.markers.map((m) => {
      const master = btsMap[m.id];
      const qtySP  = master ? parseQtySP(master.qtySPSeedingByBrands) : 0;
      const target = qtySP * TARGET_MULTIPLIER;
      const pct    = target > 0 ? (m.activationCount / target) * 100 : 0;
      const ts     = getTargetStatus(m.activationCount, target, m.markerStatus);
      return {
        ...m,
        qtySP,
        target,
        targetStatus: ts,
        progressPct: pct,
        gap: Math.max(0, target - m.activationCount),
      };
    });
  }, [mapData, btsData]);

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<TargetStatus, number> = { achieved: 0, on_progress: 0, not_started: 0, no_target: 0, today: 0, problem: 0 };
    for (const m of enriched) counts[m.targetStatus]++;
    return counts;
  }, [enriched]);

  // Filter + search for list & markers
  const visibleMarkers = useMemo(() => {
    let list = enriched;
    if (filterStatus !== "all") list = list.filter(m => m.targetStatus === filterStatus);
    if (filterKab !== "all")    list = list.filter(m => m.kabupaten === filterKab);
    return list;
  }, [enriched, filterStatus, filterKab]);

  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return visibleMarkers;
    const kw = listSearch.toLowerCase();
    return visibleMarkers.filter(m =>
      m.id.toLowerCase().includes(kw) ||
      m.towerName.toLowerCase().includes(kw) ||
      m.kabupaten.toLowerCase().includes(kw)
    );
  }, [visibleMarkers, listSearch]);

  const kabOptions = useMemo(() => [...new Set(enriched.map(m => m.kabupaten).filter(Boolean))].sort(), [enriched]);

  // Load Leaflet
  useEffect(() => {
    import("leaflet").then((mod) => {
      if (!document.querySelector("link[data-leaflet-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.setAttribute("data-leaflet-css", "1");
        document.head.appendChild(link);
      }
      injectMarkerCSS();
      setL(mod.default || mod);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;
    const lf = L as typeof import("leaflet");
    const map = lf.map(mapRef.current, { center: [-2.5489, 118.0149], zoom: 5, zoomControl: false });
    lf.control.zoom({ position: "bottomright" }).addTo(map);
    lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    (mapInstanceRef as React.MutableRefObject<unknown>).current = map;
    return () => { map.remove(); (mapInstanceRef as React.MutableRefObject<unknown>).current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !visibleMarkers.length) return;
    const lf  = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;

    markersLayerRef.current.forEach(m => (m as import("leaflet").Marker).remove());
    markersLayerRef.current = [];

    const latLngs: [number, number][] = [];

    visibleMarkers.forEach((bts) => {
      const color   = TARGET_COLORS[bts.targetStatus];
      const isToday = bts.markerStatus === "today";
      const isSelected = selectedBTS?.id === bts.id;

      const icon = lf.divIcon({
        html: makeMarkerHtml(color, isToday, bts.progressPct, bts.targetStatus, isSelected),
        className: "",
        iconSize: [bts.targetStatus === "not_started" ? 28 : isSelected ? 34 : 26, bts.targetStatus === "not_started" ? 28 : isSelected ? 34 : 26],
        iconAnchor: [bts.targetStatus === "not_started" ? 14 : isSelected ? 17 : 13, bts.targetStatus === "not_started" ? 14 : isSelected ? 17 : 13],
        popupAnchor: [0, -14],
      });

      const marker = lf.marker([bts.latitude, bts.longitude], { icon });

      marker.bindTooltip(makeTooltipHtml(bts), {
        direction: "top", offset: [0, -16],
        className: "leaflet-tooltip-custom",
        sticky: false,
      });

      marker.on("click", () => { setSelectedBTS(bts); setSideOpen(true); });
      marker.addTo(map);
      markersLayerRef.current.push(marker);

      if (bts.latitude && bts.longitude) {
        latLngs.push([bts.latitude, bts.longitude]);
      }
    });

    // Auto-zoom to fit all visible markers (only on first load / filter change)
    if (latLngs.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = lf.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true, duration: 1 });
      } catch {
        // ignore bounds error
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMarkers, L]);

  // Clear markers when none visible
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    if (visibleMarkers.length === 0) {
      markersLayerRef.current.forEach(m => (m as import("leaflet").Marker).remove());
      markersLayerRef.current = [];
    }
  }, [visibleMarkers, L]);

  // Change tile layer
  const changeMapView = useCallback((view: MapView) => {
    if (!mapInstanceRef.current || !L) return;
    const lf  = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;
    map.eachLayer(layer => { if (layer instanceof lf.TileLayer) layer.remove(); });
    const tiles: Record<MapView, string> = {
      street:    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      terrain:   "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    };
    lf.tileLayer(tiles[view], { attribution: "© Map contributors", maxZoom: 19 }).addTo(map);
    setMapView(view);
  }, [L]);

  // User location
  const getUserLocation = useCallback(() => {
    if (!mapInstanceRef.current || !L) return;
    const lf  = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;
    navigator.geolocation?.getCurrentPosition(({ coords: { latitude, longitude } }) => {
      map.setView([latitude, longitude], 15);
      if (userMarker) (userMarker as import("leaflet").Marker).remove();
      const icon = lf.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px #3b82f640"></div>`,
        className: "", iconSize: [14, 14], iconAnchor: [7, 7],
      });
      setUserMarker(lf.marker([latitude, longitude], { icon }).addTo(map));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, userMarker]);

  // Search tower
  const handleSearch = useCallback((q?: string) => {
    const query = (q ?? searchQuery).toLowerCase().trim();
    if (!mapInstanceRef.current || !query) return;
    const map = mapInstanceRef.current as import("leaflet").Map;
    const found = enriched.find(m =>
      m.id.toLowerCase().includes(query) ||
      m.towerName.toLowerCase().includes(query) ||
      m.kabupaten.toLowerCase().includes(query)
    );
    if (found) {
      map.setView([found.latitude, found.longitude], 16);
      setSelectedBTS(found); setSideOpen(true);
    }
  }, [enriched, searchQuery]);

  // Fly to marker from list
  const flyTo = useCallback((m: EnrichedMarker) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current as import("leaflet").Map;
    map.flyTo([m.latitude, m.longitude], 16, { duration: 1 });
    setSelectedBTS(m); setSideOpen(true); setShowList(false);
  }, []);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {/* Map canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex items-center gap-3 bg-card rounded-2xl px-5 py-3.5 shadow-xl border border-border/60">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Memuat data peta…</span>
          </div>
        </div>
      )}

      {/* ── TOP BAR: search + filter + layer controls ─────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex gap-2 flex-wrap">
        {/* Search */}
        <div className="flex gap-1.5 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari Tower ID, nama, kabupaten…"
              className="pl-9 h-9 text-xs bg-card/95 backdrop-blur-sm shadow-md border-border/60 rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="sm" onClick={() => handleSearch()} className="h-9 shadow-md shrink-0 text-xs px-3">
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(v => !v)}
          className={cn(
            "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold shadow-md transition-all",
            filterOpen || filterStatus !== "all" || filterKab !== "all"
              ? "bg-blue-500 text-white"
              : "bg-card/95 backdrop-blur-sm border border-border/60 text-foreground hover:bg-muted"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {(filterStatus !== "all" || filterKab !== "all") && (
            <span className="bg-white/25 rounded-full px-1.5 text-[10px]">
              {[filterStatus !== "all", filterKab !== "all"].filter(Boolean).length}
            </span>
          )}
          {filterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* List button */}
        <button
          onClick={() => setShowList(v => !v)}
          className={cn(
            "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold shadow-md transition-all",
            showList ? "bg-blue-500 text-white" : "bg-card/95 backdrop-blur-sm border border-border/60 text-foreground hover:bg-muted"
          )}
        >
          <List className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">List</span>
        </button>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-card/95 backdrop-blur-sm border border-border/60 shadow-md hover:bg-muted transition-all"
          title="Refresh data"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* ── FILTER PANEL ────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="absolute top-16 left-3 z-10 bg-card/97 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl p-3 w-72 animate-fade-in">
          <p className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide">Filter Marker</p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Status Target</p>
              <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="achieved">✅ Achieved</SelectItem>
                  <SelectItem value="on_progress">🟡 On Progress</SelectItem>
                  <SelectItem value="not_started">🔴 Not Started</SelectItem>
                  <SelectItem value="today">🔵 Aktif Hari Ini</SelectItem>
                  <SelectItem value="problem">🟣 Problem</SelectItem>
                  <SelectItem value="no_target">⬜ No Target</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Kabupaten</p>
              <Select value={filterKab} onValueChange={setFilterKab}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kabupaten</SelectItem>
                  {kabOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(filterStatus !== "all" || filterKab !== "all") && (
              <button
                onClick={() => { setFilterStatus("all"); setFilterKab("all"); }}
                className="text-xs text-red-500 hover:text-red-600 underline underline-offset-2"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── LEGEND + STATS (bottom-left) ──────────────────────────────── */}
      <div className="absolute bottom-20 md:bottom-5 left-3 z-10 flex flex-col gap-2">
        {/* Legend — collapsible */}
        <LegendPanel summary={summary} enrichedCount={enriched.length} visibleCount={visibleMarkers.length} />
      </div>

      {/* ── MAP VIEW + LOCATION (bottom-right) ──────────────────────── */}
      <div className="absolute bottom-20 md:bottom-5 right-3 z-10 flex flex-col gap-1.5">
        {(["street", "satellite", "terrain"] as MapView[]).map(v => (
          <button key={v} onClick={() => changeMapView(v)}
            className={cn(
              "h-8 px-3 rounded-xl text-[10px] font-semibold shadow-md transition-all capitalize",
              mapView === v ? "bg-blue-500 text-white" : "bg-card/95 backdrop-blur-sm border border-border/60 hover:bg-muted"
            )}
          >
            {v === "street" ? "Street" : v === "satellite" ? "Satellite" : "Terrain"}
          </button>
        ))}
        <button onClick={getUserLocation}
          className="h-8 w-8 self-end flex items-center justify-center rounded-xl bg-card/95 backdrop-blur-sm border border-border/60 shadow-md hover:bg-muted transition-all">
          <Navigation className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── LIST PANEL (slide from left) ────────────────────────────── */}
      {showList && (
        <div className="absolute top-0 left-0 bottom-0 w-80 bg-card/97 backdrop-blur-xl border-r border-border/60 shadow-2xl z-20 flex flex-col animate-fade-in">
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Daftar Tower</p>
              <button onClick={() => setShowList(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full pl-8 pr-3 h-8 text-xs rounded-xl bg-muted/60 border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Cari tower…"
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{filteredList.length} tower</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredList.map(m => {
                const color = TARGET_COLORS[m.targetStatus];
                return (
                  <button key={m.id} onClick={() => flyTo(m)}
                    className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-2.5 group">
                    <div className="h-3 w-3 rounded-full shrink-0 border border-white/50 shadow-sm" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.id}</p>
                      {m.towerName && <p className="text-[10px] text-muted-foreground truncate">{m.towerName}</p>}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.target > 0 && (
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(m.progressPct, 100)}%`, backgroundColor: color }} />
                          </div>
                        )}
                        <span className="text-[9px] tabular-nums text-muted-foreground shrink-0">
                          {m.activationCount}/{m.target || "?"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── BTS DETAIL PANEL (right) ─────────────────────────────────── */}
      {sideOpen && selectedBTS && (
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[380px] bg-card/97 backdrop-blur-xl border-l border-border/60 shadow-2xl z-20 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}20` }}>
              <Radio className="h-4 w-4" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{selectedBTS.id}</p>
              <p className="text-[11px] text-muted-foreground truncate">{selectedBTS.towerName || "—"}</p>
            </div>
            <button onClick={() => setSideOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">

              {/* Target Progress */}
              <div className="rounded-2xl border p-3 space-y-2"
                style={{ borderColor: `${TARGET_COLORS[selectedBTS.targetStatus]}40`, backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}08` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }} />
                    <span className="text-xs font-semibold">Target Progress</span>
                  </div>
                  <Badge className="text-[10px] border-0"
                    style={{ backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}20`, color: TARGET_COLORS[selectedBTS.targetStatus] }}>
                    {TARGET_LABELS[selectedBTS.targetStatus]}
                  </Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-black" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }}>
                      {selectedBTS.target > 0 ? `${Math.min(selectedBTS.progressPct, 100).toFixed(0)}%` : `${selectedBTS.activationCount}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedBTS.activationCount} aktivasi / {selectedBTS.target > 0 ? `${selectedBTS.target} target` : "no target"}
                    </p>
                  </div>
                  {selectedBTS.target > 0 && selectedBTS.gap > 0 && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-500">-{formatNumber(selectedBTS.gap)}</p>
                      <p className="text-[10px] text-muted-foreground">kurang</p>
                    </div>
                  )}
                </div>
                {selectedBTS.target > 0 && (
                  <Progress value={Math.min(selectedBTS.progressPct, 100)} className="h-2" />
                )}
                {selectedBTS.qtySP > 0 && (
                  <p className="text-[10px] text-muted-foreground">Qty SP: {selectedBTS.qtySP} × {TARGET_MULTIPLIER} = {selectedBTS.target}</p>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Kabupaten", value: selectedBTS.kabupaten || "—" },
                  { label: "Cluster",   value: selectedBTS.cluster   || "—" },
                  { label: "PM",        value: selectedBTS.pm        || "—" },
                  { label: "SPV",       value: selectedBTS.spv       || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-semibold mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Last activation */}
              {selectedBTS.lastActivation && (
                <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Aktivasi Terakhir</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{formatDateTime(selectedBTS.lastActivation)}</span>
                  </div>
                  {selectedBTS.lastPromotor && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{selectedBTS.lastPromotor}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Last photo */}
              {selectedBTS.lastPhotoURL && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />Foto Terakhir
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedBTS.lastPhotoURL} alt="Last activation"
                    className="w-full h-40 object-cover rounded-xl border border-border/60" />
                </div>
              )}

              {/* Navigate button */}
              <a href={getGoogleMapsNavigationURL(selectedBTS.latitude, selectedBTS.longitude)}
                target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2 h-9 text-xs">
                  <MapPin className="h-3.5 w-3.5" />
                  Navigasi ke Tower
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              </a>

              {/* Activation history */}
              <div>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Riwayat Aktivasi
                  {!historyLoading && btsHistory?.length ? (
                    <span className="text-[10px] text-muted-foreground font-normal">({btsHistory.length} total)</span>
                  ) : null}
                </p>
                {historyLoading ? (
                  <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                ) : !btsHistory?.length ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground gap-1">
                    <Activity className="h-6 w-6 opacity-20" />
                    <p className="text-xs">Belum ada riwayat aktivasi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {btsHistory.map(tx => (
                      <div key={tx.id} className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold" style={{ color: tx.brand === "XL" ? "#0066cc" : tx.brand === "Axis" ? "#ff6600" : "#cc0000" }}>
                            {tx.brand}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{tx.tanggal} {tx.jam}</span>
                        </div>
                        <p className="text-muted-foreground truncate">Promotor: <span className="text-foreground font-medium">{tx.promotor}</span></p>
                        <p className="text-muted-foreground">MDN: <span className="font-mono text-foreground">{tx.mdn}</span></p>
                        {tx.distanceFromBTS > 0 && (
                          <p className="text-muted-foreground">Jarak: {formatDistance(tx.distanceFromBTS)}</p>
                        )}
                        {tx.photoURL && (
                          <a href={tx.photoURL} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1 underline underline-offset-2">
                            <ImageIcon className="h-3 w-3" /> Lihat Foto
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
