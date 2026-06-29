"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalytics, useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS } from "@/hooks/use-master-data";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS } from "@/lib/config";
import { getBrandColor, formatNumber } from "@/lib/utils";
import { TowerAnalysis } from "@/components/analytics/tower-analysis";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

function ChartCard({
  title,
  children,
  loading,
}: {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No data available
    </div>
  );
}

export default function AnalyticsPage() {
  const { filter } = useFilterStore();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAnalytics(filter);
  const { data: btsData, isLoading: btsLoading } = useMasterBTS();
  const { data: transactions, isLoading: txLoading } = useTransactions(filter);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.analytics] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterBTS] });
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time performance insights</p>
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

      <GlobalFilter />

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="trends" className="text-xs py-2">Trends</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs py-2">Performance</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs py-2">Distribution</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs py-2">Rankings</TabsTrigger>
          <TabsTrigger value="tower" className="text-xs py-2">Tower Target</TabsTrigger>
        </TabsList>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-4 animate-fade-in">
          <ChartCard title="Daily Trend" loading={isLoading}>
            {!data?.dailyTrend?.length ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.dailyTrend}>
                  <defs>
                    <linearGradient id="daily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#daily)" name="Activations" />
                  {data.movingAverage?.length > 0 && (
                    <Line type="monotone" dataKey="count" data={data.movingAverage} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 4" name="Moving Avg" dot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Weekly Trend" loading={isLoading}>
            {!data?.weeklyTrend?.length ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} name="Activations" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Monthly Trend" loading={isLoading}>
            {!data?.monthlyTrend?.length ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="Activations" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Activation by Hour" loading={isLoading}>
              {!data?.hourlyActivation?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.hourlyActivation}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}:00`} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={(v) => `${v}:00`} />
                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Activations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Activation by Weekday" loading={isLoading}>
              {!data?.weekdayActivation?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.weekdayActivation}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#EC4899" radius={[4, 4, 0, 0]} name="Activations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4 animate-fade-in">
          <ChartCard title="Supervisor Performance" loading={isLoading}>
            {!data?.supervisorPerformance?.length ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.supervisorPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Activations" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Promotor Performance" loading={isLoading}>
            {!data?.promotorPerformance?.length ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.promotorPerformance.slice(0, 15)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} name="Activations" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartCard title="Kabupaten Performance" loading={isLoading}>
              {!data?.kabupatenPerformance?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.kabupatenPerformance.slice(0, 10)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#F59E0B" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Cluster Performance" loading={isLoading}>
              {!data?.clusterPerformance?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.clusterPerformance.slice(0, 10)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="PM Performance" loading={isLoading}>
              {!data?.pmPerformance?.length ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.pmPerformance.slice(0, 10)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#EF4444" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* DISTRIBUTION TAB */}
        <TabsContent value="distribution" className="space-y-4 animate-fade-in">
          <ChartCard title="Brand Distribution" loading={isLoading}>
            {!data?.brandDistribution?.length ? <EmptyChart /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.brandDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="count" nameKey="brand">
                      {data.brandDistribution.map((entry) => (
                        <Cell key={entry.brand} fill={getBrandColor(entry.brand)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatNumber(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.brandDistribution.map((d) => {
                    const total = data.brandDistribution.reduce((s, x) => s + x.count, 0);
                    const pct = total ? ((d.count / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.brand} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: getBrandColor(d.brand) }} />
                        <span className="font-medium flex-1">{d.brand}</span>
                        <span className="text-muted-foreground text-xs">{pct}%</span>
                        <span className="font-semibold">{formatNumber(d.count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ChartCard>

          {data?.growthPercent !== undefined && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground text-sm">Growth Rate</p>
                <p className={`text-4xl font-bold mt-2 ${data.growthPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {data.growthPercent >= 0 ? "+" : ""}{data.growthPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">vs previous period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RANKINGS TAB */}
        <TabsContent value="rankings" className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 10 Promotor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top 10 Promotor</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48 w-full" /> : !data?.top10Promotor?.length ? <EmptyChart /> : (
                  <div className="space-y-2">
                    {data.top10Promotor.slice(0, 10).map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? "bg-yellow-400 text-yellow-900" : idx === 1 ? "bg-gray-300 text-gray-700" : idx === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="font-semibold">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 10 BTS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top 10 BTS</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48 w-full" /> : !data?.top10BTS?.length ? <EmptyChart /> : (
                  <div className="space-y-2">
                    {data.top10BTS.slice(0, 10).map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? "bg-yellow-400 text-yellow-900" : idx === 1 ? "bg-gray-300 text-gray-700" : idx === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                          {idx + 1}
                        </span>
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="font-semibold">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Kabupaten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top Kabupaten</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48 w-full" /> : !data?.topKabupaten?.length ? <EmptyChart /> : (
                  <div className="space-y-2">
                    {data.topKabupaten.slice(0, 10).map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{idx + 1}.</span>
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.percent.toFixed(1)}%</span>
                        <span className="font-semibold">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Cluster */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top Cluster</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48 w-full" /> : !data?.topCluster?.length ? <EmptyChart /> : (
                  <div className="space-y-2">
                    {data.topCluster.slice(0, 10).map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-xs text-muted-foreground text-right shrink-0">{idx + 1}.</span>
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.percent.toFixed(1)}%</span>
                        <span className="font-semibold">{formatNumber(item.count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TOWER TARGET TAB */}
        <TabsContent value="tower" className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🎯 Analisa Target Tower
                <span className="text-xs font-normal text-muted-foreground">
                  Target = Qty SP Seeding × 3
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <TowerAnalysis
                btsData={btsData}
                transactions={transactions}
                loading={btsLoading || txLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
