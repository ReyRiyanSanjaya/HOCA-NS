"use client";

import React from "react";
import { RefreshCw, TrendingUp, Activity, Radio, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }      from "@/components/layout/page-container";
import { GlobalFilter }       from "@/components/dashboard/global-filter";
import { KPICards }           from "@/components/dashboard/kpi-cards";
import { BrandDistribution }  from "@/components/dashboard/brand-distribution";
import { Skeleton }           from "@/components/ui/skeleton";
import { useDashboard }       from "@/hooks/use-dashboard";
import { useFilterStore }     from "@/stores/filter-store";
import { CACHE_KEYS }         from "@/lib/config";
import { formatNumber, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function HomePage() {
  const { filter }  = useFilterStore();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useDashboard(filter);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.dashboard] });
    refetch();
  };

  // Quick stats row
  const quickStats = data ? [
    {
      label: "Progress",
      value: formatPercent(data.activationPercent),
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Avg/BTS",
      value: data.avgActivationPerBTS.toFixed(1),
      icon: Radio,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Avg/Promotor",
      value: data.avgActivationPerPromotor.toFixed(1),
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ] : [];

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            AXIS · XL · Smartfren Seeding Operations
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium",
            "bg-card border border-border/60 hover:bg-muted/50",
            "transition-all duration-200 active:scale-95",
            "shadow-sm hover:shadow"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Filter ─────────────────────────────────────────── */}
      <GlobalFilter />

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <KPICards data={data} loading={isLoading} />

      {/* ── Quick Stats ────────────────────────────────────── */}
      {(data || isLoading) && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))
            : quickStats.map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl bg-card border border-border/60 p-4
                    flex flex-col items-center gap-1.5 text-center
                    hover:shadow-md transition-all duration-200 animate-fade-up"
                >
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <p className={cn("text-lg font-bold leading-none", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                </div>
              ))
          }
        </div>
      )}

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Brand distribution */}
        <BrandDistribution data={data?.brandDistribution} loading={isLoading} />

        {/* Trend chart */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl gradient-blue flex items-center justify-center shadow-md shadow-blue-500/30">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tren Aktivasi</p>
              <p className="text-[11px] text-muted-foreground">Mingguan</p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-52 w-full rounded-xl" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: "Sen", value: 0 },
                    { name: "Sel", value: 0 },
                    { name: "Rab", value: 0 },
                    { name: "Kam", value: 0 },
                    { name: "Jum", value: 0 },
                    { name: "Sab", value: 0 },
                    { name: "Min", value: 0 },
                  ]}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(221,83%,53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(221,83%,53%)"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={{ r: 3, fill: "hsl(221,83%,53%)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
