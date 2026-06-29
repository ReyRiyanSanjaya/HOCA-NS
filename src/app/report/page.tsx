"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Printer,
  Copy, RefreshCw, ChevronLeft, ChevronRight, Filter, X,
  SlidersHorizontal, ChevronDown, ChevronUp, BarChart2,
  MapPin, Users, Tag, Clock, CheckCircle2, AlertTriangle,
  FileText, TrendingUp, Eye,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast }          from "sonner";
import { PageContainer }  from "@/components/layout/page-container";
import { GlobalFilter }   from "@/components/dashboard/global-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Badge }     from "@/components/ui/badge";
import { Skeleton }  from "@/components/ui/skeleton";
import { Progress }  from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }    from "@/hooks/use-master-data";
import { useFilterStore }  from "@/stores/filter-store";
import { CACHE_KEYS, BRANDS } from "@/lib/config";
import { formatDistance, getBrandColor, formatNumber, cn } from "@/lib/utils";
import type { Transaction, MasterBTS } from "@/types";

// ─── types ───────────────────────────────────────────────────────────────────
type SortKey = keyof Transaction;
type SortDir = "asc" | "desc";
const PAGE_SIZES = [10, 25, 50, 100];

interface LocalFilter {
  search: string;
  brand: string;
  supervisor: string;
  promotor: string;
  kabupaten: string;
  cluster: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}
const initFilter: LocalFilter = {
  search:"", brand:"", supervisor:"", promotor:"",
  kabupaten:"", cluster:"", dateFrom:"", dateTo:"", status:"",
};

const COLUMNS: { key: keyof Transaction; label: string; width: string }[] = [
  { key:"tanggal",        label:"Tanggal",    width:"100px" },
  { key:"jam",            label:"Jam",        width:"70px"  },
  { key:"supervisor",     label:"Supervisor", width:"130px" },
  { key:"promotor",       label:"Promotor",   width:"130px" },
  { key:"brand",          label:"Brand",      width:"90px"  },
  { key:"idBTS",          label:"ID BTS",     width:"110px" },
  { key:"mdn",            label:"MDN",        width:"120px" },
  { key:"distanceFromBTS",label:"Jarak",      width:"80px"  },
  { key:"status",         label:"Status",     width:"80px"  },
];

