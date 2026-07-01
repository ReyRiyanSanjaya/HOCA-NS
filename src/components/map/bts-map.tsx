"use client";

import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Navigation, X, Radio, MapPin, Calendar, Users, ExternalLink,
  Image as ImageIcon, Target, AlertTriangle,
  Activity, Layers, Filter, ChevronDown, ChevronUp, BarChart2,
  RefreshCw, List, TrendingUp, TrendingDown, Minus, Bell,
  Zap, Award, Clock,
} from "lucide-react";
import { Button }     from "@/components/ui/button";
import { Input }      from "@/components/ui/input";
import { Badge }      from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton }   from "@/components/ui/skeleton";
import { Progress }   from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchMapData, fetchBTSHistory } from "@/lib/api";
import { useMasterBTS } from "@/hooks/use-master-data";
import { CACHE_KEYS } from "@/lib/config";
import {
  formatDateTime, formatDistance, getGoogleMapsNavigationURL, cn, formatNumber,
} from "@/lib/utils";
import type { GlobalFilter } from "@/types";

// ─── constants ────────────────────────────────────────────────────────────────
const TARGET_MULTIPLIER = 3;
const POLL_INTERVAL     = 60_000; // 1 menit

// ─── target-aware marker status ──────────────────────────────────────────────
type TargetStatus =
  | "achieved"
  | "on_progress"
  | "not_started"
  | "no_target"
  | "problem"
  | "today";

interface EnrichedMarker {
  id:            string;
  towerName:     string;
  latitude:      number;
  longitude:     number;
  kabupaten:     string;
  cluster:       string;
  pm:            string;
  spv:           string;
  markerStatus:  string;
  targetStatus:  TargetStatus;
  activationCount: number;
  target:        number;
  qtySP:         number;
  progressPct:   number;
  gap:           number;
  lastActivation:  string | null;
  lastPromotor:    string | null;
  lastPhotoURL:    string | null;
}

function parseQtySP(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n <= 0 ? 0 : Math.round(n);
}

const TARGET_COLORS: Record<TargetStatus, string> = {
  achieved:    "#22c55e",
  on_progress: "#eab308",
  not_started: "#ef4444",
  no_target:   "#6b7280",
  today:       "#3b82f6",
  problem:     "#a855f7",
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
  if (pct >= 100) return "achieved";
  if (pct > 0)    return "on_progress";
  return "not_started";
}

type MapView = "street" | "satellite" | "terrain";
interface BTSMapProps { filter: Partial<GlobalFilter>; }

// ─── inject CSS once ──────────────────────────────────────────────────────────
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
    @keyframes notify-slide-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    @keyframes notify-slide-out {
      from { transform: translateX(0);   opacity: 1; }
      to   { transform: translateX(110%); opacity: 0; }
    }
    .bts-bounce   { animation: bts-bounce 1.4s ease-in-out infinite; }
    .bts-pulse    { animation: bts-pulse-ring 1.6s ease-out infinite; }
    .bts-selected { animation: bts-selected-pop 0.3s cubic-bezier(.36,.07,.19,.97) both; }
    .leaflet-tooltip-custom {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── marker SVG factory ───────────────────────────────────────────────────────
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

  const pulseRing = shouldPulse
    ? `<div class="bts-pulse" style="
        position:absolute;width:${size}px;height:${size}px;border-radius:50%;
        background:${color};top:0;left:0;pointer-events:none;z-index:0;"></div>`
    : "";

  const wrapClass = [
    shouldBounce ? "bts-bounce"   : "",
    isSelected   ? "bts-selected" : "",
  ].filter(Boolean).join(" ");

  return `<div style="position:relative;width:${size}px;height:${size}px;">
    ${pulseRing}
    <div class="${wrapClass}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background-color:${color};border:${border};${shadow};
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;position:relative;overflow:hidden;z-index:1;
      transition:transform 0.15s;">
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

// ─── cluster marker ───────────────────────────────────────────────────────────
function makeClusterHtml(count: number, dominantColor: string): string {
  const size = count > 50 ? 48 : count > 20 ? 40 : 32;
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${dominantColor};border:3px solid white;
    box-shadow:0 2px 10px ${dominantColor}88,0 0 0 4px ${dominantColor}30;
    display:flex;align-items:center;justify-content:center;
    color:white;font-weight:800;font-size:${count>99?10:12}px;
    font-family:inherit;cursor:pointer;">
    ${count > 99 ? "99+" : count}
  </div>`;
}

