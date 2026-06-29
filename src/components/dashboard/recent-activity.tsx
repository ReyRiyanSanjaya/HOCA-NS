"use client";

import React from "react";
import { Clock, Radio, User, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";
import { getBrandColor, cn } from "@/lib/utils";

interface RecentActivityProps {
  transactions?: Transaction[];
  loading: boolean;
  limit?: number;
}

function timeAgo(dateStr: string, jamStr?: string): string {
  try {
    const d = new Date(`${dateStr}T${jamStr || "00:00:00"}`);
    const diff = Date.now() - d.getTime();
    if (isNaN(diff)) return dateStr;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "Baru saja";
    if (mins < 60)  return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7)   return `${days} hari lalu`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function RecentActivity({ transactions, loading, limit = 8 }: RecentActivityProps) {
  const recent = transactions
    ?.slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-48" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!recent?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
        <Clock className="h-8 w-8 opacity-20" />
        <p className="text-xs">Belum ada aktivitas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recent.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors group"
        >
          {/* Brand color dot */}
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ backgroundColor: `${getBrandColor(tx.brand)}20` }}
          >
            <Smartphone className="h-4 w-4" style={{ color: getBrandColor(tx.brand) }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold truncate">{tx.promotor || "—"}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{tx.idBTS}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(tx.tanggal, tx.jam)}
              </span>
              {tx.supervisor && (
                <>
                  <span className="text-[10px] text-muted-foreground/40">•</span>
                  <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[10px] text-muted-foreground truncate">{tx.supervisor}</span>
                </>
              )}
            </div>
          </div>

          {/* Brand badge */}
          <Badge
            className="text-[9px] px-1.5 py-0.5 shrink-0 border-0 font-semibold"
            style={{ backgroundColor: `${getBrandColor(tx.brand)}25`, color: getBrandColor(tx.brand) }}
          >
            {tx.brand}
          </Badge>
        </div>
      ))}
    </div>
  );
}
