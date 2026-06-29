"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Target, CheckCircle2, AlertTriangle, XCircle, Activity, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { MasterBTS, Transaction } from "@/types";
import { formatNumber, cn } from "@/lib/utils";

const TARGET_MULTIPLIER = 3;

function parseQtySP(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n <= 0 ? 0 : Math.round(n);
}

interface TowerTargetSummaryProps {
  btsData?: MasterBTS[];
  transactions?: Transaction[];
  loading: boolean;
}

export function TowerTargetSummary({ btsData, transactions, loading }: TowerTargetSummaryProps) {
  const stats = useMemo(() => {
    if (!btsData || !transactions) return null;

    const txCount: Record<string, number> = {};
    for (const tx of transactions) {
      txCount[tx.idBTS] = (txCount[tx.idBTS] || 0) + 1;
    }

    let achieved = 0, onProgress = 0, needAttn = 0, notStarted = 0;
    let totalTarget = 0, totalActual = 0;

    for (const bts of btsData) {
      const qtySP = parseQtySP(bts.qtySPSeedingByBrands);
      if (qtySP === 0 && !txCount[bts.id]) continue;
      const target = qtySP * TARGET_MULTIPLIER;
      const actual = txCount[bts.id] ?? 0;
      totalTarget += target;
      totalActual += actual;
      const pct = target > 0 ? (actual / target) * 100 : actual > 0 ? 100 : 0;
      if (actual === 0) notStarted++;
      else if (pct >= 100) achieved++;
      else if (pct >= 50) onProgress++;
      else needAttn++;
    }

    const overallPct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return { achieved, onProgress, needAttn, notStarted, totalTarget, totalActual, overallPct };
  }, [btsData, transactions]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-28 text-muted-foreground text-xs">
        Data belum tersedia
      </div>
    );
  }

  const items = [
    { label: "Achieved",      value: stats.achieved,    color: "text-green-600", bg: "bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
    { label: "On Progress",   value: stats.onProgress,  color: "text-blue-600",  bg: "bg-blue-500/10 border-blue-500/20",  icon: Activity },
    { label: "Need Attention",value: stats.needAttn,    color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20",icon: AlertTriangle },
    { label: "Not Started",   value: stats.notStarted,  color: "text-red-600",   bg: "bg-red-500/10 border-red-500/20",    icon: XCircle },
  ];

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold">Overall Target Progress</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatNumber(stats.totalActual)} / {formatNumber(stats.totalTarget)}
          </span>
        </div>
        <Progress value={Math.min(stats.overallPct, 100)} className="h-2.5" />
        <p className={cn(
          "text-xs font-semibold mt-1",
          stats.overallPct >= 100 ? "text-green-500" : stats.overallPct >= 50 ? "text-amber-500" : "text-red-500"
        )}>
          {stats.overallPct.toFixed(1)}% tercapai
          <span className="font-normal text-muted-foreground ml-1">
            (Qty SP × {TARGET_MULTIPLIER})
          </span>
        </p>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={cn("rounded-xl border p-3 flex items-center gap-2.5", bg)}>
            <Icon className={cn("h-4 w-4 shrink-0", color)} />
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight">{formatNumber(value)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Link to full page */}
      <Link
        href="/tower-analysis"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold
          text-blue-600 hover:text-blue-700 bg-blue-500/8 hover:bg-blue-500/15 border border-blue-500/20
          transition-all duration-200 active:scale-[0.98]"
      >
        <Target className="h-3.5 w-3.5" />
        Lihat Detail Analisa Tower
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
