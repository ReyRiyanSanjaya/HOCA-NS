"use client";

import React, { useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Lightbulb, Award,
         BarChart3, Users, MapPin, Clock, Zap, Target, Activity,
         ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }   from "@/components/layout/page-container";
import { GlobalFilter }    from "@/components/dashboard/global-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }          from "@/components/ui/button";
import { Skeleton }        from "@/components/ui/skeleton";
import { Badge }           from "@/components/ui/badge";
import { Progress }        from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalytics, useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }    from "@/hooks/use-master-data";
import { useFilterStore }  from "@/stores/filter-store";
import { CACHE_KEYS }      from "@/lib/config";
import { getBrandColor, formatNumber, cn } from "@/lib/utils";
import { TowerAnalysis }   from "@/components/analytics/tower-analysis";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Scatter, ReferenceLine,
} from "recharts";

// ─── palette ────────────────────────────────────────────────────────────────
const P = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316"];
const tooltipStyle = {
  background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: 12, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,.12)",
};

// ─── shared helpers ──────────────────────────────────────────────────────────
function pctBadge(pct: number) {
  if (pct > 0)  return <span className="text-green-500 flex items-center gap-0.5 text-[10px] font-semibold"><TrendingUp className="h-3 w-3"/>+{pct.toFixed(1)}%</span>;
  if (pct < 0)  return <span className="text-red-500 flex items-center gap-0.5 text-[10px] font-semibold"><TrendingDown className="h-3 w-3"/>{pct.toFixed(1)}%</span>;
  return <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]"><Minus className="h-3 w-3"/>0%</span>;
}

function SectionCard({ title, subtitle, icon: Icon, color = "#3b82f6", children, loading, action }:
  { title:string; subtitle?:string; icon:React.ElementType; color?:string;
    children:React.ReactNode; loading?:boolean; action?:React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: `${color}22` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4">
        {loading ? <Skeleton className="h-48 w-full rounded-xl" /> : children}
      </div>
    </div>
  );
}

