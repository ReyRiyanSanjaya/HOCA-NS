"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw, TrendingUp, Activity, Radio, CheckCircle2,
  ArrowUpRight, BarChart3, Map, PlusCircle, Target,
  Users, Clock, Zap, AlertTriangle, CalendarDays,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }       from "@/components/layout/page-container";
import { GlobalFilter }        from "@/components/dashboard/global-filter";
import { KPICards }            from "@/components/dashboard/kpi-cards";
import { BrandDistribution }   from "@/components/dashboard/brand-distribution";
import { RecentActivity }      from "@/components/dashboard/recent-activity";
import { TowerTargetSummary }  from "@/components/dashboard/tower-target-summary";
import { TopPerformers }       from "@/components/dashboard/top-performers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton }            from "@/components/ui/skeleton";
import { Badge }               from "@/components/ui/badge";
import { Progress }            from "@/components/ui/progress";
import { useDashboard, useAnalytics, useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }        from "@/hooks/use-master-data";
import { useFilterStore }      from "@/stores/filter-store";
import { CACHE_KEYS }          from "@/lib/config";
import { formatNumber, formatPercent, getBrandColor, cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Small reusable card ──────────────────────────────────────────────────
function SectionCard({
  title, subtitle, icon: Icon, iconGradient = "gradient-blue", children, action, loading,
}: {
  title: string; subtitle?: string; icon: React.ElementType;
  iconGradient?: string; children: React.ReactNode;
  action?: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shadow-md", iconGradient)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4">
        {loading ? <Skeleton className="h-40 w-full rounded-xl" /> : children}
      </div>
    </div>
  );
}

// ─── Quick link button ────────────────────────────────────────────────────
function QuickLink({ href, label, icon: Icon, gradient, badge }: {
  href: string; label: string; icon: React.ElementType;
  gradient: string; badge?: string;
}) {
  return (
    <Link href={href} className={cn(
      "flex flex-col items-center gap-2 rounded-2xl p-3.5",
      "border border-border/60 bg-card",
      "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]",
      "relative overflow-hidden group"
    )}>
      <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg", gradient)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function HomePage() {
  const { filter }  = useFilterStore();
  const queryClient = useQueryClient();

  const { data: kpi,          isLoading: kpiLoading  }  = useDashboard(filter);
  const { data: analytics,    isLoading: analyticsLoading } = useAnalytics(filter);
  const { data: transactions, isLoading: txLoading }    = useTransactions(filter);
  const { data: btsData,      isLoading: btsLoading }   = useMasterBTS();

  const loading = kpiLoading || analyticsLoading || txLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.dashboard] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.analytics] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] });
  };

  // ── Daily trend for the last 14 days from analytics ──────────────────
  const dailyTrend = useMemo(() => analytics?.dailyTrend?.slice(-14) ?? [], [analytics]);

  // ── Weekday distribution ──────────────────────────────────────────────
  const weekdayData = useMemo(() => analytics?.weekdayActivation ?? [], [analytics]);

  // ── Today date formatted ─────────────────────────────────────────────
  const todayStr = useMemo(() =>
    new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  , []);

  // ── Pending tower warning: count towers with no activations ──────────
  const warningCount = kpi ? kpi.pendingBTS : 0;

  return (
    <PageContainer>
      {/* ══ HEADER ════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
            {warningCount > 0 && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30 border gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {warningCount} pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" />
            {todayStr} · AXIS · XL · Smartfren Seeding Ops
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium",
            "bg-card border border-border/60 hover:bg-muted/50 shadow-sm hover:shadow",
            "transition-all duration-200 active:scale-95"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ══ GLOBAL FILTER ══════════════════════════════════════════════ */}
      <GlobalFilter />

      {/* ══ KPI CARDS ══════════════════════════════════════════════════ */}
      <KPICards data={kpi} loading={kpiLoading} />

      {/* ══ QUICK LINKS ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-5">
        <QuickLink href="/input"          label="Input Aktivasi"  icon={PlusCircle}  gradient="gradient-green" />
        <QuickLink href="/tower-analysis" label="Target Tower"    icon={Target}      gradient="gradient-blue"  />
        <QuickLink href="/map"            label="Peta BTS"        icon={Map}         gradient="gradient-purple"/>
        <QuickLink href="/analytics"      label="Analitik"        icon={BarChart3}   gradient="gradient-orange"/>
        <QuickLink href="/report"         label="Laporan"         icon={Activity}    gradient="gradient-slate" />
      </div>

      {/* ══ ROW 1: Daily Trend + Brand Distribution ════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Daily Trend */}
        <SectionCard
          title="Tren Aktivasi Harian"
          subtitle="14 hari terakhir"
          icon={TrendingUp}
          iconGradient="gradient-blue"
          loading={analyticsLoading}
          action={
            <Link href="/analytics" className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5 transition-colors">
              Detail <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {dailyTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Belum ada data tren</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.substring(5)} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: 11 }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(v) => [formatNumber(Number(v)), "Aktivasi"]}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#dashGrad)" dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Brand Distribution */}
        <BrandDistribution data={kpi?.brandDistribution} loading={kpiLoading} />
      </div>

      {/* ══ ROW 2: Target Tower Summary + Top Promotor + Top BTS ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Target Tower Summary */}
        <SectionCard
          title="Target Tower"
          subtitle={`Qty SP × ${3} = target`}
          icon={Target}
          iconGradient="gradient-indigo"
          loading={btsLoading || txLoading}
        >
          <TowerTargetSummary
            btsData={btsData}
            transactions={transactions}
            loading={false}
          />
        </SectionCard>

        {/* Top Promotor */}
        <SectionCard
          title="Top Promotor"
          subtitle="Bulan ini"
          icon={Users}
          iconGradient="gradient-green"
          loading={analyticsLoading}
          action={
            <Link href="/analytics" className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
              Semua <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <TopPerformers
            data={analytics?.top10Promotor}
            loading={false}
            title="Top Promotor"
            limit={5}
            colorClass="bg-green-500"
          />
        </SectionCard>

        {/* Top BTS */}
        <SectionCard
          title="Top Tower"
          subtitle="Aktivasi terbanyak"
          icon={Radio}
          iconGradient="gradient-purple"
          loading={analyticsLoading}
          action={
            <Link href="/analytics" className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
              Semua <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <TopPerformers
            data={analytics?.top10BTS}
            loading={false}
            title="Top BTS"
            limit={5}
            colorClass="bg-purple-500"
          />
        </SectionCard>
      </div>

      {/* ══ ROW 3: Weekday chart + Activation stats + Recent Activity ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Weekday Activation */}
        <SectionCard
          title="Aktivasi per Hari"
          subtitle="Pola aktivitas mingguan"
          icon={CalendarDays}
          iconGradient="gradient-amber"
          loading={analyticsLoading}
        >
          {weekdayData.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground text-xs">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weekdayData} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: 11 }}
                  formatter={(v) => [formatNumber(Number(v)), "Aktivasi"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {weekdayData.map((d, i) => (
                    <Cell key={d.day} fill={i === 0 || i === 6 ? "#94a3b8" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Performance Stats */}
        <SectionCard
          title="Statistik Performa"
          subtitle="Ringkasan keseluruhan"
          icon={Zap}
          iconGradient="gradient-cyan"
          loading={kpiLoading}
        >
          {!kpi ? (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Aktivasi Hari Ini",   value: kpi.todayActivation,            pct: null,  color: "text-green-600" },
                { label: "Aktivasi Minggu Ini", value: kpi.weeklyActivation,           pct: null,  color: "text-blue-600" },
                { label: "Aktivasi Bulan Ini",  value: kpi.monthlyActivation,          pct: null,  color: "text-purple-600" },
                { label: "BTS Teraktivasi",     value: `${kpi.activatedBTS}/${kpi.totalBTS}`, pct: kpi.activationPercent, color: "text-teal-600" },
                { label: "Promotor Aktif",      value: `${kpi.activePromotor}/${kpi.totalPromotor}`, pct: kpi.totalPromotor > 0 ? (kpi.activePromotor / kpi.totalPromotor) * 100 : 0, color: "text-orange-600" },
                { label: "Rata-rata / BTS",     value: kpi.avgActivationPerBTS.toFixed(1), pct: null, color: "text-foreground" },
              ].map(({ label, value, pct, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <span className={cn("text-xs font-bold tabular-nums", color)}>
                      {typeof value === "number" ? formatNumber(value) : value}
                    </span>
                  </div>
                  {pct !== null && (
                    <Progress value={Math.min(pct, 100)} className="h-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Aktivitas Terbaru"
          subtitle="Real-time feed"
          icon={Clock}
          iconGradient="gradient-rose"
          loading={txLoading}
          action={
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-green-600 font-semibold">Live</span>
            </span>
          }
        >
          <RecentActivity transactions={transactions} loading={false} limit={6} />
        </SectionCard>
      </div>

      {/* ══ ROW 4: Growth + SPV Performance + Kabupaten ═══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Growth Rate Card */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl gradient-teal flex items-center justify-center shadow-md">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Growth Rate</p>
              <p className="text-[10px] text-muted-foreground">vs periode sebelumnya</p>
            </div>
          </div>
          {analyticsLoading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : (
            <div className="text-center py-2">
              <p className={cn(
                "text-5xl font-black",
                (analytics?.growthPercent ?? 0) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {(analytics?.growthPercent ?? 0) >= 0 ? "+" : ""}
                {(analytics?.growthPercent ?? 0).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {(analytics?.growthPercent ?? 0) >= 0
                  ? "Tren positif — pertahankan momentum"
                  : "Perlu dorongan — tingkatkan aktivasi"}
              </p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-border/40">
            {[
              { label: "Hari Ini", value: kpi?.todayActivation ?? 0 },
              { label: "Minggu",   value: kpi?.weeklyActivation ?? 0 },
              { label: "Bulan",    value: kpi?.monthlyActivation ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-bold">{formatNumber(value)}</p>
                <p className="text-[9px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top SPV */}
        <SectionCard
          title="Top SPV"
          subtitle="Berdasarkan total aktivasi"
          icon={Users}
          iconGradient="gradient-fuchsia"
          loading={analyticsLoading}
        >
          <TopPerformers
            data={analytics?.supervisorPerformance}
            loading={false}
            title="Top SPV"
            limit={5}
            colorClass="bg-fuchsia-500"
          />
        </SectionCard>

        {/* Top Kabupaten */}
        <SectionCard
          title="Top Kabupaten"
          subtitle="Aktivasi tertinggi"
          icon={CheckCircle2}
          iconGradient="gradient-orange"
          loading={analyticsLoading}
        >
          <TopPerformers
            data={analytics?.topKabupaten}
            loading={false}
            title="Top Kabupaten"
            limit={5}
            colorClass="bg-orange-500"
          />
        </SectionCard>
      </div>

      {/* ══ FOOTER STAMP ═══════════════════════════════════════════════ */}
      <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-muted-foreground/50">
        <Zap className="h-3 w-3" />
        HCA NS Seeding Dashboard · Auto refresh setiap 30 detik
      </div>
    </PageContainer>
  );
}
