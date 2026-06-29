"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, AlertTriangle, XCircle, Target, TrendingUp, TrendingDown,
  Search, ChevronDown, ChevronUp, MapPin, User, Users, Filter as FilterIcon,
  RefreshCw, BarChart2, Clock, Zap, Award, Activity, Radio,
  SlidersHorizontal, X, Download, Eye, EyeOff,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS } from "@/hooks/use-master-data";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS } from "@/lib/config";
import { formatNumber, cn } from "@/lib/utils";
import type { MasterBTS, Transaction } from "@/types";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const TARGET_MULTIPLIER = 3;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type TowerStatus = "achieved" | "on_progress" | "need_attention" | "not_started";

interface TowerItem {
  id: string;
  towerName: string;
  kabupaten: string;
  cluster: string;
  spm: string;
  spv: string;
  qtySP: number;
  target: number;
  actual: number;
  percent: number;
  status: TowerStatus;
  gap: number;              // target - actual
  lastActivation: string | null;
  daysSinceLast: number | null;
  activationDates: string[];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function parseQtySP(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n <= 0 ? 0 : Math.round(n);
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function getTowerStatus(percent: number, actual: number, daysSinceLast: number | null): TowerStatus {
  if (actual === 0) return "not_started";
  if (percent >= 100) return "achieved";
  // on_progress = ada aktivasi dalam 7 hari terakhir
  if (daysSinceLast !== null && daysSinceLast <= 7) return "on_progress";
  return "need_attention";
}

function getStatusCfg(s: TowerStatus) {
  const map = {
    achieved:      { label: "Achieved",       emoji: "✅", color: "#22c55e", border: "border-l-green-400",  badge: "bg-green-500/15 text-green-600 border-green-500/30",  icon: CheckCircle2, bar: "bg-green-500"  },
    on_progress:   { label: "On Progress",    emoji: "🔄", color: "#3b82f6", border: "border-l-blue-400",   badge: "bg-blue-500/15 text-blue-600 border-blue-500/30",     icon: Activity,     bar: "bg-blue-500"   },
    need_attention:{ label: "Need Attention", emoji: "⚠️", color: "#f59e0b", border: "border-l-amber-400",  badge: "bg-amber-500/15 text-amber-600 border-amber-500/30",  icon: AlertTriangle,bar: "bg-amber-500"  },
    not_started:   { label: "Not Started",    emoji: "❌", color: "#ef4444", border: "border-l-red-400",    badge: "bg-red-500/15 text-red-600 border-red-500/30",        icon: XCircle,      bar: "bg-red-400"    },
  };
  return map[s];
}

function buildTowerList(btsData: MasterBTS[], transactions: Transaction[]): TowerItem[] {
  // Group transactions per tower
  const txMap: Record<string, { dates: string[] }> = {};
  for (const tx of transactions) {
    const id = tx.idBTS;
    if (!txMap[id]) txMap[id] = { dates: [] };
    const d = tx.tanggal || tx.timestamp?.substring(0, 10) || "";
    if (d) txMap[id].dates.push(d);
  }

  return btsData
    .map((bts) => {
      const qtySP = parseQtySP(bts.qtySPSeedingByBrands);
      const target = qtySP * TARGET_MULTIPLIER;
      const txData = txMap[bts.id];
      const dates = txData?.dates ?? [];
      const actual = dates.length;
      const lastDate = dates.length ? dates.sort().at(-1)! : null;
      const daysLast = daysSince(lastDate);
      const percent = target > 0 ? (actual / target) * 100 : actual > 0 ? 100 : 0;
      const status = getTowerStatus(percent, actual, daysLast);
      return {
        id: bts.id,
        towerName: bts.towerName,
        kabupaten: bts.kabupaten,
        cluster: bts.cluster,
        spm: bts.spm,
        spv: bts.spv,
        qtySP,
        target,
        actual,
        percent,
        status,
        gap: target - actual,
        lastActivation: lastDate,
        daysSinceLast: daysLast,
        activationDates: [...new Set(dates)].sort(),
      } satisfies TowerItem;
    })
    .filter((t) => t.qtySP > 0 || t.actual > 0);
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, colorClass, onClick, active,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; colorClass: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 flex items-center gap-3 text-left w-full transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        active ? "ring-2 ring-offset-1 ring-current shadow-md scale-[1.02]" : "bg-card",
        colorClass
      )}
    >
      <div className={cn("h-11 w-11 shrink-0 rounded-xl flex items-center justify-center", colorClass.includes("green") ? "bg-green-500" : colorClass.includes("blue") ? "bg-blue-500" : colorClass.includes("amber") ? "bg-amber-500" : "bg-red-500")}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold leading-tight">{typeof value === "number" ? formatNumber(value) : value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </button>
  );
}

