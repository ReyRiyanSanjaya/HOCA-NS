"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Users,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MasterBTS, Transaction } from "@/types";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ============================================================
// CONSTANTS
// ============================================================
const TARGET_MULTIPLIER = 3; // Qty SP Seeding × 3 = target aktivasi

// ============================================================
// TYPES
// ============================================================
export type TowerStatus = "achieved" | "need_attention" | "not_started";

export interface TowerAnalysisItem {
  id: string;
  towerName: string;
  kabupaten: string;
  cluster: string;
  spm: string;
  spv: string;
  qtySP: number;           // Qty SP Seeding by Brand(s) — raw number
  target: number;          // qtySP × TARGET_MULTIPLIER
  actual: number;          // jumlah transaksi actual
  percent: number;         // (actual / target) × 100
  status: TowerStatus;
  gap: number;             // target - actual (negatif = sudah lewati)
  lastActivation: string | null;
}

// ============================================================
// HELPERS
// ============================================================
function parseQtySP(raw: string): number {
  if (!raw) return 0;
  // Coba parse langsung angka (misal "50" atau "50.0")
  const direct = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!isNaN(direct) && direct > 0) return Math.round(direct);
  return 0;
}

function getTowerStatus(percent: number, actual: number): TowerStatus {
  if (actual === 0) return "not_started";
  if (percent >= 100) return "achieved";
  return "need_attention";
}

function getStatusConfig(status: TowerStatus) {
  switch (status) {
    case "achieved":
      return {
        label: "Achieved",
        icon: CheckCircle2,
        badgeClass: "bg-green-500/15 text-green-600 border-green-500/30",
        iconClass: "text-green-500",
        progressClass: "bg-green-500",
        rowClass: "border-l-4 border-l-green-400",
      };
    case "need_attention":
      return {
        label: "Need Attention",
        icon: AlertTriangle,
        badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
        iconClass: "text-amber-500",
        progressClass: "bg-amber-500",
        rowClass: "border-l-4 border-l-amber-400",
      };
    case "not_started":
      return {
        label: "Not Started",
        icon: XCircle,
        badgeClass: "bg-red-500/15 text-red-600 border-red-500/30",
        iconClass: "text-red-500",
        progressClass: "bg-red-400",
        rowClass: "border-l-4 border-l-red-400",
      };
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SummaryCard({
  status,
  count,
  total,
}: {
  status: TowerStatus;
  count: number;
  total: number;
}) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";

  const bgMap: Record<TowerStatus, string> = {
    achieved: "bg-green-500/10 border-green-500/20",
    need_attention: "bg-amber-500/10 border-amber-500/20",
    not_started: "bg-red-500/10 border-red-500/20",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex items-center gap-4",
        bgMap[status]
      )}
    >
      <div
        className={cn(
          "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center",
          status === "achieved"
            ? "bg-green-500"
            : status === "need_attention"
            ? "bg-amber-500"
            : "bg-red-500"
        )}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {cfg.label}
        </p>
        <p className="text-2xl font-bold leading-tight">{formatNumber(count)}</p>
        <p className="text-xs text-muted-foreground">{pct}% dari total tower</p>
      </div>
    </div>
  );
}

