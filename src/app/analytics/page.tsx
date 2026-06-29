"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  RefreshCw, TrendingUp, TrendingDown, Minus, Lightbulb, Award,
  BarChart3, Users, MapPin, Clock, Zap, Activity, ChevronDown,
  ChevronUp, SlidersHorizontal, X, Filter,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }  from "@/components/layout/page-container";
import { GlobalFilter }   from "@/components/dashboard/global-filter";
import { Button }         from "@/components/ui/button";
import { Skeleton }       from "@/components/ui/skeleton";
import { Badge }          from "@/components/ui/badge";
import { Progress }       from "@/components/ui/progress";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalytics, useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }   from "@/hooks/use-master-data";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS, BRANDS } from "@/lib/config";
import { getBrandColor, formatNumber, cn } from "@/lib/utils";
import type { Transaction, MasterBTS } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart,
} from "recharts";

// ─── constants ───────────────────────────────────────────────────────────────
const P = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316","#14b8a6","#a855f7"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const tooltipStyle = {
  background:"hsl(var(--card))", border:"1px solid hsl(var(--border))",
  borderRadius:12, fontSize:12, boxShadow:"0 4px 20px rgba(0,0,0,.12)",
};

// ─── local filter state type ──────────────────────────────────────────────────
interface LocalFilter {
  dateFrom: string; dateTo: string;
  supervisor: string; cluster: string; kabupaten: string; brand: string; pm: string;
}
const initLocal: LocalFilter = { dateFrom:"", dateTo:"", supervisor:"", cluster:"", kabupaten:"", brand:"", pm:"" };

// ─── computed stats from raw transactions ────────────────────────────────────
interface PerfItem { name: string; count: number; percent: number; }
interface ComputedStats {
  total: number;
  dailyTrend: { date:string; count:number; ma:number|null }[];
  weeklyTrend: { week:string; count:number }[];
  monthlyTrend: { month:string; count:number }[];
  brandDist: { brand:string; count:number }[];
  supervisorPerf: PerfItem[];
  promotorPerf: PerfItem[];
  kabupatenPerf: PerfItem[];
  clusterPerf: PerfItem[];
  pmPerf: PerfItem[];
  btsPerf: PerfItem[];
  hourly: { hour:number; count:number }[];
  weekday: { day:string; count:number }[];
  growthPct: number;
}

function toList(map: Record<string,number>): PerfItem[] {
  const total = Object.values(map).reduce((s,v)=>s+v,0);
  return Object.entries(map)
    .map(([name,count])=>({ name, count, percent: total>0?(count/total)*100:0 }))
    .sort((a,b)=>b.count-a.count);
}