// ─── tooltip HTML ─────────────────────────────────────────────────────────────
function makeTooltipHtml(bts: EnrichedMarker): string {
  const color   = TARGET_COLORS[bts.targetStatus];
  const pctStr  = bts.target > 0
    ? `${Math.min(bts.progressPct, 100).toFixed(0)}%` : "—";
  const gapStr  = bts.gap > 0
    ? `Kurang: <b style="color:#ef4444">${bts.gap}</b> aktivasi`
    : bts.target > 0 ? `<span style="color:#22c55e">✓ Target tercapai</span>` : "";

  const actionMap: Record<TargetStatus, string> = {
    not_started: "🚨 Segera kirim promotor ke tower ini",
    on_progress: "⚡ Tingkatkan frekuensi kunjungan",
    achieved:    "✅ Pertahankan — target sudah tercapai",
    today:       "🔵 Tower aktif hari ini",
    problem:     "⚠️ Cek kondisi tower — ada masalah",
    no_target:   "📋 Set target di master BTS",
  };

  return `<div style="
    font-family:inherit;min-width:200px;max-width:260px;padding:2px 0;
    background:var(--card,#fff);border:1px solid rgba(0,0,0,0.1);
    border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:10px 12px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <b style="font-size:12px">${bts.id}</b>
    </div>
    ${bts.towerName ? `<p style="font-size:11px;color:#888;margin:0 0 6px">${bts.towerName}</p>` : ""}
    <div style="background:${color}18;border-radius:8px;padding:6px 8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:${color};font-weight:700">${TARGET_LABELS[bts.targetStatus]}</span>
        <span style="font-size:14px;font-weight:800;color:${color}">${pctStr}</span>
      </div>
      <div style="font-size:10px;color:#888;margin-top:2px">
        ${bts.activationCount} aktivasi / ${bts.target > 0 ? `${bts.target} target` : "no target"}
      </div>
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
      ${bts.pm  ? `<span>🏢 PM: ${bts.pm}</span>`  : ""}
    </div>
    ${bts.lastActivation ? `<div style="font-size:10px;color:#888;margin-bottom:6px">🕒 Terakhir: ${bts.lastActivation}</div>` : ""}
    <div style="font-size:10px;background:#f1f5f9;border-radius:6px;padding:5px 7px;color:#475569;font-style:italic">
      ${actionMap[bts.targetStatus]}
    </div>
    <div style="font-size:9px;color:#aaa;margin-top:4px;text-align:center">Klik untuk detail lengkap</div>
  </div>`;
}