function Empty({ h = 200 }: { h?: number }) {
  return (
    <div className={`flex items-center justify-center text-muted-foreground text-xs`} style={{ height: h }}>
      Belum ada data
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, color, title, body, variant = "default" }:
  { icon: React.ElementType; color: string; title: string; body: string; variant?: "default"|"warn"|"success" }) {
  const bg = variant === "warn" ? "bg-amber-500/8 border-amber-500/25" : variant === "success" ? "bg-green-500/8 border-green-500/25" : "bg-blue-500/8 border-blue-500/25";
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 flex items-start gap-2.5", bg)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────
const MEDAL_CLS = ["bg-yellow-400 text-yellow-900","bg-slate-300 text-slate-700","bg-amber-600 text-white"];
function LeaderRow({ item, idx, max, color }: { item:{name:string;count:number;percent:number}; idx:number; max:number; color:string }) {
  const bar = max > 0 ? (item.count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5 group">
      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        idx < 3 ? MEDAL_CLS[idx] : "bg-muted text-muted-foreground")}>
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium truncate">{item.name}</span>
          <span className="text-xs font-bold tabular-nums ml-2 shrink-0">{formatNumber(item.count)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${bar}%`, background: color }} />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0">{item.percent.toFixed(1)}%</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { filter }  = useFilterStore();
  const qc          = useQueryClient();
  const { data, isLoading }                           = useAnalytics(filter);
  const { data: btsData,      isLoading: btsLoading } = useMasterBTS();
  const { data: transactions, isLoading: txLoading }  = useTransactions(filter);
  const [peekInsights, setPeekInsights]               = useState(true);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: [CACHE_KEYS.analytics] });
    qc.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] });
    qc.invalidateQueries({ queryKey: [CACHE_KEYS.masterBTS] });
  };

  // ── derived metrics ───────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!data) return [];
    const list: { icon: React.ElementType; color: string; title: string; body: string; variant: "default"|"warn"|"success" }[] = [];

    // Peak hour
    const peak = [...(data.hourlyActivation || [])].sort((a,b)=>b.count-a.count)[0];
    if (peak) list.push({ icon: Clock, color:"#f59e0b", variant:"default",
      title:`Jam Puncak: ${peak.hour}:00`, body:`Aktivasi terbanyak terjadi jam ${peak.hour}:00–${peak.hour+1}:00 (${formatNumber(peak.count)} aktivasi). Optimalkan jadwal promotor di jam ini.` });

    // Best weekday
    const bestDay = [...(data.weekdayActivation||[])].sort((a,b)=>b.count-a.count)[0];
    if (bestDay) list.push({ icon: Zap, color:"#3b82f6", variant:"default",
      title:`Hari Terbaik: ${bestDay.day}`, body:`${bestDay.day} adalah hari dengan aktivasi tertinggi (${formatNumber(bestDay.count)}). Rencanakan kampanye intensif di hari ini.` });

    // Growth
    if (data.growthPercent > 10) list.push({ icon: TrendingUp, color:"#22c55e", variant:"success",
      title:`Growth +${data.growthPercent.toFixed(1)}%`, body:`Tren positif kuat. Pertahankan strategi saat ini dan pertimbangkan ekspansi ke kabupaten baru.` });
    else if (data.growthPercent < -5) list.push({ icon: TrendingDown, color:"#ef4444", variant:"warn",
      title:`Growth ${data.growthPercent.toFixed(1)}%`, body:`Aktivasi menurun. Tinjau kinerja promotor dan identifikasi tower yang stagnant untuk tindakan segera.` });

    // Top promotor concentration
    const topPromo = data.top10Promotor?.[0];
    const totalAct = data.promotorPerformance?.reduce((s,x)=>s+x.count,0) || 1;
    if (topPromo && topPromo.count/totalAct > 0.2) list.push({ icon: Users, color:"#8b5cf6", variant:"warn",
      title:`Ketergantungan Promotor`, body:`${topPromo.name} menyumbang ${((topPromo.count/totalAct)*100).toFixed(0)}% total aktivasi. Pastikan ada promotor cadangan.` });

    // Dominant brand
    const brands = data.brandDistribution || [];
    const brandTotal = brands.reduce((s,x)=>s+x.count,0);
    const domBrand = brands[0];
    if (domBrand && brands.length > 1 && domBrand.count/brandTotal > 0.6) list.push({ icon: BarChart3, color:"#ec4899", variant:"warn",
      title:`Dominasi ${domBrand.brand}`, body:`${domBrand.brand} mendominasi ${((domBrand.count/brandTotal)*100).toFixed(0)}% aktivasi. Pertimbangkan strategi untuk brand lain agar lebih seimbang.` });

    // Top kabupaten idle
    const kabIdle = data.kabupatenPerformance?.slice(5);
    if (kabIdle?.length) list.push({ icon: MapPin, color:"#06b6d4", variant:"default",
      title:`${kabIdle.length} Kabupaten Perlu Perhatian`, body:`Kabupaten selain top 5 berkontribusi relatif kecil. Pertimbangkan alokasi promotor ke area ini.` });

    return list.slice(0, 5);
  }, [data]);

  // KPI summary row
  const kpiRow = useMemo(() => {
    if (!data) return [];
    const total = data.dailyTrend?.reduce((s,x)=>s+x.count,0) || 0;
    const avgDaily = data.dailyTrend?.length ? (total / data.dailyTrend.length) : 0;
    return [
      { label:"Total Aktivasi",   value: formatNumber(total),              icon: Activity,   color:"#3b82f6" },
      { label:"Rata-rata Harian", value: avgDaily.toFixed(1),              icon: BarChart3,  color:"#10b981" },
      { label:"Growth Rate",      value: `${data.growthPercent>=0?"+":""}${data.growthPercent.toFixed(1)}%`, icon: TrendingUp, color: data.growthPercent>=0?"#22c55e":"#ef4444" },
      { label:"Top Promotor",     value: data.top10Promotor?.[0]?.name?.split(" ")[0] || "—", icon: Award,  color:"#f59e0b" },
      { label:"Brand Utama",      value: data.brandDistribution?.[0]?.brand || "—",    icon: Zap,        color:"#8b5cf6" },
    ];
  }, [data]);

  // Daily + moving avg combined data
  const trendCombined = useMemo(() => {
    const daily = data?.dailyTrend || [];
    const ma    = data?.movingAverage || [];
    const maMap: Record<string,number> = {};
    ma.forEach(d => { maMap[d.date] = d.count; });
    return daily.map(d => ({ ...d, ma: maMap[d.date] ?? null }));
  }, [data]);

  return (
    <PageContainer>
      {/* ── header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time performance insights & decision support</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-1.5 text-xs shrink-0">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <GlobalFilter />

      {/* ── KPI summary strip ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
          {Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
          {kpiRow.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col gap-1.5 hover:shadow-md transition-all">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background:`${color}18` }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <p className="text-base font-black leading-tight tabular-nums truncate" style={{ color }}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Insights panel ───────────────────────────────────────────── */}
      {!isLoading && insights.length > 0 && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 mb-5 overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-blue-500/8 transition-colors"
            onClick={() => setPeekInsights(v=>!v)}
          >
            <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex-1 text-left">
              {insights.length} Smart Insights
            </span>
            <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-0 mr-1">{insights.length}</Badge>
            {peekInsights ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {peekInsights && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-fade-up">
              {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5 h-auto rounded-2xl p-1">
          <TabsTrigger value="trends"      className="text-xs py-2 rounded-xl gap-1"><TrendingUp className="h-3 w-3"/>Tren</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs py-2 rounded-xl gap-1"><Users className="h-3 w-3"/>Performa</TabsTrigger>
          <TabsTrigger value="distribution"className="text-xs py-2 rounded-xl gap-1"><BarChart3 className="h-3 w-3"/>Distribusi</TabsTrigger>
          <TabsTrigger value="rankings"    className="text-xs py-2 rounded-xl gap-1"><Award className="h-3 w-3"/>Ranking</TabsTrigger>
          <TabsTrigger value="tower"       className="text-xs py-2 rounded-xl gap-1"><Target className="h-3 w-3"/>Tower</TabsTrigger>
        </TabsList>

        {/* ════════════════ TRENDS TAB ════════════════ */}
        <TabsContent value="trends" className="space-y-4 animate-fade-in">

          {/* Daily + Moving avg */}
          <SectionCard title="Tren Aktivasi Harian" subtitle="Area chart + moving average 3-hari"
            icon={TrendingUp} color="#3b82f6" loading={isLoading}>
            {!trendCombined.length ? <Empty /> : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trendCombined} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <defs>
                      <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:9}} axisLine={false} tickLine={false}
                      tickFormatter={(v:string)=>v.substring(5)}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{fontWeight:600}}
                      formatter={(v,name)=>[formatNumber(Number(v)), name==="count"?"Aktivasi":"Moving Avg"]}/>
                    <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={8}/>
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#areaG)"
                      name="Aktivasi" dot={false} activeDot={{r:4}}/>
                    <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={1.5}
                      strokeDasharray="5 4" name="Moving Avg" dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
                {/* inline insight */}
                {data && trendCombined.length >= 2 && (() => {
                  const last = trendCombined.at(-1)!; const prev = trendCombined.at(-2)!;
                  const diff = last.count - prev.count;
                  return (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Kemarin: <b>{formatNumber(last.count)}</b></span>
                      <span>·</span>
                      {pctBadge(prev.count > 0 ? (diff/prev.count)*100 : 0)}
                      <span>vs hari sebelumnya</span>
                    </div>
                  );
                })()}
              </>
            )}
          </SectionCard>

          {/* Weekly + Monthly side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Tren Mingguan" subtitle="Agregasi per minggu"
              icon={BarChart3} color="#10b981" loading={isLoading}>
              {!data?.weeklyTrend?.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.weeklyTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="week" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Bar dataKey="count" fill="#10b981" radius={[6,6,0,0]} name="Aktivasi"/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Tren Bulanan" subtitle="Agregasi per bulan"
              icon={TrendingUp} color="#8b5cf6" loading={isLoading}>
              {!data?.monthlyTrend?.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.monthlyTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5}
                      dot={{r:4,fill:"#8b5cf6",strokeWidth:0}} activeDot={{r:6}} name="Aktivasi"/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* Hourly + Weekday */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Pola Jam Aktivasi" subtitle="Identifikasi jam puncak"
              icon={Clock} color="#f59e0b" loading={isLoading}>
              {!data?.hourlyActivation?.length ? <Empty h={200}/> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.hourlyActivation} margin={{top:4,right:4,left:-28,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                      <XAxis dataKey="hour" tick={{fontSize:9}} axisLine={false} tickLine={false}
                        tickFormatter={(v)=>`${v}h`}/>
                      <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={v=>`${v}:00–${Number(v)+1}:00`}
                        formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Aktivasi">
                        {data.hourlyActivation.map((d,i)=>{
                          const max = Math.max(...data.hourlyActivation.map(x=>x.count));
                          return <Cell key={i} fill={d.count===max?"#f59e0b":d.count>max*0.5?"#fbbf24":"#fde68a"}/>;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Warna makin gelap = makin tinggi aktivasi
                  </p>
                </>
              )}
            </SectionCard>

            <SectionCard title="Pola Hari Dalam Seminggu" subtitle="Distribusi aktivasi per hari"
              icon={Activity} color="#ec4899" loading={isLoading}>
              {!data?.weekdayActivation?.length ? <Empty h={200}/> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.weekdayActivation} margin={{top:4,right:4,left:-28,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                      <XAxis dataKey="day" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Aktivasi">
                        {data.weekdayActivation.map((d,i)=>{
                          const isWknd = d.day==="Sun"||d.day==="Sat";
                          return <Cell key={i} fill={isWknd?"#94a3b8":"#ec4899"}/>;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Abu-abu = hari libur</p>
                </>
              )}
            </SectionCard>
          </div>

          {/* Growth rate card */}
          {data && (
            <div className="rounded-2xl border p-5 bg-card flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center sm:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overall Growth Rate</p>
                <p className={cn("text-6xl font-black", data.growthPercent>=0?"text-green-500":"text-red-500")}>
                  {data.growthPercent>=0?"+":""}{data.growthPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">dibandingkan periode sebelumnya</p>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label:"Total Hari Aktif", value: data.dailyTrend?.filter(d=>d.count>0).length ?? 0 },
                  { label:"Maks Harian",      value: Math.max(...(data.dailyTrend?.map(d=>d.count)??[0])) },
                  { label:"Total Mingguan",   value: data.weeklyTrend?.length ?? 0, suffix:" minggu" },
                ].map(({label,value,suffix=""})=>(
                  <div key={label} className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold">{formatNumber(value)}{suffix}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════════════ PERFORMANCE TAB ════════════════ */}
        <TabsContent value="performance" className="space-y-4 animate-fade-in">

          {/* SPV Performance */}
          <SectionCard title="Performa Supervisor (SPV)" subtitle="Total aktivasi per SPV"
            icon={Users} color="#3b82f6" loading={isLoading}>
            {!data?.supervisorPerformance?.length ? <Empty/> : (
              <div className="space-y-2.5">
                {data.supervisorPerformance.map((item, idx) => (
                  <LeaderRow key={item.name} item={item} idx={idx}
                    max={data.supervisorPerformance[0].count} color="#3b82f6" />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Promotor Performance */}
          <SectionCard title="Performa Promotor" subtitle="Top 15 promotor berdasarkan aktivasi"
            icon={Award} color="#10b981" loading={isLoading}>
            {!data?.promotorPerformance?.length ? <Empty/> : (
              <>
                <div className="space-y-2.5 mb-4">
                  {data.promotorPerformance.slice(0,15).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx}
                      max={data.promotorPerformance[0].count} color="#10b981"/>
                  ))}
                </div>
                <div className="pt-3 border-t border-border/40 grid grid-cols-3 gap-3">
                  {[
                    { label:"Total Promotor", value: data.promotorPerformance.length },
                    { label:"Avg / Promotor", value: data.promotorPerformance.length>0
                      ? (data.promotorPerformance.reduce((s,x)=>s+x.count,0)/data.promotorPerformance.length).toFixed(1) : 0 },
                    { label:"Top Kontribusi", value: data.promotorPerformance[0]
                      ? `${data.promotorPerformance[0].percent.toFixed(0)}%` : "—" },
                  ].map(({label,value})=>(
                    <div key={label} className="text-center rounded-xl bg-muted/40 px-2 py-2">
                      <p className="text-sm font-bold">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* Kabupaten + Cluster + PM grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key:"kabupatenPerformance", title:"Kabupaten", color:"#f59e0b" },
              { key:"clusterPerformance",   title:"Cluster",   color:"#8b5cf6" },
              { key:"pmPerformance",        title:"PM",        color:"#ef4444" },
            ].map(({key,title,color})=>{
              const items = (data?.[key as keyof typeof data] as {name:string;count:number;percent:number}[]|undefined)?.slice(0,8)||[];
              return (
                <SectionCard key={key} title={`Top ${title}`} subtitle="Berdasarkan aktivasi"
                  icon={MapPin} color={color} loading={isLoading}>
                  {!items.length ? <Empty h={160}/> : (
                    <div className="space-y-2">
                      {items.map((item,idx)=>(
                        <LeaderRow key={item.name} item={item} idx={idx}
                          max={items[0].count} color={color}/>
                      ))}
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>

          {/* Horizontal bar: all SPV at a glance */}
          {!isLoading && !!data?.supervisorPerformance?.length && (
            <SectionCard title="SPV Comparison Chart" subtitle="Perbandingan visual semua SPV"
              icon={BarChart3} color="#6366f1" loading={isLoading}>
              <ResponsiveContainer width="100%" height={Math.max(180, data.supervisorPerformance.length * 38)}>
                <BarChart data={data.supervisorPerformance} layout="vertical"
                  margin={{top:4,right:40,left:4,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={95} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                  <Bar dataKey="count" radius={[0,6,6,0]} name="Aktivasi" label={{position:"right",fontSize:10,fill:"hsl(var(--muted-foreground))"}}>
                    {data.supervisorPerformance.map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}
        </TabsContent>

        {/* ════════════════ DISTRIBUTION TAB ════════════════ */}
        <TabsContent value="distribution" className="space-y-4 animate-fade-in">

          {/* Brand pie + detail */}
          <SectionCard title="Distribusi Brand" subtitle="Share aktivasi per brand"
            icon={BarChart3} color="#ec4899" loading={isLoading}>
            {!data?.brandDistribution?.length ? <Empty/> : (() => {
              const total = data.brandDistribution.reduce((s,x)=>s+x.count,0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data.brandDistribution} cx="50%" cy="50%"
                        innerRadius={65} outerRadius={100} paddingAngle={4}
                        dataKey="count" nameKey="brand">
                        {data.brandDistribution.map(e=>(
                          <Cell key={e.brand} fill={getBrandColor(e.brand)}/>
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v)=>[`${formatNumber(Number(v))} (${((Number(v)/total)*100).toFixed(1)}%)`,""]}/>
                      <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={8}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {data.brandDistribution.map(d=>{
                      const pct = total ? (d.count/total)*100 : 0;
                      return (
                        <div key={d.brand}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full shrink-0" style={{background:getBrandColor(d.brand)}}/>
                              <span className="text-sm font-semibold">{d.brand}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                              <span className="text-sm font-bold">{formatNumber(d.count)}</span>
                            </div>
                          </div>
                          <Progress value={pct} className="h-2" style={{"--tw-bg-opacity":"1"} as React.CSSProperties}/>
                        </div>
                      );
                    })}
                    {/* Dominance insight inline */}
                    {(() => {
                      const dom = data.brandDistribution[0];
                      if (!dom) return null;
                      const domPct = (dom.count/total)*100;
                      return (
                        <div className="rounded-xl bg-muted/40 px-3 py-2 mt-2">
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{dom.brand}</span> mendominasi dengan{" "}
                            <span className="font-semibold text-foreground">{domPct.toFixed(0)}%</span> share.{" "}
                            {domPct > 60 ? "Pertimbangkan pemerataan ke brand lain." : "Distribusi cukup seimbang."}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* Brand over time (stacked area) - using daily trend per brand from transactions */}
          {!isLoading && !!data?.promotorPerformance?.length && (
            <SectionCard title="Kabupaten vs Cluster Matrix" subtitle="Kontribusi per area"
              icon={MapPin} color="#06b6d4" loading={false}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.kabupatenPerformance?.slice(0,8)||[]}
                  margin={{top:4,right:4,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                  <Bar dataKey="count" radius={[6,6,0,0]} name="Aktivasi">
                    {(data.kabupatenPerformance||[]).slice(0,8).map((_,i)=>(
                      <Cell key={i} fill={P[i%P.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Growth detail */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 rounded-2xl border bg-card p-5 flex flex-col items-center justify-center gap-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Growth Rate</div>
                <div className={cn("text-5xl font-black",data.growthPercent>=0?"text-green-500":"text-red-500")}>
                  {data.growthPercent>=0?"+":""}{data.growthPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground text-center">vs periode sebelumnya (first half vs second half)</div>
                <div className="mt-2 flex items-center gap-1.5">
                  {data.growthPercent>=0 ? <TrendingUp className="h-4 w-4 text-green-500"/> : <TrendingDown className="h-4 w-4 text-red-500"/>}
                  <span className="text-xs font-medium">{data.growthPercent>=0?"Momentum positif":"Perlu perhatian"}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <SectionCard title="PM Performance Chart" subtitle="Kontribusi per PM"
                  icon={Users} color="#f97316" loading={isLoading}>
                  {!data.pmPerformance?.length ? <Empty h={160}/> : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={data.pmPerformance.slice(0,8)} layout="vertical"
                        margin={{top:0,right:40,left:4,bottom:0}}>
                        <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={80} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                        <Bar dataKey="count" radius={[0,5,5,0]} name="Aktivasi"
                          label={{position:"right",fontSize:9,fill:"hsl(var(--muted-foreground))"}}>
                          {(data.pmPerformance||[]).slice(0,8).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ════════════════ RANKINGS TAB ════════════════ */}
        <TabsContent value="rankings" className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Top 10 Promotor */}
            <SectionCard title="Top 10 Promotor" subtitle="Berdasarkan total aktivasi"
              icon={Award} color="#10b981" loading={isLoading}>
              {!data?.top10Promotor?.length ? <Empty h={200}/> : (
                <div className="space-y-2.5">
                  {data.top10Promotor.slice(0,10).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx}
                      max={data.top10Promotor[0].count} color="#10b981"/>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Top 10 BTS */}
            <SectionCard title="Top 10 Tower (BTS)" subtitle="Berdasarkan total aktivasi"
              icon={BarChart3} color="#8b5cf6" loading={isLoading}>
              {!data?.top10BTS?.length ? <Empty h={200}/> : (
                <div className="space-y-2.5">
                  {data.top10BTS.slice(0,10).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx}
                      max={data.top10BTS[0].count} color="#8b5cf6"/>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Top Kabupaten */}
            <SectionCard title="Top Kabupaten" subtitle="Area dengan aktivasi tertinggi"
              icon={MapPin} color="#f59e0b" loading={isLoading}>
              {!data?.topKabupaten?.length ? <Empty h={200}/> : (
                <>
                  <div className="space-y-2.5">
                    {data.topKabupaten.slice(0,10).map((item,idx)=>(
                      <LeaderRow key={item.name} item={item} idx={idx}
                        max={data.topKabupaten[0].count} color="#f59e0b"/>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={data.topKabupaten.slice(0,6)} margin={{top:0,right:0,left:-30,bottom:0}}>
                        <XAxis dataKey="name" tick={{fontSize:8}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:8}} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {data.topKabupaten.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Top Cluster */}
            <SectionCard title="Top Cluster" subtitle="Cluster dengan aktivasi tertinggi"
              icon={Zap} color="#06b6d4" loading={isLoading}>
              {!data?.topCluster?.length ? <Empty h={200}/> : (
                <>
                  <div className="space-y-2.5">
                    {data.topCluster.slice(0,10).map((item,idx)=>(
                      <LeaderRow key={item.name} item={item} idx={idx}
                        max={data.topCluster[0].count} color="#06b6d4"/>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={data.topCluster.slice(0,6)} margin={{top:0,right:0,left:-30,bottom:0}}>
                        <XAxis dataKey="name" tick={{fontSize:8}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:8}} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {data.topCluster.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          {/* Top PM full row */}
          {!isLoading && !!data?.topPM?.length && (
            <SectionCard title="Top PM (Project Manager)" subtitle="Ranking PM berdasarkan aktivasi di bawah koordinasi"
              icon={Users} color="#ec4899" loading={false}>
              <div className="space-y-2.5">
                {data.topPM.slice(0,10).map((item,idx)=>(
                  <LeaderRow key={item.name} item={item} idx={idx}
                    max={data.topPM[0].count} color="#ec4899"/>
                ))}
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* ════════════════ TOWER TARGET TAB ════════════════ */}
        <TabsContent value="tower" className="space-y-4 animate-fade-in">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{background:"#3b82f615"}}>
                  <Target className="h-4 w-4 text-blue-500"/>
                </div>
                <div>
                  <p className="text-sm font-semibold">Analisa Target Tower</p>
                  <p className="text-[10px] text-muted-foreground">Target = Qty SP Seeding × 3</p>
                </div>
              </div>
              <a href="/tower-analysis" className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5 transition-colors">
                Full Page <ArrowUpRight className="h-3 w-3"/>
              </a>
            </div>
            <div className="p-4">
              <TowerAnalysis btsData={btsData} transactions={transactions} loading={btsLoading||txLoading}/>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