// ─── Summary stats bar ────────────────────────────────────────────────────────
function SummaryBar({ rows, btsMap }: { rows: Transaction[]; btsMap: Record<string, MasterBTS> }) {
  const stats = useMemo(() => {
    if (!rows.length) return null;
    const brands: Record<string, number>     = {};
    const spvs:   Record<string, number>     = {};
    const proms:  Record<string, number>     = {};
    const dates:  Record<string, number>     = {};
    let distOver = 0, distOk = 0;
    for (const tx of rows) {
      brands[tx.brand]     = (brands[tx.brand] || 0) + 1;
      spvs[tx.supervisor]  = (spvs[tx.supervisor] || 0) + 1;
      proms[tx.promotor]   = (proms[tx.promotor] || 0) + 1;
      if (tx.tanggal) dates[tx.tanggal] = (dates[tx.tanggal] || 0) + 1;
      if (tx.distanceFromBTS > 500) distOver++; else distOk++;
    }
    const topBrand = Object.entries(brands).sort((a,b)=>b[1]-a[1])[0];
    const topSpv   = Object.entries(spvs).sort((a,b)=>b[1]-a[1])[0];
    const topProm  = Object.entries(proms).sort((a,b)=>b[1]-a[1])[0];
    return {
      total: rows.length,
      days: Object.keys(dates).length,
      topBrand, topSpv, topProm,
      brandCount: Object.keys(brands).length,
      distOver, distOk,
      distOkPct: rows.length > 0 ? Math.round((distOk / rows.length) * 100) : 0,
    };
  }, [rows]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {[
        { label:"Total Transaksi",  value:formatNumber(stats.total),           icon:FileText,     color:"#3b82f6" },
        { label:"Hari Aktif",       value:String(stats.days),                  icon:Clock,        color:"#10b981" },
        { label:"Brand Terbanyak",  value:stats.topBrand?stats.topBrand[0]:"—",icon:Tag,          color:stats.topBrand?getBrandColor(stats.topBrand[0]):"#6b7280" },
        { label:"Top Promotor",     value:stats.topProm?stats.topProm[0].split(" ")[0]:"—",icon:Users,color:"#f59e0b" },
        { label:"Top SPV",          value:stats.topSpv?stats.topSpv[0].split(" ")[0]:"—",icon:Users,color:"#8b5cf6" },
        { label:"Dalam Radius",     value:`${stats.distOkPct}%`,               icon:MapPin,       color:stats.distOkPct>=80?"#22c55e":"#f59e0b" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl bg-card border border-border/60 px-3 py-2.5 flex items-center gap-2.5 hover:shadow-sm transition-all">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-tight" style={{ color }}>{value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Local Filter Panel ───────────────────────────────────────────────────────
function ReportFilterPanel({
  local, setLocal, opts, total, matched,
}: {
  local: LocalFilter;
  setLocal: (f: LocalFilter) => void;
  opts: { supervisors:string[]; promotors:string[]; kabupatenList:string[]; clusterList:string[] };
  total: number; matched: number;
}) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof LocalFilter, v: string) => setLocal({ ...local, [k]: v });
  const reset = () => setLocal(initFilter);
  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari ID BTS, MDN, promotor, supervisor…"
            className="pl-9 h-9 text-xs bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            value={local.search}
            onChange={e => set("search", e.target.value)}
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block tabular-nums">
          <b className={matched < total ? "text-blue-600 dark:text-blue-400" : ""}>{formatNumber(matched)}</b>
          /{formatNumber(total)}
        </span>
        <button onClick={() => setOpen(v => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
            open || activeCount > 0 ? "gradient-blue text-white shadow-md" : "bg-muted/60 hover:bg-muted text-muted-foreground")}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {activeCount > 0 && <span className="h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {(activeCount > 0) && (
          <button onClick={reset} className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {activeCount > 0 && !open && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {Object.entries(local).map(([k, v]) => v && k !== "search" ? (
            <Badge key={k} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 rounded-full">
              {v}<button onClick={() => set(k as keyof LocalFilter, "")} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ) : null)}
        </div>
      )}

      {open && (
        <div className="px-3 pb-4 pt-3 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Dari</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateFrom} onChange={e => set("dateFrom", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sampai</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateTo} onChange={e => set("dateTo", e.target.value)} />
            </div>
            {([
              { label:"Brand",      key:"brand"      as const, list:[...BRANDS] },
              { label:"Supervisor", key:"supervisor" as const, list:opts.supervisors },
              { label:"Promotor",   key:"promotor"  as const, list:opts.promotors },
              { label:"Kabupaten",  key:"kabupaten" as const, list:opts.kabupatenList },
              { label:"Cluster",    key:"cluster"   as const, list:opts.clusterList },
              { label:"Status",     key:"status"    as const, list:["Success","Pending","Failed"] },
            ]).map(({ label, key, list }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
                <Select value={local[key] || "all"} onValueChange={v => set(key, v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {list.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {activeCount > 0 && (
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
export default function ReportPage() {
  const { filter }  = useFilterStore();
  const qc          = useQueryClient();
  const { data = [], isLoading } = useTransactions(filter);
  const { data: btsData = [] }   = useMasterBTS();

  const [local,        setLocal]        = useState<LocalFilter>(initFilter);
  const [sortKey,      setSortKey]      = useState<SortKey>("tanggal");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [pageSize,     setPageSize]     = useState(25);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [visibleCols,  setVisibleCols]  = useState<Set<string>>(new Set(COLUMNS.map(c => c.key)));
  const [colToggleOpen,setColToggleOpen]= useState(false);

  // btsMap for kabupaten/cluster lookup
  const btsMap = useMemo(() => {
    const m: Record<string, MasterBTS> = {};
    for (const b of btsData) m[b.id] = b;
    return m;
  }, [btsData]);

  // dropdown options
  const opts = useMemo(() => ({
    supervisors:   [...new Set(data.map(t => t.supervisor).filter(Boolean))].sort() as string[],
    promotors:     [...new Set(data.map(t => t.promotor).filter(Boolean))].sort() as string[],
    kabupatenList: [...new Set(data.map(t => btsMap[t.idBTS]?.kabupaten).filter(Boolean))].sort() as string[],
    clusterList:   [...new Set(data.map(t => btsMap[t.idBTS]?.cluster).filter(Boolean))].sort() as string[],
  }), [data, btsMap]);

  // apply local filter
  const filtered = useMemo(() => {
    let list = data;
    if (local.dateFrom)   list = list.filter(t => (t.tanggal || "") >= local.dateFrom);
    if (local.dateTo)     list = list.filter(t => (t.tanggal || "") <= local.dateTo);
    if (local.brand)      list = list.filter(t => t.brand === local.brand);
    if (local.supervisor) list = list.filter(t => t.supervisor === local.supervisor);
    if (local.promotor)   list = list.filter(t => t.promotor === local.promotor);
    if (local.status)     list = list.filter(t => t.status === local.status);
    if (local.kabupaten)  list = list.filter(t => btsMap[t.idBTS]?.kabupaten === local.kabupaten);
    if (local.cluster)    list = list.filter(t => btsMap[t.idBTS]?.cluster === local.cluster);
    if (local.search.trim()) {
      const q = local.search.toLowerCase();
      list = list.filter(t =>
        t.idBTS.toLowerCase().includes(q)    ||
        t.promotor.toLowerCase().includes(q)  ||
        t.supervisor.toLowerCase().includes(q)||
        t.brand.toLowerCase().includes(q)     ||
        t.mdn.toLowerCase().includes(q)       ||
        (t.tanggal || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, local, btsMap]);

  // sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      const cmp = String(av) < String(bv) ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setCurrentPage(1);
  };

  // exports
  const exportCSV = useCallback(() => {
    const cols = COLUMNS.filter(c => visibleCols.has(c.key));
    const header = cols.map(c => c.label).join(",");
    const rows = sorted.map(tx =>
      cols.map(c => {
        const v = tx[c.key];
        if (c.key === "distanceFromBTS") return formatDistance(Number(v));
        return `"${String(v || "").replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `laporan_aktivasi_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${sorted.length} baris diekspor ke CSV`);
  }, [sorted, visibleCols]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `laporan_aktivasi_${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("JSON diekspor");
  }, [sorted]);

  const handleCopy = useCallback(() => {
    const text = sorted.map(tx =>
      `${tx.tanggal}\t${tx.jam}\t${tx.supervisor}\t${tx.promotor}\t${tx.brand}\t${tx.idBTS}\t${tx.mdn}`
    ).join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Disalin ke clipboard"));
  }, [sorted]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan Transaksi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "Memuat…" : `${formatNumber(sorted.length)} dari ${formatNumber(data.length)} transaksi`}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <button onClick={() => qc.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] })} disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={exportCSV} disabled={!sorted.length}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95">
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button onClick={exportJSON} disabled={!sorted.length}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95">
            <Download className="h-3.5 w-3.5" />
            JSON
          </button>
          <button onClick={handleCopy} disabled={!sorted.length}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-card hover:bg-muted transition-all active:scale-95" title="Copy ke clipboard">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => window.print()}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-card hover:bg-muted transition-all active:scale-95" title="Print">
            <Printer className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <GlobalFilter />

      {/* Summary stats */}
      {!isLoading && <SummaryBar rows={filtered} btsMap={btsMap} />}

      {/* Local filter panel */}
      <ReportFilterPanel local={local} setLocal={v => { setLocal(v); setCurrentPage(1); }}
        opts={opts} total={data.length} matched={filtered.length} />

      {/* Column visibility toggle */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={() => setColToggleOpen(v => !v)}
          className={cn("flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-semibold border transition-all",
            colToggleOpen ? "bg-blue-500 text-white border-transparent" : "border-border/60 bg-card hover:bg-muted text-muted-foreground")}>
          <Eye className="h-3.5 w-3.5" />
          Kolom
          {colToggleOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {colToggleOpen && COLUMNS.map(col => (
          <button key={col.key}
            onClick={() => setVisibleCols(prev => {
              const next = new Set(prev);
              if (next.has(col.key)) { if (next.size > 2) next.delete(col.key); }
              else next.add(col.key);
              return next;
            })}
            className={cn("h-8 px-2.5 rounded-xl text-[11px] font-medium border transition-all",
              visibleCols.has(col.key)
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/60 bg-card text-muted-foreground/50 line-through")}>
            {col.label}
          </button>
        ))}

        {/* Row count hint */}
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          Halaman {currentPage}/{totalPages} · {formatNumber(sorted.length)} baris
        </span>
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10 shrink-0">#</th>
                  {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                    <th key={col.key}
                      className="text-left px-3 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                      style={{ minWidth: col.width }}
                      onClick={() => handleSort(col.key)}>
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">Foto</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td colSpan={COLUMNS.length + 2} className="px-3 py-3">
                        <Skeleton className="h-4 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 2} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-10 w-10 opacity-20" />
                        <p className="text-sm">Tidak ada transaksi ditemukan</p>
                        {Object.values(local).some(Boolean) && (
                          <button onClick={() => setLocal(initFilter)} className="text-xs text-blue-500 hover:underline">
                            Reset filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((tx, idx) => {
                    const rowNum = (currentPage - 1) * pageSize + idx + 1;
                    const kab    = btsMap[tx.idBTS]?.kabupaten;
                    const isDistFar = Number(tx.distanceFromBTS) > 500;
                    return (
                      <tr key={tx.id}
                        className={cn("border-b border-border/30 hover:bg-muted/30 transition-colors",
                          idx % 2 === 0 ? "" : "bg-muted/10")}>
                        <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{rowNum}</td>

                        {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                          <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                            {col.key === "brand" ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getBrandColor(tx.brand) }} />
                                <span className="font-semibold text-xs" style={{ color: getBrandColor(tx.brand) }}>{tx.brand}</span>
                              </span>
                            ) : col.key === "distanceFromBTS" ? (
                              <span className={cn("font-semibold tabular-nums",
                                isDistFar ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400")}>
                                {isDistFar ? "⚠ " : "✓ "}{formatDistance(Number(tx.distanceFromBTS))}
                              </span>
                            ) : col.key === "status" ? (
                              <Badge variant={tx.status === "Success" ? "success" : "warning"} className="text-[10px]">
                                {tx.status || "Pending"}
                              </Badge>
                            ) : col.key === "idBTS" ? (
                              <span className="font-mono font-semibold text-primary">{tx.idBTS}</span>
                            ) : col.key === "mdn" ? (
                              <span className="font-mono tabular-nums">{tx.mdn || "—"}</span>
                            ) : col.key === "tanggal" ? (
                              <span className="tabular-nums">{tx.tanggal || "—"}</span>
                            ) : col.key === "jam" ? (
                              <span className="tabular-nums text-muted-foreground">{tx.jam || "—"}</span>
                            ) : (
                              <span className="truncate max-w-[130px] block">{String(tx[col.key] || "—")}</span>
                            )}
                          </td>
                        ))}

                        <td className="px-3 py-2.5">
                          {tx.photoURL ? (
                            <a href={tx.photoURL} target="_blank" rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 text-xs underline underline-offset-2 flex items-center gap-1">
                              <Eye className="h-3 w-3" />Foto
                            </a>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Baris:</span>
              <select value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-border/60 rounded-lg px-2 py-1 bg-background text-foreground text-xs focus:outline-none">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="tabular-nums">
                {Math.min((currentPage - 1) * pageSize + 1, sorted.length)}–{Math.min(currentPage * pageSize, sorted.length)}{" "}
                dari {formatNumber(sorted.length)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* First */}
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="h-8 px-2 rounded-lg border border-border/60 text-xs hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                «
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) page = i + 1;
                else if (currentPage <= 4) page = i + 1;
                else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                else page = currentPage - 3 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={cn("h-8 w-8 rounded-lg text-xs font-semibold transition-all",
                      currentPage === page ? "gradient-blue text-white shadow-md" : "border border-border/60 hover:bg-muted")}>
                    {page}
                  </button>
                );
              })}

              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {/* Last */}
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="h-8 px-2 rounded-lg border border-border/60 text-xs hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                »
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Distance warning summary ─────────────────────────────────── */}
      {!isLoading && sorted.some(t => t.distanceFromBTS > 500) && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {sorted.filter(t => t.distanceFromBTS > 500).length} transaksi melebihi radius 500m
            </p>
            <p className="text-amber-600 dark:text-amber-500 mt-0.5">
              Transaksi dengan jarak &gt;500m ditandai ⚠ pada kolom Jarak. Verifikasi lokasi promotor saat aktivasi.
            </p>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