function computeStats(txs: Transaction[], btsMap: Record<string,MasterBTS>): ComputedStats {
  const daily:  Record<string,number> = {};
  const weekly: Record<string,number> = {};
  const monthly:Record<string,number> = {};
  const brandM: Record<string,number> = {};
  const spvM:   Record<string,number> = {};
  const promM:  Record<string,number> = {};
  const kabM:   Record<string,number> = {};
  const clM:    Record<string,number> = {};
  const pmM:    Record<string,number> = {};
  const btsM:   Record<string,number> = {};
  const hourM:  Record<number,number> = {};
  const wdM:    Record<number,number> = {};
  for (let h=0;h<24;h++) hourM[h]=0;
  for (let d=0;d<7;d++) wdM[d]=0;

  for (const tx of txs) {
    const date = tx.tanggal?.substring(0,10) || "";
    if (date) {
      daily[date] = (daily[date]||0)+1;
      const month = date.substring(0,7);
      monthly[month] = (monthly[month]||0)+1;
      // ISO week approx
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const jan4 = new Date(d.getFullYear(),0,4);
        const startOfWeek1 = new Date(jan4);
        startOfWeek1.setDate(jan4.getDate()-(jan4.getDay()||7)+1);
        const wkNum = Math.floor((d.getTime()-startOfWeek1.getTime())/(7*86400000))+1;
        const wk = `${d.getFullYear()}-W${String(wkNum).padStart(2,"0")}`;
        weekly[wk] = (weekly[wk]||0)+1;
        wdM[d.getDay()] = (wdM[d.getDay()]||0)+1;
      }
    }
    const h = parseInt((tx.jam||"00").substring(0,2))||0;
    hourM[Math.min(h,23)] = (hourM[Math.min(h,23)]||0)+1;

    const b = tx.brand || "Unknown";
    brandM[b] = (brandM[b]||0)+1;
    const spv = tx.supervisor || "—";
    spvM[spv] = (spvM[spv]||0)+1;
    const prom = tx.promotor || "—";
    promM[prom] = (promM[prom]||0)+1;
    const btsId = tx.idBTS || "—";
    btsM[btsId] = (btsM[btsId]||0)+1;

    const master = btsMap[tx.idBTS];
    if (master) {
      const kab = master.kabupaten || "—"; kabM[kab] = (kabM[kab]||0)+1;
      const cl  = master.cluster   || "—"; clM[cl]   = (clM[cl]||0)+1;
      const pm  = master.spm       || "—"; pmM[pm]   = (pmM[pm]||0)+1;
    }
  }

  const dailySorted = Object.keys(daily).sort().map(d=>({ date:d, count:daily[d] }));
  // 3-day moving average
  const maData = dailySorted.map((_,i,arr)=>{
    const s = Math.max(0,i-1), e = Math.min(arr.length-1,i+1);
    const sum = arr.slice(s,e+1).reduce((acc,v)=>acc+v.count,0);
    return { date:arr[i].date, count:arr[i].count, ma:Math.round(sum/(e-s+1)) };
  });

  // growth: first half vs second half
  const half = Math.floor(txs.length/2);
  const growthPct = half>0?((txs.length-half-half)/half)*100:0;

  return {
    total: txs.length,
    dailyTrend: maData,
    weeklyTrend: Object.keys(weekly).sort().map(w=>({ week:w, count:weekly[w] })),
    monthlyTrend: Object.keys(monthly).sort().map(m=>({ month:m, count:monthly[m] })),
    brandDist: Object.entries(brandM).map(([brand,count])=>({ brand, count })).sort((a,b)=>b.count-a.count),
    supervisorPerf: toList(spvM),
    promotorPerf:   toList(promM),
    kabupatenPerf:  toList(kabM),
    clusterPerf:    toList(clM),
    pmPerf:         toList(pmM),
    btsPerf:        toList(btsM),
    hourly: Array.from({length:24},(_,h)=>({ hour:h, count:hourM[h]||0 })),
    weekday: DAYS.map((day,i)=>({ day, count:wdM[i]||0 })),
    growthPct,
  };
}

// ─── shared UI helpers ────────────────────────────────────────────────────────
function pctBadge(pct: number) {
  if (pct>0)  return <span className="text-green-500 flex items-center gap-0.5 text-[10px] font-semibold"><TrendingUp className="h-3 w-3"/>+{pct.toFixed(1)}%</span>;
  if (pct<0)  return <span className="text-red-500 flex items-center gap-0.5 text-[10px] font-semibold"><TrendingDown className="h-3 w-3"/>{pct.toFixed(1)}%</span>;
  return <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]"><Minus className="h-3 w-3"/>0%</span>;
}

function SectionCard({ title, subtitle, icon:Icon, color="#3b82f6", children, loading, action }:
  { title:string; subtitle?:string; icon:React.ElementType; color?:string;
    children:React.ReactNode; loading?:boolean; action?:React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-sm" style={{background:`${color}20`}}>
            <Icon className="h-4 w-4" style={{color}}/>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4">
        {loading ? <Skeleton className="h-48 w-full rounded-xl"/> : children}
      </div>
    </div>
  );
}

function Empty({ h=200 }:{ h?:number }) {
  return <div style={{height:h}} className="flex items-center justify-center text-muted-foreground text-xs">Belum ada data</div>;
}

function InsightCard({ icon:Icon, color, title, body, variant="default" }:
  { icon:React.ElementType; color:string; title:string; body:string; variant?:"default"|"warn"|"success" }) {
  const bg = variant==="warn"?"bg-amber-500/8 border-amber-500/25":variant==="success"?"bg-green-500/8 border-green-500/25":"bg-blue-500/8 border-blue-500/25";
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 flex items-start gap-2.5",bg)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{color}}/>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

const MEDAL_CLS=["bg-yellow-400 text-yellow-900","bg-slate-300 text-slate-700","bg-amber-600 text-white"];
function LeaderRow({ item, idx, max, color }:{ item:PerfItem; idx:number; max:number; color:string }) {
  const bar = max>0?(item.count/max)*100:0;
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        idx<3?MEDAL_CLS[idx]:"bg-muted text-muted-foreground")}>{idx+1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium truncate">{item.name}</span>
          <span className="text-xs font-bold tabular-nums ml-2 shrink-0">{formatNumber(item.count)}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{width:`${bar}%`,background:color}}/>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0">{item.percent.toFixed(1)}%</span>
    </div>
  );
}

