"use client";

import React from "react";
import {
  Activity,
  TrendingUp,
  Calendar,
  Radio,
  CheckCircle2,
  Clock,
  Percent,
  Users,
  UserCheck,
  Shield,
  MapPin,
  Layers,
  User,
  BarChart2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { DashboardKPI } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  progress?: number;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  progress,
}: KPICardProps) {
  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1 truncate">
              {typeof value === "number" ? formatNumber(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
            {trend !== undefined && (
              <p
                className={`text-xs mt-1 font-medium ${
                  trend >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs last period
              </p>
            )}
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KPICardsProps {
  data?: DashboardKPI;
  loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards: KPICardProps[] = [
    {
      title: "Today's Activation",
      value: data.todayActivation,
      icon: Activity,
      color: "bg-green-500",
      subtitle: "activations today",
    },
    {
      title: "Weekly Activation",
      value: data.weeklyActivation,
      icon: TrendingUp,
      color: "bg-blue-500",
      subtitle: "this week",
    },
    {
      title: "Monthly Activation",
      value: data.monthlyActivation,
      icon: Calendar,
      color: "bg-purple-500",
      subtitle: "this month",
    },
    {
      title: "Total BTS",
      value: data.totalBTS,
      icon: Radio,
      color: "bg-slate-500",
      subtitle: "all towers",
    },
    {
      title: "Activated BTS",
      value: data.activatedBTS,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      progress: data.activationPercent,
      subtitle: `${formatPercent(data.activationPercent)} done`,
    },
    {
      title: "Pending BTS",
      value: data.pendingBTS,
      icon: Clock,
      color: "bg-amber-500",
      subtitle: "awaiting activation",
    },
    {
      title: "Activation %",
      value: formatPercent(data.activationPercent),
      icon: Percent,
      color: "bg-indigo-500",
      progress: data.activationPercent,
    },
    {
      title: "Total Promotor",
      value: data.totalPromotor,
      icon: Users,
      color: "bg-pink-500",
      subtitle: `${data.activePromotor} active`,
    },
    {
      title: "Active Promotor",
      value: data.activePromotor,
      icon: UserCheck,
      color: "bg-teal-500",
      progress: (data.activePromotor / Math.max(data.totalPromotor, 1)) * 100,
    },
    {
      title: "Total SPV",
      value: data.totalSPV,
      icon: Shield,
      color: "bg-orange-500",
    },
    {
      title: "Total Kabupaten",
      value: data.totalKabupaten,
      icon: MapPin,
      color: "bg-cyan-500",
    },
    {
      title: "Total Cluster",
      value: data.totalCluster,
      icon: Layers,
      color: "bg-violet-500",
    },
    {
      title: "Total PM",
      value: data.totalPM,
      icon: User,
      color: "bg-rose-500",
    },
    {
      title: "Avg / BTS",
      value: data.avgActivationPerBTS.toFixed(1),
      icon: BarChart2,
      color: "bg-sky-500",
      subtitle: "activations per BTS",
    },
    {
      title: "Avg / Promotor",
      value: data.avgActivationPerPromotor.toFixed(1),
      icon: BarChart2,
      color: "bg-fuchsia-500",
      subtitle: "activations per promotor",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4 animate-fade-in">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  );
}
