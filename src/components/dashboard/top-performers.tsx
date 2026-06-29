"use client";

import React from "react";
import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { PerformanceItem } from "@/types";
import { formatNumber, cn } from "@/lib/utils";

interface TopPerformersProps {
  data?: PerformanceItem[];
  loading: boolean;
  title: string;
  limit?: number;
  colorClass?: string;
}

const MEDAL = ["bg-yellow-400 text-yellow-900", "bg-slate-300 text-slate-700", "bg-amber-600 text-white"];

export function TopPerformers({ data, loading, title, limit = 5, colorClass = "bg-blue-500" }: TopPerformersProps) {
  const top = data?.slice(0, limit) ?? [];
  const maxCount = top[0]?.count ?? 1;

  if (loading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (!top.length) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
        Belum ada data
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {top.map((item, idx) => {
        const barPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        return (
          <div key={item.name} className="flex items-center gap-2.5 group">
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
              idx < 3 ? MEDAL[idx] : "bg-muted text-muted-foreground"
            )}>
              {idx < 3 ? <Award className="h-3 w-3" /> : idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
              <div className="mt-0.5 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-bold tabular-nums text-right shrink-0 min-w-[2rem]">
              {formatNumber(item.count)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