// ─── Breakdown Filter Panel ───────────────────────────────────────────────────
interface BreakdownFilterProps {
  local: LocalFilter;
  setLocal: (f: LocalFilter) => void;
  options: {
    supervisors: string[]; clusters: string[]; kabupatenList: string[]; pmList: string[];
  };
  totalMatched: number;
  totalAll: number;
}

function BreakdownFilter({ local, setLocal, options, totalMatched, totalAll }: BreakdownFilterProps) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof LocalFilter, v: string) => setLocal({ ...local, [k]: v });
  const reset = () => setLocal(initLocal);
  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm mb-5 overflow-hidden">
      <div className="flex items-center gap-2.5 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
          <Filter className="h-3.5 w-3.5"/>
          <span className="font-semibold text-foreground">Breakdown Filter</span>
          <span className="text-muted-foreground">— analisa lokal per dimensi</span>
          {activeCount>0 && (
            <Badge className="text-[9px] bg-blue-500/15 text-blue-600 border-0 ml-1">{activeCount} aktif</Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          <b className={totalMatched<totalAll?"text-blue-600":""}>{formatNumber(totalMatched)}</b>/{formatNumber(totalAll)} transaksi
        </span>
        <button onClick={()=>setOpen(v=>!v)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
            open||activeCount>0?"gradient-blue text-white shadow-md":"bg-muted/60 hover:bg-muted text-muted-foreground")}>
          <SlidersHorizontal className="h-3.5 w-3.5"/>
          Filter
          {activeCount>0&&<span className="h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
          {open?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
        </button>
        {activeCount>0&&(
          <button onClick={reset} className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <X className="h-4 w-4"/>
          </button>
        )}
      </div>

      {/* Active pills */}
      {activeCount>0&&!open&&(
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {Object.entries(local).map(([k,v])=>v?(
            <Badge key={k} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 rounded-full">
              {v}<button onClick={()=>set(k as keyof LocalFilter,"")} className="hover:text-destructive"><X className="h-2.5 w-2.5"/></button>
            </Badge>
          ):null)}
        </div>
      )}

      {open&&(
        <div className="px-3 pb-4 pt-3 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {/* Date range */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Dari</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateFrom} onChange={e=>set("dateFrom",e.target.value)}/>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sampai</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateTo} onChange={e=>set("dateTo",e.target.value)}/>
            </div>
            {([
              {label:"SPV/Supervisor", key:"supervisor", list:options.supervisors},
              {label:"Cluster",        key:"cluster",    list:options.clusters},
              {label:"Kabupaten",      key:"kabupaten",  list:options.kabupatenList},
              {label:"PM",             key:"pm",         list:options.pmList},
            ] as {label:string;key:keyof LocalFilter;list:string[]}[]).map(({label,key,list})=>(
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
                <Select value={local[key]||"all"} onValueChange={v=>set(key,v==="all"?"":v)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {list.map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Brand</Label>
              <Select value={local.brand||"all"} onValueChange={v=>set("brand",v==="all"?"":v)}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {BRANDS.map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeCount>0&&(
            <button onClick={reset} className="mt-3 text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors">
              Reset semua filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { filter }  = useFilterStore();
  const qc          = useQueryClient();
  const { data: apiData, isLoading } = useAnalytics(filter);
  const { data: transactions = [], isLoading: txLoading } = useTransactions(filter);
  const { data: btsData = [] } = useMasterBTS();
  const [local, setLocal]          = useState<LocalFilter>(initLocal);
  const [peekInsights, setPeekInsights] = useState(true);

  const handleRefresh = useCallback(()=>{
    qc.invalidateQueries({ queryKey:[CACHE_KEYS.analytics] });
    qc.invalidateQueries({ queryKey:[CACHE_KEYS.transactions] });
    qc.invalidateQueries({ queryKey:[CACHE_KEYS.masterBTS] });
  },[qc]);

  // ── btsMap for lookup ────────────────────────────────────────────────────
  const btsMap = useMemo(()=>{
    const m: Record<string,MasterBTS> = {};
    for (const b of btsData) m[b.id] = b;
    return m;
  },[btsData]);

  // ── dropdown options built from transactions + btsData ─────────────────
  const dropdownOpts = useMemo(()=>{
    const supervisors = [...new Set(transactions.map(t=>t.supervisor).filter(Boolean))].sort();
    const clusters    = [...new Set(transactions.map(t=>btsMap[t.idBTS]?.cluster).filter(Boolean))].sort() as string[];
    const kabupatenList = [...new Set(transactions.map(t=>btsMap[t.idBTS]?.kabupaten).filter(Boolean))].sort() as string[];
    const pmList      = [...new Set(transactions.map(t=>btsMap[t.idBTS]?.spm).filter(Boolean))].sort() as string[];
    return { supervisors, clusters, kabupatenList, pmList };
  },[transactions, btsMap]);

  // ── apply local filter to transactions ──────────────────────────────────
  const filtered = useMemo(()=>{
    let list = transactions;
    if (local.dateFrom) list = list.filter(t=>(t.tanggal||"")>=local.dateFrom);
    if (local.dateTo)   list = list.filter(t=>(t.tanggal||"")<=local.dateTo);
    if (local.supervisor) list = list.filter(t=>t.supervisor===local.supervisor);
    if (local.brand)    list = list.filter(t=>t.brand===local.brand);
    if (local.cluster)  list = list.filter(t=>btsMap[t.idBTS]?.cluster===local.cluster);
    if (local.kabupaten)list = list.filter(t=>btsMap[t.idBTS]?.kabupaten===local.kabupaten);
    if (local.pm)       list = list.filter(t=>btsMap[t.idBTS]?.spm===local.pm);
    return list;
  },[transactions, local, btsMap]);

  // ── compute all stats from filtered transactions ────────────────────────
  const stats = useMemo(()=>computeStats(filtered, btsMap),[filtered, btsMap]);

  // ── Smart Insights (from computed stats) ───────────────────────────────
  const insights = useMemo(()=>{
    const list: {icon:React.ElementType;color:string;title:string;body:string;variant:"default"|"warn"|"success"}[]=[];
    // Peak hour
    const peak = [...stats.hourly].sort((a,b)=>b.count-a.count)[0];
    if (peak?.count>0) list.push({icon:Clock,color:"#f59e0b",variant:"default",
      title:`Jam Puncak: ${peak.hour}:00`,
      body:`Aktivasi terbanyak jam ${peak.hour}:00–${peak.hour+1}:00 (${formatNumber(peak.count)}). Optimalkan jadwal di jam ini.`});
    // Best weekday
    const bestDay = [...stats.weekday].sort((a,b)=>b.count-a.count)[0];
    if (bestDay?.count>0) list.push({icon:Zap,color:"#3b82f6",variant:"default",
      title:`Hari Terbaik: ${bestDay.day}`,
      body:`${bestDay.day} aktivasi tertinggi (${formatNumber(bestDay.count)}). Intensifkan kampanye hari ini.`});
    // Growth
    if (stats.growthPct>10) list.push({icon:TrendingUp,color:"#22c55e",variant:"success",
      title:`Growth +${stats.growthPct.toFixed(1)}%`,body:`Tren positif kuat. Pertahankan momentum dan ekspansi ke area baru.`});
    else if (stats.growthPct<-5) list.push({icon:TrendingDown,color:"#ef4444",variant:"warn",
      title:`Growth ${stats.growthPct.toFixed(1)}%`,body:`Aktivasi menurun. Tinjau kinerja promotor dan tower yang stagnant.`});
    // Top promotor concentration
    const topP = stats.promotorPerf[0];
    if (topP && topP.percent>20) list.push({icon:Users,color:"#8b5cf6",variant:"warn",
      title:`Ketergantungan Promotor`,body:`${topP.name} menyumbang ${topP.percent.toFixed(0)}% total. Pastikan ada cadangan.`});
    // Brand dominance
    const brandTotal = stats.brandDist.reduce((s,x)=>s+x.count,0);
    const domB = stats.brandDist[0];
    if (domB && stats.brandDist.length>1 && brandTotal>0 && domB.count/brandTotal>0.6)
      list.push({icon:BarChart3,color:"#ec4899",variant:"warn",
        title:`Dominasi ${domB.brand}`,body:`${domB.brand} menguasai ${((domB.count/brandTotal)*100).toFixed(0)}% aktivasi. Pemerataan brand perlu diperhatikan.`});
    // Kabupaten idle
    if (stats.kabupatenPerf.length>5) list.push({icon:MapPin,color:"#06b6d4",variant:"default",
      title:`${stats.kabupatenPerf.length-5} Kabupaten Butuh Perhatian`,
      body:`Selain top 5, ${stats.kabupatenPerf.length-5} kabupaten berkontribusi kecil. Pertimbangkan alokasi promotor ke area ini.`});
    return list.slice(0,5);
  },[stats]);

  // ── KPI strip ─────────────────────────────────────────────────────────
  const kpiRow = useMemo(()=>[
    {label:"Total Aktivasi",  value:formatNumber(stats.total),             icon:Activity,  color:"#3b82f6"},
    {label:"Rata-rata Harian",value:(stats.dailyTrend.length>0?(stats.total/stats.dailyTrend.filter(d=>d.count>0).length):0).toFixed(1),icon:BarChart3,color:"#10b981"},
    {label:"Growth Rate",     value:`${stats.growthPct>=0?"+":""}${stats.growthPct.toFixed(1)}%`,icon:TrendingUp,color:stats.growthPct>=0?"#22c55e":"#ef4444"},
    {label:"Top Promotor",    value:stats.promotorPerf[0]?.name?.split(" ")[0]||"—",icon:Award,color:"#f59e0b"},
    {label:"Brand Utama",     value:stats.brandDist[0]?.brand||"—",       icon:Zap,       color:"#8b5cf6"},
  ],[stats]);

  const isLocalActive = Object.values(local).some(Boolean);

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time performance insights · breakdown per cluster, SPV, area, brand
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading||txLoading} className="gap-1.5 text-xs shrink-0">
          <RefreshCw className={cn("h-3.5 w-3.5",(isLoading||txLoading)&&"animate-spin")}/>
          Refresh
        </Button>
      </div>

      {/* Global Filter (sends to API) */}
      <GlobalFilter/>

      {/* KPI Strip */}
      {(isLoading||txLoading) ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
          {Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
          {kpiRow.map(({label,value,icon:Icon,color})=>(
            <div key={label} className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col gap-1.5 hover:shadow-md transition-all">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{background:`${color}18`}}>
                <Icon className="h-3.5 w-3.5" style={{color}}/>
              </div>
              <p className="text-base font-black leading-tight tabular-nums truncate" style={{color}}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Smart Insights */}
      {!isLoading && !txLoading && insights.length>0 && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 mb-5 overflow-hidden">
          <button className="w-full flex items-center gap-2 px-4 py-3 hover:bg-blue-500/8 transition-colors" onClick={()=>setPeekInsights(v=>!v)}>
            <Lightbulb className="h-4 w-4 text-blue-500 shrink-0"/>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex-1 text-left">
              {insights.length} Smart Insights {isLocalActive&&<span className="text-[10px] font-normal">(dari data terfilter)</span>}
            </span>
            <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-0 mr-1">{insights.length}</Badge>
            {peekInsights?<ChevronUp className="h-4 w-4 text-muted-foreground"/>:<ChevronDown className="h-4 w-4 text-muted-foreground"/>}
          </button>
          {peekInsights&&(
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 animate-fade-up">
              {insights.map((ins,i)=><InsightCard key={i} {...ins}/>)}
            </div>
          )}
        </div>
      )}

      {/* Breakdown Filter (local, client-side) */}
      <BreakdownFilter
        local={local} setLocal={setLocal}
        options={dropdownOpts}
        totalMatched={filtered.length}
        totalAll={transactions.length}
      />

      {/* Tabs: 4 only, no Tower */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-auto rounded-2xl p-1">
          <TabsTrigger value="trends"       className="text-xs py-2 rounded-xl gap-1"><TrendingUp className="h-3 w-3"/>Tren</TabsTrigger>
          <TabsTrigger value="performance"  className="text-xs py-2 rounded-xl gap-1"><Users className="h-3 w-3"/>Performa</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs py-2 rounded-xl gap-1"><BarChart3 className="h-3 w-3"/>Distribusi</TabsTrigger>
          <TabsTrigger value="rankings"     className="text-xs py-2 rounded-xl gap-1"><Award className="h-3 w-3"/>Ranking</TabsTrigger>
        </TabsList>

        {/* ══ TREN ══════════════════════════════════════════════════════════ */}
        <TabsContent value="trends" className="space-y-4 animate-fade-in">

          <SectionCard title="Tren Aktivasi Harian" subtitle="Area chart + moving average 3-hari"
            icon={TrendingUp} color="#3b82f6" loading={txLoading}>
            {!stats.dailyTrend.length ? <Empty/> : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={stats.dailyTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <defs>
                      <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v:string)=>v.substring(5)}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{fontWeight:600}}
                      formatter={(v:unknown,name:unknown)=>[formatNumber(Number(v)),name==="count"?"Aktivasi":"Moving Avg"]}/>
                    <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={8}/>
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#aG)" name="Aktivasi" dot={false} activeDot={{r:4}}/>
                    <Line type="monotone" dataKey="ma" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" name="Moving Avg" dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
                {stats.dailyTrend.length>=2&&(()=>{
                  const last=stats.dailyTrend.at(-1)!; const prev=stats.dailyTrend.at(-2)!;
                  return (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Terakhir: <b>{formatNumber(last.count)}</b></span><span>·</span>
                      {pctBadge(prev.count>0?((last.count-prev.count)/prev.count)*100:0)}
                      <span>vs hari sebelumnya</span>
                    </div>
                  );
                })()}
              </>
            )}
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Tren Mingguan" subtitle="Agregasi per minggu" icon={BarChart3} color="#10b981" loading={txLoading}>
              {!stats.weeklyTrend.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.weeklyTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="week" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Bar dataKey="count" fill="#10b981" radius={[6,6,0,0]} name="Aktivasi"/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Tren Bulanan" subtitle="Agregasi per bulan" icon={TrendingUp} color="#8b5cf6" loading={txLoading}>
              {!stats.monthlyTrend.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.monthlyTrend} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={{r:4,fill:"#8b5cf6",strokeWidth:0}} activeDot={{r:6}} name="Aktivasi"/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Pola Jam Aktivasi" subtitle="Identifikasi jam puncak" icon={Clock} color="#f59e0b" loading={txLoading}>
              {!stats.hourly.some(h=>h.count>0) ? <Empty h={180}/> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.hourly} margin={{top:4,right:4,left:-28,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                      <XAxis dataKey="hour" tick={{fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v:unknown)=>`${v}h`}/>
                      <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(v:unknown)=>`${v}:00–${Number(v)+1}:00`} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Aktivasi">
                        {stats.hourly.map((d,i)=>{const mx=Math.max(...stats.hourly.map(x=>x.count));return<Cell key={i} fill={d.count===mx?"#f59e0b":d.count>mx*0.5?"#fbbf24":"#fde68a"}/>;  })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-1">Makin gelap = makin tinggi</p>
                </>
              )}
            </SectionCard>

            <SectionCard title="Pola Hari Dalam Seminggu" subtitle="Pola aktivitas mingguan" icon={Activity} color="#ec4899" loading={txLoading}>
              {!stats.weekday.some(d=>d.count>0) ? <Empty h={180}/> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.weekday} margin={{top:4,right:4,left:-28,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false}/>
                      <XAxis dataKey="day" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Aktivasi">
                        {stats.weekday.map((d,i)=><Cell key={i} fill={d.day==="Sun"||d.day==="Sat"?"#94a3b8":"#ec4899"}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-1">Abu-abu = hari libur</p>
                </>
              )}
            </SectionCard>
          </div>

          {/* Growth card */}
          <div className="rounded-2xl border p-5 bg-card flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Growth Rate</p>
              <p className={cn("text-6xl font-black",stats.growthPct>=0?"text-green-500":"text-red-500")}>
                {stats.growthPct>=0?"+":""}{stats.growthPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">dibandingkan periode sebelumnya</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3">
              {[
                {label:"Total Transaksi",   value:formatNumber(stats.total)},
                {label:"Hari Aktif",        value:formatNumber(stats.dailyTrend.filter(d=>d.count>0).length)},
                {label:"Maks Harian",       value:formatNumber(Math.max(...stats.dailyTrend.map(d=>d.count),0))},
              ].map(({label,value})=>(
                <div key={label} className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ══ PERFORMA ════════════════════════════════════════════════════ */}
        <TabsContent value="performance" className="space-y-4 animate-fade-in">

          <SectionCard title="Performa SPV / Supervisor" subtitle="Breakdown aktivasi per SPV"
            icon={Users} color="#3b82f6" loading={txLoading}>
            {!stats.supervisorPerf.length ? <Empty/> : (
              <>
                <div className="space-y-2.5 mb-4">
                  {stats.supervisorPerf.map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx} max={stats.supervisorPerf[0].count} color="#3b82f6"/>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={Math.max(120,stats.supervisorPerf.length*36)}>
                  <BarChart data={stats.supervisorPerf} layout="vertical" margin={{top:0,right:40,left:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={90} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Bar dataKey="count" radius={[0,6,6,0]} name="Aktivasi" label={{position:"right",fontSize:10,fill:"hsl(var(--muted-foreground))"}}>
                      {stats.supervisorPerf.map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </SectionCard>

          <SectionCard title="Performa Promotor" subtitle="Top 20 promotor berdasarkan aktivasi"
            icon={Award} color="#10b981" loading={txLoading}>
            {!stats.promotorPerf.length ? <Empty/> : (
              <>
                <div className="space-y-2.5 mb-4">
                  {stats.promotorPerf.slice(0,20).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx} max={stats.promotorPerf[0].count} color="#10b981"/>
                  ))}
                </div>
                <div className="pt-3 border-t border-border/40 grid grid-cols-3 gap-3">
                  {[
                    {label:"Total Promotor",  value:formatNumber(stats.promotorPerf.length)},
                    {label:"Avg / Promotor",  value:(stats.promotorPerf.length>0?(stats.total/stats.promotorPerf.length):0).toFixed(1)},
                    {label:"Top Kontribusi",  value:`${stats.promotorPerf[0]?.percent.toFixed(0)||0}%`},
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              {key:"kabupatenPerf" as const, title:"Kabupaten",  color:"#f59e0b"},
              {key:"clusterPerf"   as const, title:"Cluster",    color:"#8b5cf6"},
              {key:"pmPerf"        as const, title:"PM",         color:"#ef4444"},
            ]).map(({key,title,color})=>{
              const items = stats[key].slice(0,10);
              return (
                <SectionCard key={key} title={`Performa ${title}`} subtitle="Berdasarkan aktivasi" icon={MapPin} color={color} loading={txLoading}>
                  {!items.length ? <Empty h={160}/> : (
                    <>
                      <div className="space-y-2 mb-3">
                        {items.map((item,idx)=>(
                          <LeaderRow key={item.name} item={item} idx={idx} max={items[0].count} color={color}/>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={items.slice(0,6)} margin={{top:0,right:0,left:-30,bottom:0}}>
                          <XAxis dataKey="name" tick={{fontSize:8}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:8}} axisLine={false} tickLine={false} allowDecimals={false}/>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                          <Bar dataKey="count" radius={[3,3,0,0]}>
                            {items.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </TabsContent>

        {/* ══ DISTRIBUSI ══════════════════════════════════════════════════ */}
        <TabsContent value="distribution" className="space-y-4 animate-fade-in">

          <SectionCard title="Distribusi Brand" subtitle="Share aktivasi per brand"
            icon={BarChart3} color="#ec4899" loading={txLoading}>
            {!stats.brandDist.length ? <Empty/> : (()=>{
              const total = stats.brandDist.reduce((s,x)=>s+x.count,0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={stats.brandDist} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="count" nameKey="brand">
                        {stats.brandDist.map(e=><Cell key={e.brand} fill={getBrandColor(e.brand)}/>)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[`${formatNumber(Number(v))} (${(Number(v)/total*100).toFixed(1)}%)`,""]}/>
                      <Legend wrapperStyle={{fontSize:11}} iconType="circle" iconSize={8}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {stats.brandDist.map(d=>{
                      const pct = total?(d.count/total)*100:0;
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
                          <Progress value={pct} className="h-2"/>
                        </div>
                      );
                    })}
                    {(()=>{
                      const dom=stats.brandDist[0];
                      if(!dom) return null;
                      const p=(dom.count/total)*100;
                      return (
                        <div className="rounded-xl bg-muted/40 px-3 py-2 mt-2">
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{dom.brand}</span> mendominasi{" "}
                            <span className="font-semibold text-foreground">{p.toFixed(0)}%</span>.{" "}
                            {p>60?"Pertimbangkan pemerataan brand lain.":"Distribusi cukup seimbang."}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Distribusi Kabupaten" subtitle="Kontribusi per kabupaten"
              icon={MapPin} color="#06b6d4" loading={txLoading}>
              {!stats.kabupatenPerf.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={Math.max(160, stats.kabupatenPerf.slice(0,10).length*32)}>
                  <BarChart data={stats.kabupatenPerf.slice(0,10)} layout="vertical" margin={{top:0,right:40,left:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={90} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Bar dataKey="count" radius={[0,5,5,0]} name="Aktivasi" label={{position:"right",fontSize:9,fill:"hsl(var(--muted-foreground))"}}>
                      {stats.kabupatenPerf.slice(0,10).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Distribusi Cluster" subtitle="Kontribusi per cluster"
              icon={Zap} color="#8b5cf6" loading={txLoading}>
              {!stats.clusterPerf.length ? <Empty h={200}/> : (
                <ResponsiveContainer width="100%" height={Math.max(160, stats.clusterPerf.slice(0,10).length*32)}>
                  <BarChart data={stats.clusterPerf.slice(0,10)} layout="vertical" margin={{top:0,right:40,left:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={90} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                    <Bar dataKey="count" radius={[0,5,5,0]} name="Aktivasi" label={{position:"right",fontSize:9,fill:"hsl(var(--muted-foreground))"}}>
                      {stats.clusterPerf.slice(0,10).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-card p-5 flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Growth Rate</p>
              <p className={cn("text-5xl font-black",stats.growthPct>=0?"text-green-500":"text-red-500")}>
                {stats.growthPct>=0?"+":""}{stats.growthPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground text-center">first half vs second half</p>
              <div className="flex items-center gap-1 mt-1">
                {stats.growthPct>=0?<TrendingUp className="h-4 w-4 text-green-500"/>:<TrendingDown className="h-4 w-4 text-red-500"/>}
                <span className="text-xs font-medium">{stats.growthPct>=0?"Positif":"Perlu perhatian"}</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <SectionCard title="Distribusi PM" subtitle="Kontribusi per project manager"
                icon={Users} color="#f97316" loading={txLoading}>
                {!stats.pmPerf.length ? <Empty h={140}/> : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={stats.pmPerf.slice(0,8)} layout="vertical" margin={{top:0,right:40,left:4,bottom:0}}>
                      <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={80} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                      <Bar dataKey="count" radius={[0,5,5,0]} name="Aktivasi" label={{position:"right",fontSize:9,fill:"hsl(var(--muted-foreground))"}}>
                        {stats.pmPerf.slice(0,8).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ══ RANKING ═════════════════════════════════════════════════════ */}
        <TabsContent value="rankings" className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <SectionCard title="Top 10 Promotor" subtitle="Berdasarkan total aktivasi"
              icon={Award} color="#10b981" loading={txLoading}>
              {!stats.promotorPerf.length ? <Empty h={200}/> : (
                <div className="space-y-2.5">
                  {stats.promotorPerf.slice(0,10).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx} max={stats.promotorPerf[0].count} color="#10b981"/>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top 10 Tower (BTS)" subtitle="Tower dengan aktivasi terbanyak"
              icon={BarChart3} color="#8b5cf6" loading={txLoading}>
              {!stats.btsPerf.length ? <Empty h={200}/> : (
                <div className="space-y-2.5">
                  {stats.btsPerf.slice(0,10).map((item,idx)=>(
                    <LeaderRow key={item.name} item={item} idx={idx} max={stats.btsPerf[0].count} color="#8b5cf6"/>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top Kabupaten" subtitle="Area dengan aktivasi tertinggi"
              icon={MapPin} color="#f59e0b" loading={txLoading}>
              {!stats.kabupatenPerf.length ? <Empty h={200}/> : (
                <>
                  <div className="space-y-2.5">
                    {stats.kabupatenPerf.slice(0,10).map((item,idx)=>(
                      <LeaderRow key={item.name} item={item} idx={idx} max={stats.kabupatenPerf[0].count} color="#f59e0b"/>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={stats.kabupatenPerf.slice(0,6)} margin={{top:0,right:0,left:-30,bottom:0}}>
                        <XAxis dataKey="name" tick={{fontSize:8}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:8}} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {stats.kabupatenPerf.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard title="Top Cluster" subtitle="Cluster dengan aktivasi tertinggi"
              icon={Zap} color="#06b6d4" loading={txLoading}>
              {!stats.clusterPerf.length ? <Empty h={200}/> : (
                <>
                  <div className="space-y-2.5">
                    {stats.clusterPerf.slice(0,10).map((item,idx)=>(
                      <LeaderRow key={item.name} item={item} idx={idx} max={stats.clusterPerf[0].count} color="#06b6d4"/>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={stats.clusterPerf.slice(0,6)} margin={{top:0,right:0,left:-30,bottom:0}}>
                        <XAxis dataKey="name" tick={{fontSize:8}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:8}} axisLine={false} tickLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v:unknown)=>[formatNumber(Number(v)),"Aktivasi"]}/>
                        <Bar dataKey="count" radius={[4,4,0,0]}>
                          {stats.clusterPerf.slice(0,6).map((_,i)=><Cell key={i} fill={P[i%P.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          {!!stats.supervisorPerf.length && (
            <SectionCard title="Ranking SPV" subtitle="Supervisor berdasarkan total aktivasi"
              icon={Users} color="#3b82f6" loading={txLoading}>
              <div className="space-y-2.5">
                {stats.supervisorPerf.map((item,idx)=>(
                  <LeaderRow key={item.name} item={item} idx={idx} max={stats.supervisorPerf[0].count} color="#3b82f6"/>
                ))}
              </div>
            </SectionCard>
          )}

          {!!stats.pmPerf.length && (
            <SectionCard title="Ranking PM (Project Manager)" subtitle="PM berdasarkan total aktivasi di areanya"
              icon={Users} color="#ec4899" loading={txLoading}>
              <div className="space-y-2.5">
                {stats.pmPerf.slice(0,10).map((item,idx)=>(
                  <LeaderRow key={item.name} item={item} idx={idx} max={stats.pmPerf[0].count} color="#ec4899"/>
                ))}
              </div>
            </SectionCard>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
