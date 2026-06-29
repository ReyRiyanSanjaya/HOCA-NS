"use client";

import React from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { BrandDistribution } from "@/components/dashboard/brand-distribution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS } from "@/lib/config";
import { formatDateTime } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function HomePage() {
  const { filter } = useFilterStore();
  const queryClient = useQueryClient();
  const { data, isLoading, dataUpdatedAt, refetch } = useDashboard(filter);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.dashboard] });
    refetch();
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataUpdatedAt
              ? `Last updated: ${formatDateTime(new Date(dataUpdatedAt).toISOString())}`
              : "Real-time seeding operations overview"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Global Filter */}
      <GlobalFilter />

      {/* KPI Cards */}
      <KPICards data={data} loading={isLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Brand Distribution */}
        <BrandDistribution
          data={data?.brandDistribution}
          loading={isLoading}
        />

        {/* Daily Trend Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Activation Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: "Mon", value: 0 },
                    { name: "Tue", value: 0 },
                    { name: "Wed", value: 0 },
                    { name: "Thu", value: 0 },
                    { name: "Fri", value: 0 },
                    { name: "Sat", value: 0 },
                    { name: "Sun", value: 0 },
                  ]}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mt-4 animate-fade-in">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {data.activationPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">
                {data.avgActivationPerBTS.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg / BTS</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-500">
                {data.avgActivationPerPromotor.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg / Promotor</p>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