// ─── Legend panel ─────────────────────────────────────────────────────────────
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
  const [expanded, setExpanded] = React.useState(false);
  const overallPct = enrichedCount > 0
    ? Math.round((summary.achieved / enrichedCount) * 100) : 0;
  const critical = summary.not_started + summary.problem;

  return (
    <div className="bg-card/97 backdrop-blur-md rounded-2xl border border-border/60 shadow-lg overflow-hidden w-[210px]">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
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
          : <ChevronUp   className="h-3 w-3 text-muted-foreground shrink-0" />}
      </button>

      {!expanded && (
        <div className="px-3 pb-2 border-t border-border/30">
          <div className="pt-2 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground">Achieved</span>
              <span className="text-[10px] font-bold text-green-600">{overallPct}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width:`${overallPct}%`, background: overallPct>=70?"#22c55e":overallPct>=40?"#eab308":"#ef4444" }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">{visibleCount}/{enrichedCount} tower</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["achieved","on_progress","not_started","today","problem","no_target"] as TargetStatus[]).map(s => (
              <div key={s} title={`${TARGET_LABELS[s]}: ${summary[s]}`} className="flex items-center gap-1">
                <div className={cn("h-2.5 w-2.5 rounded-full border border-white/40", s==="not_started"?"bts-bounce":"")}
                  style={{ backgroundColor: TARGET_COLORS[s] }} />
                <span className="text-[9px] font-bold tabular-nums">{summary[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-border/30">
          <div className="overflow-y-auto px-3 pb-3 space-y-2" style={{ maxHeight: "40vh" }}>
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Overall Achieved</span>
                <span className="text-[10px] font-bold text-green-600">{overallPct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width:`${overallPct}%`, background:overallPct>=70?"#22c55e":overallPct>=40?"#eab308":"#ef4444" }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">{visibleCount}/{enrichedCount} tower</p>
            </div>
            <div className="space-y-1">
              {(["achieved","on_progress","not_started","today","problem","no_target"] as TargetStatus[]).map(s => {
                const cnt = summary[s];
                const pct = enrichedCount > 0 ? Math.round((cnt / enrichedCount) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full shrink-0 border-2 border-white/50", s==="not_started"?"bts-bounce":"")}
                      style={{ backgroundColor: TARGET_COLORS[s], boxShadow:`0 0 0 1px ${TARGET_COLORS[s]}40` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium truncate">{LEGEND_ICONS[s]} {TARGET_LABELS[s]}</span>
                        <span className="text-[10px] font-bold tabular-nums ml-1 shrink-0">{cnt}</span>
                      </div>
                      <div className="h-0.5 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background:TARGET_COLORS[s] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1 pt-1 border-t border-border/30">
              {(["not_started","on_progress","problem"] as TargetStatus[])
                .filter(s => summary[s] > 0).map(s => (
                  <p key={s} className="text-[9px] text-muted-foreground leading-snug">
                    <span className="font-semibold" style={{color:TARGET_COLORS[s]}}>{LEGEND_ICONS[s]}</span>{" "}
                    {LEGEND_ACTIONS[s]}
                  </p>
              ))}
            </div>
            <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-2 py-1.5 text-[9px] text-red-600 dark:text-red-400">
              🔴 Marker merah <b>memantul</b> = prioritas utama
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini Analytics Panel ────────────────────────────────────────────────────
function MiniAnalyticsPanel({
  summary, enrichedCount, todayCount,
}: {
  summary: Record<TargetStatus, number>;
  enrichedCount: number;
  todayCount: number;
}) {
  const achieved   = summary.achieved;
  const critical   = summary.not_started + summary.problem;
  const overallPct = enrichedCount > 0
    ? Math.round((achieved / enrichedCount) * 100) : 0;

  const stats = [
    {
      icon: Award,
      label: "Achieved",
      value: achieved,
      sub: `${overallPct}%`,
      color: "#22c55e",
    },
    {
      icon: Zap,
      label: "Hari Ini",
      value: todayCount,
      sub: "aktif",
      color: "#3b82f6",
    },
    {
      icon: AlertTriangle,
      label: "Kritis",
      value: critical,
      sub: "perlu aksi",
      color: "#ef4444",
    },
    {
      icon: Clock,
      label: "On Progress",
      value: summary.on_progress,
      sub: "berjalan",
      color: "#eab308",
    },
  ];

  return (
    <div className="bg-card/97 backdrop-blur-md rounded-2xl border border-border/60 shadow-lg p-3 w-[210px]">
      <div className="flex items-center gap-1.5 mb-2.5">
        <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Quick Stats</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-2" style={{ background: `${color}10` }}>
            <div className="flex items-center gap-1 mb-0.5">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
            <p className="text-base font-black leading-none" style={{ color }}>
              {value}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
      {/* Overall bar */}
      <div className="mt-2.5 pt-2 border-t border-border/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Overall Progress</span>
          <span className="text-[10px] font-bold" style={{ color: overallPct >= 70 ? "#22c55e" : overallPct >= 40 ? "#eab308" : "#ef4444" }}>
            {overallPct}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: overallPct >= 70 ? "#22c55e" : overallPct >= 40 ? "#eab308" : "#ef4444",
            }} />
        </div>
        <p className="text-[9px] text-muted-foreground mt-1 tabular-nums">
          {achieved}/{enrichedCount} tower
        </p>
      </div>
    </div>
  );
}

// ─── Notification Bell Component ──────────────────────────────────────────────
interface ActivityNotif {
  id:        string;
  btsId:     string;
  towerName: string;
  promotor:  string;
  brand:     string;
  time:      string;
}

function NotificationBell({
  notifications,
  onClear,
}: {
  notifications: ActivityNotif[];
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "relative flex items-center justify-center h-9 w-9 rounded-xl shadow-md transition-all",
          count > 0
            ? "bg-blue-500 text-white"
            : "bg-card/95 backdrop-blur-sm border border-border/60 hover:bg-muted"
        )}
        title="Notifikasi aktivasi baru"
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 text-[9px] font-black
            bg-red-500 text-white rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-72 bg-card/97 backdrop-blur-xl
          rounded-2xl border border-border/60 shadow-2xl z-30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-bold">Aktivasi Baru</span>
              {count > 0 && (
                <span className="text-[9px] bg-blue-500/15 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={onClear}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Hapus
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          {count === 0 ? (
            <div className="py-6 flex flex-col items-center text-muted-foreground gap-1">
              <Bell className="h-6 w-6 opacity-20" />
              <p className="text-xs">Belum ada aktivasi baru</p>
            </div>
          ) : (
            <ScrollArea className="max-h-60">
              <div className="p-2 space-y-1">
                {notifications.map(n => (
                  <div key={n.id}
                    className="rounded-xl px-3 py-2.5 bg-muted/40 border border-border/40">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-blue-600">{n.btsId}</span>
                      <span className="text-[9px] text-muted-foreground">{n.time}</span>
                    </div>
                    {n.towerName && (
                      <p className="text-[10px] text-muted-foreground truncate">{n.towerName}</p>
                    )}
                    <p className="text-[10px] mt-0.5">
                      <span className="text-muted-foreground">Promotor: </span>
                      <span className="font-medium">{n.promotor}</span>
                      {" · "}
                      <span className="font-semibold" style={{
                        color: n.brand === "XL" ? "#0066cc"
                          : n.brand === "Axis" ? "#a855f7" : "#ef4444",
                      }}>{n.brand}</span>
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick Filter Chips ───────────────────────────────────────────────────────
function QuickFilterChips({
  filterStatus,
  setFilterStatus,
  summary,
}: {
  filterStatus: "all" | TargetStatus;
  setFilterStatus: (s: "all" | TargetStatus) => void;
  summary: Record<TargetStatus, number>;
}) {
  const chips: Array<{ key: "all" | TargetStatus; label: string; color: string }> = [
    { key: "all",        label: `Semua`,             color: "#6b7280" },
    { key: "not_started",label: `🔴 ${summary.not_started}`, color: "#ef4444" },
    { key: "on_progress",label: `🟡 ${summary.on_progress}`, color: "#eab308" },
    { key: "achieved",   label: `✅ ${summary.achieved}`,    color: "#22c55e" },
    { key: "today",      label: `🔵 ${summary.today}`,       color: "#3b82f6" },
    { key: "problem",    label: `🟣 ${summary.problem}`,     color: "#a855f7" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {chips.map(({ key, label, color }) => {
        const active = filterStatus === key;
        return (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={cn(
              "shrink-0 h-7 px-2.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all",
              active
                ? "text-white shadow-md"
                : "bg-card/90 border border-border/60 text-foreground hover:bg-muted/60"
            )}
            style={active ? { backgroundColor: color, boxShadow: `0 2px 8px ${color}55` } : {}}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── simple geo-cluster (no plugin needed) ────────────────────────────────────
interface GeoCluster {
  lat:    number;
  lng:    number;
  count:  number;
  markers: EnrichedMarker[];
  dominantStatus: TargetStatus;
}

/** Very fast pixel-space clustering. `zoom` needed to estimate px/deg. */
function buildClusters(markers: EnrichedMarker[], zoom: number): GeoCluster[] {
  // Rough degrees per pixel at given zoom (equator approx)
  const degsPerPx = 360 / (256 * Math.pow(2, zoom));
  const radiusDeg  = degsPerPx * 36; // 36px cluster radius

  const used = new Set<number>();
  const clusters: GeoCluster[] = [];

  for (let i = 0; i < markers.length; i++) {
    if (used.has(i)) continue;
    const base   = markers[i];
    const group: EnrichedMarker[] = [base];
    used.add(i);

    for (let j = i + 1; j < markers.length; j++) {
      if (used.has(j)) continue;
      const dx = Math.abs(base.longitude - markers[j].longitude);
      const dy = Math.abs(base.latitude  - markers[j].latitude);
      if (dx < radiusDeg && dy < radiusDeg) {
        group.push(markers[j]);
        used.add(j);
      }
    }

    // centroid
    const lat = group.reduce((s, m) => s + m.latitude,  0) / group.length;
    const lng = group.reduce((s, m) => s + m.longitude, 0) / group.length;

    // dominant status (priority: not_started > problem > on_progress > today > no_target > achieved)
    const priority: TargetStatus[] = ["not_started","problem","on_progress","today","no_target","achieved"];
    let dominantStatus: TargetStatus = "achieved";
    for (const p of priority) {
      if (group.some(m => m.targetStatus === p)) { dominantStatus = p; break; }
    }

    clusters.push({ lat, lng, count: group.length, markers: group, dominantStatus });
  }
  return clusters;
}

// ─── main component ───────────────────────────────────────────────────────────
export function BTSMap({ filter }: BTSMapProps) {
  const queryClient     = useQueryClient();
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<unknown>(null);
  const markersLayerRef = useRef<unknown[]>([]);
  const prevCountRef    = useRef<number | null>(null);
  const prevTodayRef    = useRef<Set<string>>(new Set());
  const [L, setL]       = useState<typeof import("leaflet") | null>(null);
  const [currentZoom,   setCurrentZoom]   = useState(5);

  // UI state
  const [mapView,       setMapView]       = useState<MapView>("street");
  const [selectedBTS,   setSelectedBTS]   = useState<EnrichedMarker | null>(null);
  const [sideOpen,      setSideOpen]      = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [userMarker,    setUserMarker]    = useState<unknown>(null);
  const [showList,      setShowList]      = useState(false);
  const [filterStatus,  setFilterStatus]  = useState<"all" | TargetStatus>("all");
  const [filterKab,     setFilterKab]     = useState("all");
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [listSearch,    setListSearch]    = useState("");
  const [clusterMode,   setClusterMode]   = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [notifications, setNotifications] = useState<ActivityNotif[]>([]);

  // Data
  const { data: mapData, isLoading, refetch } = useQuery({
    queryKey: [CACHE_KEYS.masterBTS, "map", filter],
    queryFn: () => fetchMapData(filter),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
  });
  const { data: btsData } = useMasterBTS();
  const { data: btsHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["bts-history", selectedBTS?.id],
    queryFn: () => fetchBTSHistory(selectedBTS!.id),
    enabled: !!selectedBTS && sideOpen,
  });

  // Build enriched markers
  const enriched = useMemo<EnrichedMarker[]>(() => {
    if (!mapData?.markers) return [];
    const btsMap: Record<string, { qtySPSeedingByBrands: string }> = {};
    if (btsData) for (const b of btsData) btsMap[b.id] = b;

    return mapData.markers.map((m) => {
      const master = btsMap[m.id];
      const qtySP  = master ? parseQtySP(master.qtySPSeedingByBrands) : 0;
      const target = qtySP * TARGET_MULTIPLIER;
      const pct    = target > 0 ? (m.activationCount / target) * 100 : 0;
      const ts     = getTargetStatus(m.activationCount, target, m.markerStatus);
      return {
        ...m, qtySP, target,
        targetStatus: ts,
        progressPct: pct,
        gap: Math.max(0, target - m.activationCount),
      };
    });
  }, [mapData, btsData]);

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<TargetStatus, number> = {
      achieved: 0, on_progress: 0, not_started: 0,
      no_target: 0, today: 0, problem: 0,
    };
    for (const m of enriched) counts[m.targetStatus]++;
    return counts;
  }, [enriched]);

  // ── Notification: detect new "today" activations on poll ─────────────────
  useEffect(() => {
    if (!enriched.length) return;
    const todayMarkers = enriched.filter(m => m.markerStatus === "today" || m.targetStatus === "today");
    const newTodayIds  = new Set(todayMarkers.map(m => m.id));

    if (prevTodayRef.current.size === 0) {
      // first load — set baseline silently
      prevTodayRef.current = newTodayIds;
      return;
    }

    const newlyActive = todayMarkers.filter(m => !prevTodayRef.current.has(m.id));
    if (newlyActive.length > 0) {
      const notifs: ActivityNotif[] = newlyActive.map(m => ({
        id:        `${m.id}-${Date.now()}`,
        btsId:     m.id,
        towerName: m.towerName,
        promotor:  m.lastPromotor ?? "—",
        brand:     "—",
        time:      m.lastActivation
          ? new Date(m.lastActivation).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "baru",
      }));

      setNotifications(prev => [...notifs, ...prev].slice(0, 20));

      newlyActive.forEach(m => {
        toast.success(`✅ Aktivasi Baru: ${m.id}`, {
          description: `${m.towerName || m.id} — Promotor: ${m.lastPromotor ?? "—"}`,
          duration: 5000,
          position: "top-right",
        });
      });
    }
    prevTodayRef.current = newTodayIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched]);

  // Also notify if total activation count grows
  useEffect(() => {
    const total = enriched.reduce((s, m) => s + m.activationCount, 0);
    if (prevCountRef.current !== null && total > prevCountRef.current) {
      const diff = total - prevCountRef.current;
      toast.info(`🔔 ${diff} aktivasi baru terdeteksi`, {
        description: "Data peta diperbarui otomatis",
        duration: 3000,
        position: "top-right",
      });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.dashboard] });
    }
    prevCountRef.current = total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched]);

  // Filter + search
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

  const kabOptions = useMemo(
    () => [...new Set(enriched.map(m => m.kabupaten).filter(Boolean))].sort(),
    [enriched]
  );

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
    const lf  = L as typeof import("leaflet");
    const map = lf.map(mapRef.current, {
      center: [-2.5489, 118.0149], zoom: 5, zoomControl: false,
    });
    lf.control.zoom({ position: "bottomright" }).addTo(map);
    lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);

    // track zoom for cluster
    map.on("zoomend", () => setCurrentZoom(map.getZoom()));

    (mapInstanceRef as React.MutableRefObject<unknown>).current = map;
    return () => {
      map.remove();
      (mapInstanceRef as React.MutableRefObject<unknown>).current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Render markers / clusters
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    const lf  = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;

    markersLayerRef.current.forEach(m => (m as import("leaflet").Marker).remove());
    markersLayerRef.current = [];

    if (!visibleMarkers.length) return;

    const latLngs: [number, number][] = [];

    if (clusterMode && currentZoom < 12) {
      const clusters = buildClusters(visibleMarkers, currentZoom);

      clusters.forEach((cl) => {
        const color = TARGET_COLORS[cl.dominantStatus];
        const isSingle = cl.count === 1;

        const icon = lf.divIcon({
          html: isSingle
            ? makeMarkerHtml(
                color,
                cl.markers[0].markerStatus === "today",
                cl.markers[0].progressPct,
                cl.markers[0].targetStatus,
                selectedBTS?.id === cl.markers[0].id,
              )
            : makeClusterHtml(cl.count, color),
          className: "",
          iconSize:   isSingle ? [28, 28] : [48, 48],
          iconAnchor: isSingle ? [14, 14] : [24, 24],
        });

        const marker = lf.marker([cl.lat, cl.lng], { icon });

        if (isSingle) {
          marker.bindTooltip(makeTooltipHtml(cl.markers[0]), {
            direction: "top", offset: [0, -16],
            className: "leaflet-tooltip-custom", sticky: false,
          });
          marker.on("click", () => {
            setSelectedBTS(cl.markers[0]); setSideOpen(true);
          });
        } else {
          marker.on("click", () => {
            map.flyTo([cl.lat, cl.lng], Math.min(currentZoom + 3, 14), { duration: 0.8 });
          });
        }

        marker.addTo(map);
        markersLayerRef.current.push(marker);
        latLngs.push([cl.lat, cl.lng]);
      });
    } else {
      // Individual markers
      visibleMarkers.forEach((bts) => {
        const color     = TARGET_COLORS[bts.targetStatus];
        const isToday   = bts.markerStatus === "today";
        const isSelected = selectedBTS?.id === bts.id;
        const sz = bts.targetStatus === "not_started" ? 28 : isSelected ? 34 : 26;

        const icon = lf.divIcon({
          html: makeMarkerHtml(color, isToday, bts.progressPct, bts.targetStatus, isSelected),
          className: "", iconSize: [sz, sz], iconAnchor: [sz/2, sz/2], popupAnchor: [0, -14],
        });

        const marker = lf.marker([bts.latitude, bts.longitude], { icon });
        marker.bindTooltip(makeTooltipHtml(bts), {
          direction: "top", offset: [0, -16],
          className: "leaflet-tooltip-custom", sticky: false,
        });
        marker.on("click", () => { setSelectedBTS(bts); setSideOpen(true); });
        marker.addTo(map);
        markersLayerRef.current.push(marker);
        if (bts.latitude && bts.longitude) latLngs.push([bts.latitude, bts.longitude]);
      });
    }

    if (latLngs.length > 0) {
      try {
        const bounds = lf.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true, duration: 1 });
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMarkers, L, clusterMode, currentZoom]);

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

  // Fly to from list
  const flyTo = useCallback((m: EnrichedMarker) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current as import("leaflet").Map;
    map.flyTo([m.latitude, m.longitude], 16, { duration: 1 });
    setSelectedBTS(m); setSideOpen(true); setShowList(false);
  }, []);

  const todayCount = summary.today;

  // ── RENDER ────────────────────────────────────────────────────────────────
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

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
        {/* Row 1: search + actions */}
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex gap-1.5 flex-1 min-w-0">
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
            <Button size="sm" onClick={() => handleSearch()}
              className="h-9 shadow-md shrink-0 text-xs px-3">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Filter */}
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold shadow-md transition-all shrink-0",
              filterOpen || filterStatus !== "all" || filterKab !== "all"
                ? "bg-blue-500 text-white"
                : "bg-card/95 backdrop-blur-sm border border-border/60 text-foreground hover:bg-muted"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {(filterStatus !== "all" || filterKab !== "all") && (
              <span className="bg-white/25 rounded-full px-1.5 text-[10px]">
                {[filterStatus !== "all", filterKab !== "all"].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* List */}
          <button
            onClick={() => setShowList(v => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold shadow-md transition-all shrink-0",
              showList
                ? "bg-blue-500 text-white"
                : "bg-card/95 backdrop-blur-sm border border-border/60 text-foreground hover:bg-muted"
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>

          {/* Analytics toggle */}
          <button
            onClick={() => setShowAnalytics(v => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold shadow-md transition-all shrink-0",
              showAnalytics
                ? "bg-purple-500 text-white"
                : "bg-card/95 backdrop-blur-sm border border-border/60 text-foreground hover:bg-muted"
            )}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          {/* Cluster toggle */}
          <button
            onClick={() => setClusterMode(v => !v)}
            title="Cluster mode"
            className={cn(
              "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-semibold shadow-md transition-all shrink-0",
              clusterMode
                ? "bg-orange-500 text-white"
                : "bg-card/95 backdrop-blur-sm border border-border/60 hover:bg-muted"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
          </button>

          {/* Notification bell */}
          <NotificationBell
            notifications={notifications}
            onClear={() => setNotifications([])}
          />

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-card/95 backdrop-blur-sm border border-border/60 shadow-md hover:bg-muted transition-all shrink-0"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
        </div>

        {/* Row 2: Quick filter chips */}
        <div className="px-0.5">
          <QuickFilterChips
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            summary={summary}
          />
        </div>
      </div>

      {/* ── FILTER PANEL ──────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="absolute top-28 left-3 z-10 bg-card/97 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Filter Marker</p>
            <button onClick={() => setFilterOpen(false)}
              className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Kabupaten</p>
              <Select value={filterKab} onValueChange={setFilterKab}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kabupaten</SelectItem>
                  {kabOptions.map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(filterStatus !== "all" || filterKab !== "all") && (
              <button
                onClick={() => { setFilterStatus("all"); setFilterKab("all"); }}
                className="text-xs text-red-500 hover:text-red-600 underline underline-offset-2"
              >
                Reset semua filter
              </button>
            )}
          </div>
          {/* Active filter summary */}
          {visibleMarkers.length !== enriched.length && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground">
                Menampilkan <span className="font-bold text-foreground">{visibleMarkers.length}</span> dari{" "}
                <span className="font-bold">{enriched.length}</span> tower
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── LEGEND (bottom-left) ──────────────────────────────────────── */}
      <div className="absolute bottom-20 md:bottom-4 left-3 z-10"
        style={{ maxHeight: "calc(100% - 200px)" }}>
        <LegendPanel
          summary={summary}
          enrichedCount={enriched.length}
          visibleCount={visibleMarkers.length}
        />
      </div>

      {/* ── ANALYTICS PANEL (above legend) ───────────────────────────── */}
      {showAnalytics && (
        <div className="absolute bottom-20 md:bottom-4 z-10"
          style={{ left: "230px" }}>
          <MiniAnalyticsPanel
            summary={summary}
            enrichedCount={enriched.length}
            todayCount={todayCount}
          />
        </div>
      )}

      {/* ── MAP VIEW + LOCATION (bottom-right) ───────────────────────── */}
      <div className="absolute bottom-20 md:bottom-5 right-3 z-10 flex flex-col gap-1.5">
        {(["street", "satellite", "terrain"] as MapView[]).map(v => (
          <button key={v} onClick={() => changeMapView(v)}
            className={cn(
              "h-8 px-3 rounded-xl text-[10px] font-semibold shadow-md transition-all capitalize",
              mapView === v
                ? "bg-blue-500 text-white"
                : "bg-card/95 backdrop-blur-sm border border-border/60 hover:bg-muted"
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

      {/* ── LIST PANEL (slide from left) ─────────────────────────────── */}
      {showList && (
        <div className="absolute top-0 left-0 bottom-0 w-80 bg-card/97 backdrop-blur-xl border-r border-border/60 shadow-2xl z-20 flex flex-col">
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Daftar Tower</p>
              <button onClick={() => setShowList(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
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
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">{filteredList.length} tower</p>
              {filterStatus !== "all" && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: TARGET_COLORS[filterStatus] }}>
                  {TARGET_LABELS[filterStatus]}
                </span>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredList.map(m => {
                const color     = TARGET_COLORS[m.targetStatus];
                const isActive  = selectedBTS?.id === m.id;
                return (
                  <button key={m.id} onClick={() => flyTo(m)}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-2.5 transition-colors flex items-center gap-2.5",
                      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"
                    )}
                  >
                    <div className="h-3 w-3 rounded-full shrink-0 border border-white/50 shadow-sm"
                      style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold truncate">{m.id}</p>
                        {m.targetStatus === "today" && (
                          <span className="text-[8px] bg-blue-500/15 text-blue-600 font-bold px-1 py-0.5 rounded shrink-0">
                            HARI INI
                          </span>
                        )}
                      </div>
                      {m.towerName && (
                        <p className="text-[10px] text-muted-foreground truncate">{m.towerName}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.target > 0 && (
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(m.progressPct, 100)}%`, backgroundColor: color }} />
                          </div>
                        )}
                        <span className="text-[9px] tabular-nums text-muted-foreground shrink-0">
                          {m.activationCount}/{m.target || "?"}
                        </span>
                        {m.kabupaten && (
                          <span className="text-[9px] text-muted-foreground truncate">
                            📍 {m.kabupaten}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredList.length === 0 && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-1">
                  <Search className="h-6 w-6 opacity-20" />
                  <p className="text-xs">Tidak ada tower ditemukan</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── BTS DETAIL PANEL (right) ─────────────────────────────────── */}
      {sideOpen && selectedBTS && (
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-[380px] bg-card/97 backdrop-blur-xl border-l border-border/60 shadow-2xl z-20 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}20` }}>
              <Radio className="h-4 w-4" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{selectedBTS.id}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedBTS.towerName || "—"}
              </p>
            </div>
            <Badge className="text-[10px] border-0 shrink-0"
              style={{
                backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}20`,
                color: TARGET_COLORS[selectedBTS.targetStatus],
              }}>
              {TARGET_LABELS[selectedBTS.targetStatus]}
            </Badge>
            <button onClick={() => setSideOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">

              {/* Target Progress Card */}
              <div className="rounded-2xl border p-3 space-y-2"
                style={{
                  borderColor: `${TARGET_COLORS[selectedBTS.targetStatus]}40`,
                  backgroundColor: `${TARGET_COLORS[selectedBTS.targetStatus]}08`,
                }}>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }} />
                  <span className="text-xs font-semibold">Target Progress</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black" style={{ color: TARGET_COLORS[selectedBTS.targetStatus] }}>
                      {selectedBTS.target > 0
                        ? `${Math.min(selectedBTS.progressPct, 100).toFixed(0)}%`
                        : `${selectedBTS.activationCount}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedBTS.activationCount} aktivasi
                      {selectedBTS.target > 0 ? ` / ${selectedBTS.target} target` : " (no target)"}
                    </p>
                  </div>
                  {selectedBTS.target > 0 && selectedBTS.gap > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-500">
                        <TrendingDown className="h-3.5 w-3.5 inline mr-0.5" />
                        {formatNumber(selectedBTS.gap)} kurang
                      </p>
                    </div>
                  )}
                  {selectedBTS.target > 0 && selectedBTS.gap === 0 && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">
                        <TrendingUp className="h-3.5 w-3.5 inline mr-0.5" />
                        Target tercapai
                      </p>
                    </div>
                  )}
                </div>
                {selectedBTS.target > 0 && (
                  <Progress value={Math.min(selectedBTS.progressPct, 100)} className="h-2.5" />
                )}
                {selectedBTS.qtySP > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Qty SP: {selectedBTS.qtySP} × {TARGET_MULTIPLIER} = {selectedBTS.target}
                  </p>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Kabupaten", value: selectedBTS.kabupaten || "—", icon: "📍" },
                  { label: "Cluster",   value: selectedBTS.cluster   || "—", icon: "📡" },
                  { label: "PM",        value: selectedBTS.pm        || "—", icon: "🏢" },
                  { label: "SPV",       value: selectedBTS.spv       || "—", icon: "👤" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="rounded-xl bg-muted/40 p-2.5">
                    <p className="text-[10px] text-muted-foreground">{icon} {label}</p>
                    <p className="text-xs font-semibold mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Last activation */}
              {selectedBTS.lastActivation && (
                <div className="rounded-xl bg-muted/30 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Aktivasi Terakhir
                  </p>
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
                    <ImageIcon className="h-3 w-3" /> Foto Terakhir
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedBTS.lastPhotoURL}
                    alt="Last activation"
                    className="w-full h-44 object-cover rounded-xl border border-border/60 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(selectedBTS.lastPhotoURL!, "_blank")}
                  />
                </div>
              )}

              {/* Navigate button */}
              <a
                href={getGoogleMapsNavigationURL(selectedBTS.latitude, selectedBTS.longitude)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2 h-10 text-xs">
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
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({btsHistory.length} total)
                    </span>
                  ) : null}
                </p>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : !btsHistory?.length ? (
                  <div className="flex flex-col items-center py-6 text-muted-foreground gap-1">
                    <Activity className="h-6 w-6 opacity-20" />
                    <p className="text-xs">Belum ada riwayat aktivasi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {btsHistory.map(tx => (
                      <div key={tx.id}
                        className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold px-2 py-0.5 rounded-md text-white text-[10px]"
                            style={{
                              backgroundColor:
                                tx.brand === "XL"        ? "#0066cc"
                                : tx.brand === "Axis"    ? "#a855f7"
                                : "#ef4444",
                            }}>
                            {tx.brand}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {tx.tanggal} {tx.jam}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate">
                          Promotor:{" "}
                          <span className="text-foreground font-medium">{tx.promotor}</span>
                        </p>
                        <p className="text-muted-foreground">
                          MDN: <span className="font-mono text-foreground">{tx.mdn}</span>
                        </p>
                        {tx.distanceFromBTS > 0 && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Minus className="h-2.5 w-2.5" />
                            Jarak: {formatDistance(tx.distanceFromBTS)}
                          </p>
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