function TowerRow({ item, index }: { item: TowerItem; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = getStatusCfg(item.status);
  const Icon = cfg.icon;
  const clampedPct = Math.min(item.percent, 100);

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden transition-all duration-200 border-l-4", cfg.border)}>
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {/* Rank */}
        <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <Icon className={cn("h-4 w-4 shrink-0")} style={{ color: cfg.color }} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{item.id}</span>
            {item.towerName && (
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">— {item.towerName}</span>
            )}
            {item.daysSinceLast !== null && item.daysSinceLast <= 1 && (
              <span className="text-[9px] bg-green-500/20 text-green-600 rounded-full px-1.5 py-0.5 font-semibold hidden sm:inline">Hari ini</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", cfg.bar)} style={{ width: `${clampedPct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums shrink-0 text-muted-foreground">
              {item.actual}/{item.target}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tabular-nums">{item.percent.toFixed(0)}%</span>
          <Badge className={cn("text-[10px] hidden sm:flex border", cfg.badge)}>{cfg.label}</Badge>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/40 animate-fade-up">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
            {[
              { label: "Qty SP", value: formatNumber(item.qtySP) },
              { label: "Target", value: formatNumber(item.target), sub: `SP × ${TARGET_MULTIPLIER}` },
              { label: "Aktual", value: formatNumber(item.actual) },
              {
                label: item.gap > 0 ? "Kurang" : "Surplus",
                value: item.gap > 0 ? `-${formatNumber(item.gap)}` : `+${formatNumber(Math.abs(item.gap))}`,
                valueClass: item.gap > 0 ? "text-red-500" : "text-green-500",
              },
              { label: "Progress", value: `${item.percent.toFixed(1)}%` },
            ].map((m) => (
              <div key={m.label} className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                <p className={cn("text-sm font-bold", m.valueClass)}>{m.value}</p>
                {m.sub && <p className="text-[9px] text-muted-foreground">{m.sub}</p>}
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 mt-3">
            {item.kabupaten && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.kabupaten}</span>}
            {item.cluster && <span className="flex items-center gap-1 text-xs text-muted-foreground"><FilterIcon className="h-3 w-3" />{item.cluster}</span>}
            {item.spv && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />SPV: {item.spv}</span>}
            {item.spm && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />PM: {item.spm}</span>}
          </div>

          {/* Last activation + staleness */}
          {item.lastActivation && (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Aktivasi terakhir: <span className="font-medium text-foreground">{item.lastActivation}</span>
                {item.daysSinceLast !== null && (
                  <span className={cn("ml-1", item.daysSinceLast > 7 ? "text-amber-500" : "text-green-500")}>
                    ({item.daysSinceLast === 0 ? "hari ini" : `${item.daysSinceLast} hari lalu`})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Mini activation timeline */}
          {item.activationDates.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Riwayat Tanggal Aktivasi</p>
              <div className="flex flex-wrap gap-1">
                {item.activationDates.slice(-20).map((d) => (
                  <span key={d} className="text-[10px] bg-muted rounded px-1.5 py-0.5 tabular-nums">{d}</span>
                ))}
                {item.activationDates.length > 20 && (
                  <span className="text-[10px] text-muted-foreground">+{item.activationDates.length - 20} lagi</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHART COMPONENTS
// ─────────────────────────────────────────────────────────────

function StatusPieChart({ items }: { items: TowerItem[] }) {
  const data = (["achieved", "on_progress", "need_attention", "not_started"] as TowerStatus[])
    .map((s) => ({ name: getStatusCfg(s).label, value: items.filter(t => t.status === s).length, color: getStatusCfg(s).color }))
    .filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
          paddingAngle={3} dataKey="value" nameKey="name">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v} tower`, ""]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProgressDistChart({ items }: { items: TowerItem[] }) {
  const buckets = [
    { range: "0%",      min: 0,   max: 0,   count: 0 },
    { range: "1-25%",   min: 1,   max: 25,  count: 0 },
    { range: "26-50%",  min: 26,  max: 50,  count: 0 },
    { range: "51-75%",  min: 51,  max: 75,  count: 0 },
    { range: "76-99%",  min: 76,  max: 99,  count: 0 },
    { range: "100%+",   min: 100, max: 999, count: 0 },
  ];
  for (const t of items) {
    const b = buckets.find(b => t.percent >= b.min && t.percent <= b.max);
    if (b) b.count++;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip formatter={(v) => [`${v} tower`, "Jumlah"]} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tower">
          {buckets.map((b) => (
            <Cell key={b.range} fill={b.min >= 100 ? "#22c55e" : b.min >= 76 ? "#86efac" : b.min >= 51 ? "#fbbf24" : b.min >= 26 ? "#fb923c" : b.min >= 1 ? "#f87171" : "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopKabupatenChart({ items }: { items: TowerItem[] }) {
  const map: Record<string, { total: number; achieved: number }> = {};
  for (const t of items) {
    const k = t.kabupaten || "Unknown";
    if (!map[k]) map[k] = { total: 0, achieved: 0 };
    map[k].total++;
    if (t.status === "achieved") map[k].achieved++;
  }
  const data = Object.entries(map)
    .map(([name, v]) => ({ name, total: v.total, achieved: v.achieved, pct: v.total > 0 ? Math.round((v.achieved / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 9 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
        <Tooltip formatter={(v) => [`${v}%`, "Achieved"]} />
        <Bar dataKey="pct" fill="#3b82f6" radius={[0, 4, 4, 0]} name="% Achieved" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────
// SUMMARY TABLES (Per SPV / Per Kabupaten)
// ─────────────────────────────────────────────────────────────

interface GroupSummary {
  name: string;
  total: number;
  achieved: number;
  onProgress: number;
  needAttn: number;
  notStarted: number;
  totalTarget: number;
  totalActual: number;
  pct: number;
}

function buildGroups(items: TowerItem[], key: keyof TowerItem): GroupSummary[] {
  const map: Record<string, GroupSummary> = {};
  for (const t of items) {
    const name = (t[key] as string) || "—";
    if (!map[name]) map[name] = { name, total: 0, achieved: 0, onProgress: 0, needAttn: 0, notStarted: 0, totalTarget: 0, totalActual: 0, pct: 0 };
    const g = map[name];
    g.total++;
    g.totalTarget += t.target;
    g.totalActual += t.actual;
    if (t.status === "achieved")       g.achieved++;
    if (t.status === "on_progress")    g.onProgress++;
    if (t.status === "need_attention") g.needAttn++;
    if (t.status === "not_started")    g.notStarted++;
  }
  return Object.values(map).map(g => ({ ...g, pct: g.totalTarget > 0 ? (g.totalActual / g.totalTarget) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
}

function GroupTable({ groups }: { groups: GroupSummary[] }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              {["Nama","Total","✅","🔄","⚠️","❌","Target","Aktual","Progress"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={g.name} className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                <td className="px-3 py-2 font-medium truncate max-w-[140px]">{g.name}</td>
                <td className="px-3 py-2 tabular-nums">{g.total}</td>
                <td className="px-3 py-2 tabular-nums text-green-600 font-semibold">{g.achieved}</td>
                <td className="px-3 py-2 tabular-nums text-blue-600 font-semibold">{g.onProgress}</td>
                <td className="px-3 py-2 tabular-nums text-amber-600 font-semibold">{g.needAttn}</td>
                <td className="px-3 py-2 tabular-nums text-red-600 font-semibold">{g.notStarted}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatNumber(g.totalTarget)}</td>
                <td className="px-3 py-2 tabular-nums font-semibold">{formatNumber(g.totalActual)}</td>
                <td className="px-3 py-2 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", g.pct >= 100 ? "bg-green-500" : g.pct >= 50 ? "bg-amber-500" : "bg-red-400")}
                        style={{ width: `${Math.min(g.pct, 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums shrink-0">{g.pct.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SpvSummaryTable({ items }: { items: TowerItem[] }) {
  const groups = useMemo(() => buildGroups(items, "spv"), [items]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Ringkasan pencapaian target tower per SPV</p>
      {groups.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Tidak ada data.</div> : <GroupTable groups={groups} />}
    </div>
  );
}

function KabupatenSummaryTable({ items }: { items: TowerItem[] }) {
  const groups = useMemo(() => buildGroups(items, "kabupaten"), [items]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Ringkasan pencapaian target tower per Kabupaten</p>
      {groups.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Tidak ada data.</div> : <GroupTable groups={groups} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function TowerAnalysisPage() {
  const queryClient = useQueryClient();
  const { filter } = useFilterStore();

  // Fetch data — transactions uses global filter, BTS is master
  const { data: btsData, isLoading: btsLoading } = useMasterBTS();
  const { data: transactions, isLoading: txLoading } = useTransactions(filter);
  const loading = btsLoading || txLoading;

  // ── Filter state (local to this page) ────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TowerStatus>("all");
  const [kabFilter, setKabFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [spvFilter, setSpvFilter] = useState("all");
  const [pmFilter, setPmFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"percent_asc" | "percent_desc" | "gap" | "name" | "actual_desc" | "recent">("percent_asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterBTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] });
  }, [queryClient]);

  // ── Build tower list ──────────────────────────────────────
  const allTowers = useMemo(() => {
    if (!btsData || !transactions) return [];
    return buildTowerList(btsData, transactions);
  }, [btsData, transactions]);

  // ── Filter options ────────────────────────────────────────
  const kabOptions = useMemo(() => [...new Set(allTowers.map(t => t.kabupaten).filter(Boolean))].sort(), [allTowers]);
  const clusterOptions = useMemo(() => [...new Set(allTowers.map(t => t.cluster).filter(Boolean))].sort(), [allTowers]);
  const spvOptions = useMemo(() => [...new Set(allTowers.map(t => t.spv).filter(Boolean))].sort(), [allTowers]);
  const pmOptions = useMemo(() => [...new Set(allTowers.map(t => t.spm).filter(Boolean))].sort(), [allTowers]);

  // ── Summary ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const achieved      = allTowers.filter(t => t.status === "achieved").length;
    const onProgress    = allTowers.filter(t => t.status === "on_progress").length;
    const needAttn      = allTowers.filter(t => t.status === "need_attention").length;
    const notStarted    = allTowers.filter(t => t.status === "not_started").length;
    const totalTarget   = allTowers.reduce((s, t) => s + t.target, 0);
    const totalActual   = allTowers.reduce((s, t) => s + t.actual, 0);
    const overallPct    = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const totalGap      = allTowers.filter(t => t.gap > 0).reduce((s, t) => s + t.gap, 0);
    const activeTodayCount = allTowers.filter(t => t.daysSinceLast === 0).length;
    return { achieved, onProgress, needAttn, notStarted, totalTarget, totalActual, overallPct, totalGap, activeTodayCount };
  }, [allTowers]);

  // ── Filtered list ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allTowers;
    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (kabFilter !== "all")    list = list.filter(t => t.kabupaten === kabFilter);
    if (clusterFilter !== "all") list = list.filter(t => t.cluster === clusterFilter);
    if (spvFilter !== "all")    list = list.filter(t => t.spv === spvFilter);
    if (pmFilter !== "all")     list = list.filter(t => t.spm === pmFilter);
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(kw) || t.towerName.toLowerCase().includes(kw) ||
        t.kabupaten.toLowerCase().includes(kw) || t.cluster.toLowerCase().includes(kw) ||
        t.spv.toLowerCase().includes(kw) || t.spm.toLowerCase().includes(kw)
      );
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "percent_asc":   return a.percent - b.percent;
        case "percent_desc":  return b.percent - a.percent;
        case "gap":           return b.gap - a.gap;
        case "name":          return a.id.localeCompare(b.id);
        case "actual_desc":   return b.actual - a.actual;
        case "recent":        return (b.lastActivation ?? "").localeCompare(a.lastActivation ?? "");
        default:              return 0;
      }
    });
  }, [allTowers, statusFilter, kabFilter, clusterFilter, spvFilter, pmFilter, search, sortBy]);

  const activeFilterCount = [
    statusFilter !== "all", kabFilter !== "all", clusterFilter !== "all",
    spvFilter !== "all", pmFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter("all"); setKabFilter("all"); setClusterFilter("all");
    setSpvFilter("all"); setPmFilter("all"); setSearch("");
  };

  // ── CSV Export ────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const rows = [
      ["Tower ID","Tower Name","Kabupaten","Cluster","SPV","PM","Qty SP","Target","Aktual","Progress %","Gap","Status","Last Aktivasi"],
      ...filtered.map(t => [
        t.id, t.towerName, t.kabupaten, t.cluster, t.spv, t.spm,
        t.qtySP, t.target, t.actual, t.percent.toFixed(1), t.gap,
        getStatusCfg(t.status).label, t.lastActivation ?? "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tower-analysis.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            Target Tower Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Analisa pencapaian target per tower • Target = Qty SP × {TARGET_MULTIPLIER}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || !filtered.length} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Summary ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Achieved" value={summary.achieved}
            sub={`${allTowers.length > 0 ? ((summary.achieved / allTowers.length) * 100).toFixed(0) : 0}% dari total`}
            icon={CheckCircle2} colorClass="bg-green-500/10 border-green-500/20 text-green-600"
            onClick={() => setStatusFilter(statusFilter === "achieved" ? "all" : "achieved")}
            active={statusFilter === "achieved"} />
          <StatCard label="On Progress" value={summary.onProgress}
            sub="Aktivasi ≤7 hari"
            icon={Activity} colorClass="bg-blue-500/10 border-blue-500/20 text-blue-600"
            onClick={() => setStatusFilter(statusFilter === "on_progress" ? "all" : "on_progress")}
            active={statusFilter === "on_progress"} />
          <StatCard label="Need Attention" value={summary.needAttn}
            sub="Belum capai, &gt;7 hari"
            icon={AlertTriangle} colorClass="bg-amber-500/10 border-amber-500/20 text-amber-600"
            onClick={() => setStatusFilter(statusFilter === "need_attention" ? "all" : "need_attention")}
            active={statusFilter === "need_attention"} />
          <StatCard label="Not Started" value={summary.notStarted}
            sub="Belum ada aktivasi"
            icon={XCircle} colorClass="bg-red-500/10 border-red-500/20 text-red-600"
            onClick={() => setStatusFilter(statusFilter === "not_started" ? "all" : "not_started")}
            active={statusFilter === "not_started"} />
        </div>
      )}

      {/* ── Overall progress + mini stats row ────────────────── */}
      {!loading && allTowers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Card className="sm:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold">Overall Progress</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-muted-foreground">
                  {formatNumber(summary.totalActual)} / {formatNumber(summary.totalTarget)}
                </span>
              </div>
              <Progress value={Math.min(summary.overallPct, 100)} className="h-3" />
              <div className="flex justify-between mt-1.5">
                <span className={cn("text-xs font-semibold", summary.overallPct >= 100 ? "text-green-500" : summary.overallPct >= 50 ? "text-amber-500" : "text-red-500")}>
                  {summary.overallPct.toFixed(1)}% tercapai
                </span>
                <span className="text-xs text-muted-foreground">
                  Gap total: {formatNumber(summary.totalGap)} aktivasi
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">Aktif hari ini</span>
                <span className="ml-auto font-bold">{summary.activeTodayCount} tower</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Radio className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">Total tower</span>
                <span className="ml-auto font-bold">{formatNumber(allTowers.length)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-muted-foreground">Rata-rata progress</span>
                <span className="ml-auto font-bold">
                  {allTowers.length > 0 ? (allTowers.reduce((s, t) => s + t.percent, 0) / allTowers.length).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground">Total aktivasi</span>
                <span className="ml-auto font-bold">{formatNumber(summary.totalActual)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Warning Banner ───────────────────────────────────── */}
      {!loading && (summary.needAttn + summary.notStarted) > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/8 px-4 py-3 flex gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {summary.needAttn + summary.notStarted} tower perlu perhatian segera!
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              <span className="font-medium">{summary.notStarted}</span> tower belum ada aktivasi sama sekali —{" "}
              <span className="font-medium">{summary.needAttn}</span> tower sudah berjalan tapi stagnant &gt;7 hari.
              {summary.totalGap > 0 && <> Total gap: <span className="font-medium">{formatNumber(summary.totalGap)}</span> aktivasi tersisa.</>}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs: List | Charts ──────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-auto">
            <TabsTrigger value="list" className="text-xs py-2 px-3 gap-1.5">
              <Eye className="h-3.5 w-3.5" />List Tower
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs py-2 px-3 gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" />Charts
            </TabsTrigger>
            <TabsTrigger value="spv" className="text-xs py-2 px-3 gap-1.5">
              <Users className="h-3.5 w-3.5" />Per SPV
            </TabsTrigger>
            <TabsTrigger value="kabupaten" className="text-xs py-2 px-3 gap-1.5">
              <MapPin className="h-3.5 w-3.5" />Per Kabupaten
            </TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {allTowers.length} tower
          </span>
        </div>

        {/* ── FILTER PANEL ──────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Cari Tower ID, nama, kabupaten, SPV…"
                className="pl-9 h-9 text-xs rounded-xl border-0 bg-muted/40 focus-visible:ring-1"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
                filtersOpen || activeFilterCount > 0
                  ? "gradient-blue text-white shadow-md"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
              {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {(activeFilterCount > 0 || search) && (
              <button onClick={resetFilters}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="px-3 pb-3 border-t border-border/40 pt-3 animate-fade-up">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { label: "Status",    value: statusFilter,  setValue: setStatusFilter,
                    options: [["all","Semua Status"],["achieved","✅ Achieved"],["on_progress","🔄 On Progress"],["need_attention","⚠️ Need Attention"],["not_started","❌ Not Started"]] },
                  { label: "Kabupaten", value: kabFilter,     setValue: setKabFilter,     options: [["all","Semua"], ...kabOptions.map(k => [k,k])] },
                  { label: "Cluster",   value: clusterFilter, setValue: setClusterFilter, options: [["all","Semua"], ...clusterOptions.map(k => [k,k])] },
                  { label: "SPV",       value: spvFilter,     setValue: setSpvFilter,     options: [["all","Semua"], ...spvOptions.map(k => [k,k])] },
                  { label: "PM",        value: pmFilter,      setValue: setPmFilter,      options: [["all","Semua"], ...pmOptions.map(k => [k,k])] },
                ].map(({ label, value, setValue, options }) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
                    <Select value={value} onValueChange={v => setValue(v as never)}>
                      <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue /></SelectTrigger>
                      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Urutkan</Label>
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border/60 w-auto min-w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent_asc">Progress ↑ (terendah dulu)</SelectItem>
                    <SelectItem value="percent_desc">Progress ↓ (tertinggi dulu)</SelectItem>
                    <SelectItem value="gap">Gap Terbesar</SelectItem>
                    <SelectItem value="actual_desc">Aktivasi Terbanyak</SelectItem>
                    <SelectItem value="recent">Terbaru Diaktivasi</SelectItem>
                    <SelectItem value="name">Tower ID A–Z</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors">
                    Reset filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ══ TAB: LIST TOWER ══════════════════════════════════ */}
        <TabsContent value="list" className="space-y-2 animate-fade-in">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <EyeOff className="h-8 w-8 opacity-30" />
              <p className="text-sm">Tidak ada tower yang cocok.</p>
              {(activeFilterCount > 0 || search) && (
                <button onClick={resetFilters} className="text-xs text-blue-500 hover:underline">Reset filter</button>
              )}
            </div>
          ) : (
            filtered.map((item, idx) => <TowerRow key={item.id} item={item} index={idx} />)
          )}
        </TabsContent>

        {/* ══ TAB: CHARTS ══════════════════════════════════════ */}
        <TabsContent value="charts" className="animate-fade-in">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribusi Status Tower</CardTitle></CardHeader>
                <CardContent className="pt-0"><StatusPieChart items={filtered} /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribusi Progress (%)</CardTitle></CardHeader>
                <CardContent className="pt-0"><ProgressDistChart items={filtered} /></CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">% Achieved per Kabupaten (Top 10)</CardTitle></CardHeader>
                <CardContent className="pt-0"><TopKabupatenChart items={filtered} /></CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ══ TAB: PER SPV ═════════════════════════════════════ */}
        <TabsContent value="spv" className="animate-fade-in">
          {loading ? <Skeleton className="h-64 rounded-2xl" /> : (
            <SpvSummaryTable items={filtered} />
          )}
        </TabsContent>

        {/* ══ TAB: PER KABUPATEN ═══════════════════════════════ */}
        <TabsContent value="kabupaten" className="animate-fade-in">
          {loading ? <Skeleton className="h-64 rounded-2xl" /> : (
            <KabupatenSummaryTable items={filtered} />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