function TowerRow({ item, index }: { item: TowerAnalysisItem; index: number }) {
  const [open, setOpen] = useState(false);
  const cfg = getStatusConfig(item.status);
  const Icon = cfg.icon;
  const clampedPct = Math.min(item.percent, 100);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        "transition-all duration-200",
        cfg.rowClass
      )}
    >
      {/* Main row — clickable to expand */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Rank */}
        <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* Status icon */}
        <Icon className={cn("h-4 w-4 shrink-0", cfg.iconClass)} />

        {/* Tower info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{item.id}</span>
            {item.towerName && (
              <span className="text-xs text-muted-foreground truncate hidden sm:block">
                — {item.towerName}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", cfg.progressClass)}
                style={{ width: `${clampedPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums shrink-0">
              {item.actual}/{item.target}
            </span>
          </div>
        </div>

        {/* Badge & pct */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tabular-nums">
            {item.percent.toFixed(0)}%
          </span>
          <Badge className={cn("text-[10px] hidden sm:flex border", cfg.badgeClass)}>
            {cfg.label}
          </Badge>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target</p>
              <p className="text-sm font-bold">
                {formatNumber(item.target)}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({formatNumber(item.qtySP)} SP × {TARGET_MULTIPLIER})
                </span>
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aktual</p>
              <p className="text-sm font-bold">{formatNumber(item.actual)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {item.gap > 0 ? "Kurang" : "Lebih"}
              </p>
              <p
                className={cn(
                  "text-sm font-bold",
                  item.gap > 0 ? "text-red-500" : "text-green-500"
                )}
              >
                {item.gap > 0 ? `-${formatNumber(item.gap)}` : `+${formatNumber(Math.abs(item.gap))}`}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Progress</p>
              <p className="text-sm font-bold">{item.percent.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {item.kabupaten && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.kabupaten}</span>
              </div>
            )}
            {item.cluster && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.cluster}</span>
              </div>
            )}
            {item.spv && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">SPV: {item.spv}</span>
              </div>
            )}
            {item.spm && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">PM: {item.spm}</span>
              </div>
            )}
          </div>

          {item.lastActivation && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Aktivasi terakhir: <span className="font-medium">{item.lastActivation}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
interface TowerAnalysisProps {
  btsData?: MasterBTS[];
  transactions?: Transaction[];
  loading: boolean;
}

export function TowerAnalysis({ btsData, transactions, loading }: TowerAnalysisProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TowerStatus>("all");
  const [sortBy, setSortBy] = useState<"percent_asc" | "percent_desc" | "gap" | "name">(
    "percent_asc"
  );

  // ── Compute tower analysis list ──────────────────────────────────────
  const towerList = useMemo<TowerAnalysisItem[]>(() => {
    if (!btsData || !transactions) return [];

    // Group transactions by BTS ID
    const actByBTS: Record<string, { count: number; lastDate: string | null }> = {};
    for (const tx of transactions) {
      const id = tx.idBTS;
      if (!actByBTS[id]) actByBTS[id] = { count: 0, lastDate: null };
      actByBTS[id].count++;
      const d = tx.tanggal || tx.timestamp?.substring(0, 10) || "";
      if (d && (!actByBTS[id].lastDate || d > actByBTS[id].lastDate!)) {
        actByBTS[id].lastDate = d;
      }
    }

    return btsData
      .map((bts) => {
        const qtySP = parseQtySP(bts.qtySPSeedingByBrands);
        const target = qtySP * TARGET_MULTIPLIER;
        const act = actByBTS[bts.id];
        const actual = act?.count ?? 0;
        const percent = target > 0 ? (actual / target) * 100 : actual > 0 ? 100 : 0;
        const status = getTowerStatus(percent, actual);
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
          lastActivation: act?.lastDate ?? null,
        } satisfies TowerAnalysisItem;
      })
      .filter((t) => t.qtySP > 0 || t.actual > 0); // hanya tower yang punya data
  }, [btsData, transactions]);

  // ── Summary counts ───────────────────────────────────────────────────
  const summary = useMemo(() => {
    const achieved = towerList.filter((t) => t.status === "achieved").length;
    const needAttn = towerList.filter((t) => t.status === "need_attention").length;
    const notStart = towerList.filter((t) => t.status === "not_started").length;
    const totalTarget = towerList.reduce((s, t) => s + t.target, 0);
    const totalActual = towerList.reduce((s, t) => s + t.actual, 0);
    const overallPct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return { achieved, needAttn, notStart, totalTarget, totalActual, overallPct };
  }, [towerList]);

  // ── Filter + sort ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = towerList;

    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(kw) ||
          t.towerName.toLowerCase().includes(kw) ||
          t.kabupaten.toLowerCase().includes(kw) ||
          t.cluster.toLowerCase().includes(kw) ||
          t.spv.toLowerCase().includes(kw) ||
          t.spm.toLowerCase().includes(kw)
      );
    }

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "percent_asc":
          return a.percent - b.percent;
        case "percent_desc":
          return b.percent - a.percent;
        case "gap":
          return b.gap - a.gap; // terbesar gap = paling perlu perhatian
        case "name":
          return a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });

    return list;
  }, [towerList, statusFilter, search, sortBy]);

  // ── Warning towers (need_attention + not_started) ────────────────────
  const warningCount = summary.needAttn + summary.notStart;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!towerList.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Data tower tidak tersedia. Pastikan data master BTS dan transaksi sudah dimuat.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard status="achieved" count={summary.achieved} total={towerList.length} />
        <SummaryCard status="need_attention" count={summary.needAttn} total={towerList.length} />
        <SummaryCard status="not_started" count={summary.notStart} total={towerList.length} />
      </div>

      {/* ── Overall progress ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">Overall Target Progress</span>
            </div>
            <span className="text-sm font-bold tabular-nums">
              {formatNumber(summary.totalActual)} / {formatNumber(summary.totalTarget)}
            </span>
          </div>
          <Progress value={Math.min(summary.overallPct, 100)} className="h-2.5" />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">
              {summary.overallPct.toFixed(1)}% tercapai
            </span>
            <span className="text-xs text-muted-foreground">
              Multiplier: Qty SP × {TARGET_MULTIPLIER}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Warning banner ────────────────────────────────────────────── */}
      {warningCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {warningCount} tower membutuhkan perhatian!
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {summary.notStart} tower belum ada aktivasi sama sekali •{" "}
              {summary.needAttn} tower sudah ada aktivasi tapi belum capai target.
              Fokus pada tower dengan gap terbesar untuk mempercepat pencapaian target.
            </p>
          </div>
        </div>
      )}

      {/* ── Filter & sort controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari Tower ID, nama, kabupaten…"
            className="pl-9 h-9 text-xs rounded-xl border-border/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 w-auto min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="achieved">✅ Achieved</SelectItem>
            <SelectItem value="need_attention">⚠️ Need Attention</SelectItem>
            <SelectItem value="not_started">❌ Not Started</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 w-auto min-w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percent_asc">Progress ↑ (terendah)</SelectItem>
            <SelectItem value="percent_desc">Progress ↓ (tertinggi)</SelectItem>
            <SelectItem value="gap">Gap Terbesar</SelectItem>
            <SelectItem value="name">Tower ID A-Z</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center text-xs text-muted-foreground self-center shrink-0">
          <TrendingUp className="h-3.5 w-3.5 mr-1" />
          {filtered.length} tower
        </div>
      </div>

      {/* ── Tower list ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Tidak ada tower yang cocok dengan filter.
          </div>
        ) : (
          filtered.map((item, idx) => (
            <TowerRow key={item.id} item={item} index={idx} />
          ))
        )}
      </div>
    </div>
  );
}
