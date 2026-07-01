"use client";

import React from "react";
import {
  Activity, TrendingUp, Calendar, Radio, CheckCircle2,
  Clock, Percent, Users, UserCheck, Shield,
  MapPin, Layers, User, BarChart2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { DashboardKPI } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  progress?: number;
  index?: number;
}

function KPICard({ title, value, subtitle, icon: Icon, gradient, progress, index = 0 }: KPICardProps) {
  return (
    <div
      className={cn(
        "kpi-card group relative rounded-2xl p-4",
        "bg-card border border-border/60",
        "hover:shadow-lg hover:-translate-y-0.5",
        "transition-all duration-300 cursor-default",
        "animate-fade-up"
      )}
      style={{ animationDelay: `${index * 35}ms` }}
    >
      {/* Subtle bg glow */}
      <div className={cn(
        "absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-10 blur-2xl",
        gradient
      )} />

      <div className="flex items-start justify-between gap-2">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-2xl font-bold mt-0.5 tracking-tight leading-none truncate">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>

        {/* Icon */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          "shadow-lg transition-transform duration-300 group-hover:scale-110",
          gradient
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="mt-3 space-y-1">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

interface KPICardsProps {
  data?: DashboardKPI;
  loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border/60 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards: (KPICardProps & { key: string })[] = [
    {
      key: "today",
      title: "Aktivasi Hari Ini",
      value: data.todayActivation,
      icon: Activity,
      gradient: "gradient-green",
      subtitle: "aktivasi hari ini",
    },
    {
      key: "weekly",
      title: "Aktivasi Minggu Ini",
      value: data.weeklyActivation,
      icon: TrendingUp,
      gradient: "gradient-blue",
      subtitle: "7 hari terakhir",
    },
    {
      key: "monthly",
      title: "Aktivasi Bulan Ini",
      value: data.monthlyActivation,
      icon: Calendar,
      gradient: "gradient-purple",
      subtitle: "bulan berjalan",
    },
    {
      key: "total-bts",
      title: "Total BTS",
      value: data.totalBTS,
      icon: Radio,
      gradient: "gradient-slate",
      subtitle: "semua tower",
    },
    {
      key: "activated-bts",
      title: "BTS Teraktivasi",
      value: data.activatedBTS,
      icon: CheckCircle2,
      gradient: "gradient-teal",
      progress: data.activationPercent,
      subtitle: `${formatPercent(data.activationPercent)} selesai`,
    },
    {
      key: "pending-bts",
      title: "BTS Pending",
      value: data.pendingBTS,
      icon: Clock,
      gradient: "gradient-amber",
      subtitle: "belum diaktivasi",
    },
    {
      key: "percent",
      title: "Persentase",
      value: formatPercent(data.activationPercent),
      icon: Percent,
      gradient: "gradient-indigo",
      progress: data.activationPercent,
    },
    {
      key: "promotor",
      title: "Total Promotor",
      value: data.totalPromotor,
      icon: Users,
      gradient: "gradient-pink",
      subtitle: `${data.activePromotor} aktif`,
    },
    {
      key: "active-promotor",
      title: "Promotor Aktif",
      value: data.activePromotor,
      icon: UserCheck,
      gradient: "gradient-cyan",
      progress: (data.activePromotor / Math.max(data.totalPromotor, 1)) * 100,
    },
    {
      key: "spv",
      title: "Total SPV",
      value: data.totalSPV,
      icon: Shield,
      gradient: "gradient-orange",
    },
    {
      key: "kabupaten",
      title: "Kabupaten",
      value: data.totalKabupaten,
      icon: MapPin,
      gradient: "gradient-blue",
    },
    {
      key: "Cluster",
      title: "Cluster",
      value: data.totalCluster,
      icon: Layers,
      gradient: "gradient-fuchsia",
    },
    {
      key: "PM",
      title: "Total PM",
      value: data.totalPM,
      icon: User,
      gradient: "gradient-rose",
    },
    {
      key: "avg-bts",
      title: "Rata-rata / BTS",
      value: data.avgActivationPerBTS.toFixed(1),
      icon: BarChart2,
      gradient: "gradient-indigo",
      subtitle: "aktivasi per BTS",
    },
    {
      key: "avg-promotor",
      title: "Rata-rata / Promotor",
      value: data.avgActivationPerPromotor.toFixed(1),
      icon: BarChart2,
      gradient: "gradient-purple",
      subtitle: "aktivasi per promotor",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5 stagger">
      {cards.map(({ key: cardKey, ...card }, i) => (
        <KPICard key={cardKey} {...card} index={i} />
      ))}
    </div>
  );
}
