"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Download, Search, RefreshCw, Printer, X,
  SlidersHorizontal, ChevronDown, ChevronUp,
  FileText, Wifi, Eye, Filter,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast }          from "sonner";
import Link               from "next/link";
import { PageContainer }  from "@/components/layout/page-container";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import { Badge }          from "@/components/ui/badge";
import { Skeleton }       from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }    from "@/hooks/use-master-data";
import { useFilterStore }  from "@/stores/filter-store";
import { CACHE_KEYS, BRANDS } from "@/lib/config";
import { formatDistance, getBrandColor, cn } from "@/lib/utils";
import type { Transaction, MasterBTS } from "@/types";

// ─── Local filter ──────────────────────────────────────────────────────────────
interface PMFilter {
  search: string;
  brand: string;
  supervisor: string;
  promotor: string;
  dateFrom: string;
  dateTo: string;
}
const initFilter: PMFilter = {
  search: "", brand: "", supervisor: "", promotor: "", dateFrom: "", dateTo: "",
};

// Format tanggal ke "22 Jun'26"
function fmtTanggal(raw: string): string {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}'${String(d.getFullYear()).slice(2)}`;
  } catch { return raw; }
}

// ─── Print styles injected once ───────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #pm-report-printable, #pm-report-printable * { visibility: visible !important; }
  #pm-report-printable { position: fixed; inset: 0; padding: 24px; }
  .no-print { display: none !important; }
}
`;

// ─── PM Report Table ──────────────────────────────────────────────────────────
interface PMRow {
  no: number;
  tx: Transaction;
  bts: MasterBTS | undefined;
}

function PMTable({ rows, isLoading }: { rows: PMRow[]; isLoading: boolean }) {
  const HEADER_COLS = [
    { label: "No",                      cls: "w-10 text-center" },
    { label: "Tanggal Seeding Execution",cls: "min-w-[120px]" },
    { label: "Tower ID",                 cls: "min-w-[140px]" },
    { label: "Speedtest Result",         cls: "min-w-[110px]" },
    { label: "Promotor ID",              cls: "min-w-[110px]" },
    { label: "Promotor Name",            cls: "min-w-[130px]" },
    { label: "Stock Awal",               cls: "min-w-[80px] text-center" },
    { label: "Stock Akhir",              cls: "min-w-[80px] text-center" },
    { label: "Remark",                   cls: "min-w-[140px]" },
    { label: "Foto",                     cls: "w-[60px] text-center no-print" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" style={{ borderColor: "#1e3a6e" }}>
        {/* Header */}
        <thead>
          <tr>
            {HEADER_COLS.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "border px-3 py-2.5 text-center text-[11px] font-bold text-white select-none",
                  col.cls,
                  col.label === "Foto" ? "no-print" : ""
                )}
                style={{ background: "#1e3a6e", borderColor: "#1e3a6e" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={HEADER_COLS.length}
                className="text-center py-16 text-muted-foreground border"
                style={{ borderColor: "#c5d0e6" }}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 opacity-20" />
                  <p>Tidak ada data ditemukan</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map(({ no, tx, bts }, idx) => {
              const isEven = idx % 2 === 0;
              const speedtestDisplay = tx.speedtest
                ? `${tx.speedtest}${tx.speedtest.toLowerCase().includes("mbps") ? "" : " Mbps"}`
                : "—";

              return (
                <tr
                  key={tx.id}
                  style={{
                    background: isEven ? "#ffffff" : "#f0f4ff",
                    borderColor: "#c5d0e6",
                  }}
                >
                  {/* No */}
                  <td
                    className="border px-2 py-3 text-center font-semibold text-[11px]"
                    style={{ borderColor: "#c5d0e6", color: "#1e3a6e" }}
                  >
                    {no}
                  </td>

                  {/* Tanggal */}
                  <td
                    className="border px-3 py-3 text-center tabular-nums"
                    style={{ borderColor: "#c5d0e6" }}
                  >
                    {fmtTanggal(tx.tanggal)}
                  </td>

                  {/* Tower ID */}
                  <td
                    className="border px-3 py-3 font-mono font-semibold"
                    style={{ borderColor: "#c5d0e6", color: "#1e3a6e" }}
                  >
                    {tx.idBTS || "—"}
                  </td>

                  {/* Speedtest */}
                  <td
                    className="border px-3 py-3 text-center font-semibold"
                    style={{
                      borderColor: "#c5d0e6",
                      color: tx.speedtest ? "#0d6efd" : "#9ca3af",
                    }}
                  >
                    {speedtestDisplay}
                  </td>

                  {/* Promotor ID — pakai MDN sebagai ID unik */}
                  <td
                    className="border px-3 py-3 text-center font-mono text-[11px]"
                    style={{ borderColor: "#c5d0e6" }}
                  >
                    {tx.mdn || "—"}
                  </td>

                  {/* Promotor Name */}
                  <td
                    className="border px-3 py-3"
                    style={{ borderColor: "#c5d0e6" }}
                  >
                    {tx.promotor || "—"}
                  </td>

                  {/* Stock Awal — kolom kosong (diisi manual) */}
                  <td
                    className="border px-3 py-3 text-center"
                    style={{ borderColor: "#c5d0e6", minHeight: "40px" }}
                  >
                    &nbsp;
                  </td>

                  {/* Stock Akhir — kolom kosong (diisi manual) */}
                  <td
                    className="border px-3 py-3 text-center"
                    style={{ borderColor: "#c5d0e6" }}
                  >
                    &nbsp;
                  </td>

                  {/* Remark — kosong atau pakai info jarak */}
                  <td
                    className="border px-3 py-3 text-[11px]"
                    style={{ borderColor: "#c5d0e6", color: "#555" }}
                  >
                    {tx.distanceFromBTS > 500
                      ? `⚠ Jarak ${formatDistance(tx.distanceFromBTS)}`
                      : ""}
                  </td>

                  {/* Foto — tidak ikut print */}
                  <td
                    className="border px-3 py-3 text-center no-print"
                    style={{ borderColor: "#c5d0e6" }}
                  >
                    {tx.photoURL ? (
                      <a
                        href={tx.photoURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      >
                        <Eye className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}

          {/* Baris kosong padding bawah (seperti template asli) */}
          {rows.length > 0 && rows.length < 5 &&
            Array.from({ length: 5 - rows.length }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderColor: "#c5d0e6" }}>
                {HEADER_COLS.map((col) => (
                  <td
                    key={col.label}
                    className={cn("border py-4", col.label === "Foto" ? "no-print" : "")}
                    style={{ borderColor: "#c5d0e6", minHeight: "48px" }}
                  >
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function PMFilterPanel({
  filter, setFilter, opts, total, matched,
}: {
  filter: PMFilter;
  setFilter: (f: PMFilter) => void;
  opts: { supervisors: string[]; promotors: string[] };
  total: number;
  matched: number;
}) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof PMFilter, v: string) => setFilter({ ...filter, [k]: v });
  const reset = () => setFilter(initFilter);
  const activeCount = Object.values(filter).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm mb-4 overflow-hidden no-print">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari Tower ID, promotor, MDN…"
            className="pl-9 h-9 text-xs bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            value={filter.search}
            onChange={e => set("search", e.target.value)}
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block tabular-nums">
          <b className={matched < total ? "text-blue-600 dark:text-blue-400" : ""}>{matched}</b>/{total}
        </span>
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
            open || activeCount > 0
              ? "gradient-blue text-white shadow-md"
              : "bg-muted/60 hover:bg-muted text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-4 pt-3 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Dari</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60"
                value={filter.dateFrom} onChange={e => set("dateFrom", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sampai</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60"
                value={filter.dateTo} onChange={e => set("dateTo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Brand</Label>
              <Select value={filter.brand || "all"} onValueChange={v => set("brand", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Supervisor</Label>
              <Select value={filter.supervisor || "all"} onValueChange={v => set("supervisor", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {opts.supervisors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Promotor</Label>
              <Select value={filter.promotor || "all"} onValueChange={v => set("promotor", v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {opts.promotors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PMReportPage() {
  const { filter }   = useFilterStore();
  const qc           = useQueryClient();
  const { data = [], isLoading } = useTransactions(filter);
  const { data: btsData = [] }   = useMasterBTS();

  const [local, setLocal] = useState<PMFilter>(initFilter);
  const printRef = useRef<HTMLDivElement>(null);

  // inject print styles once
  React.useEffect(() => {
    const id = "pm-report-print-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = PRINT_STYLE;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) document.head.removeChild(el);
    };
  }, []);

  const btsMap = useMemo(() => {
    const m: Record<string, MasterBTS> = {};
    for (const b of btsData) m[b.id] = b;
    return m;
  }, [btsData]);

  const opts = useMemo(() => ({
    supervisors: [...new Set(data.map(t => t.supervisor).filter(Boolean))].sort() as string[],
    promotors:   [...new Set(data.map(t => t.promotor).filter(Boolean))].sort() as string[],
  }), [data]);

  // apply filter
  const filtered = useMemo(() => {
    let list = data;
    if (local.dateFrom)   list = list.filter(t => (t.tanggal || "") >= local.dateFrom);
    if (local.dateTo)     list = list.filter(t => (t.tanggal || "") <= local.dateTo);
    if (local.brand)      list = list.filter(t => t.brand === local.brand);
    if (local.supervisor) list = list.filter(t => t.supervisor === local.supervisor);
    if (local.promotor)   list = list.filter(t => t.promotor === local.promotor);
    if (local.search.trim()) {
      const q = local.search.toLowerCase();
      list = list.filter(t =>
        t.idBTS.toLowerCase().includes(q) ||
        t.promotor.toLowerCase().includes(q) ||
        t.supervisor.toLowerCase().includes(q) ||
        t.mdn.toLowerCase().includes(q) ||
        (t.tanggal || "").includes(q)
      );
    }
    // sort terbaru ke terlama
    return [...list].sort((a, b) =>
      (b.tanggal || "").localeCompare(a.tanggal || "") ||
      (b.jam || "").localeCompare(a.jam || "")
    );
  }, [data, local]);

  const rows: PMRow[] = filtered.map((tx, i) => ({
    no: i + 1,
    tx,
    bts: btsMap[tx.idBTS],
  }));

  // export CSV format PM report
  const exportCSV = useCallback(() => {
    const header = [
      "No", "Tanggal Seeding Execution", "Tower ID", "Speedtest Result",
      "Promotor ID (MDN)", "Promotor Name", "Stock Awal", "Stock Akhir", "Remark",
    ].join(",");
    const csvRows = rows.map(({ no, tx }) => [
      no,
      `"${fmtTanggal(tx.tanggal)}"`,
      `"${tx.idBTS}"`,
      `"${tx.speedtest ? `${tx.speedtest} Mbps` : ""}"`,
      `"${tx.mdn}"`,
      `"${tx.promotor}"`,
      "",
      "",
      tx.distanceFromBTS > 500 ? `"Jarak ${formatDistance(tx.distanceFromBTS)}"` : "",
    ].join(","));
    const csv  = [header, ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `PM_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} baris diekspor ke CSV`);
  }, [rows]);

  const handlePrint = () => window.print();

  // stats
  const stats = useMemo(() => {
    const withSpeedtest = filtered.filter(t => t.speedtest).length;
    const uniqueTowers  = new Set(filtered.map(t => t.idBTS)).size;
    const uniquePromotor = new Set(filtered.map(t => t.promotor)).size;
    return { total: filtered.length, withSpeedtest, uniqueTowers, uniquePromotor };
  }, [filtered]);

  return (
    <PageContainer>
      {/* Inject print style */}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/report"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              ← Laporan
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PM Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Post SP Seeding Execution — {isLoading ? "Memuat…" : `${filtered.length} dari ${data.length} transaksi`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] })}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={!rows.length}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-border/60 bg-card hover:bg-muted transition-all active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 no-print">
          {[
            { label: "Total Aktivasi",    value: String(stats.total),         color: "#3b82f6" },
            { label: "Unique Tower",       value: String(stats.uniqueTowers),  color: "#10b981" },
            { label: "Promotor Aktif",     value: String(stats.uniquePromotor),color: "#f59e0b" },
            { label: "Ada Speedtest",      value: String(stats.withSpeedtest), color: "#8b5cf6" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl bg-card border border-border/60 px-4 py-3 flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Wifi className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight tabular-nums" style={{ color }}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter ──────────────────────────────────────────────────── */}
      <PMFilterPanel
        filter={local}
        setFilter={v => setLocal(v)}
        opts={opts}
        total={data.length}
        matched={filtered.length}
      />

      {/* ── Printable Report ────────────────────────────────────────── */}
      <div id="pm-report-printable" ref={printRef}>

        {/* Report title — terlihat di print & layar */}
        <div
          className="px-1 mb-3"
          style={{ borderLeft: "4px solid #1e3a6e" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "#1e3a6e" }}>
            PM Reporting – Post SP Seeding Execution
          </h2>
          {local.dateFrom || local.dateTo ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Periode: {local.dateFrom || "—"} s/d {local.dateTo || "—"}
            </p>
          ) : null}
          {local.supervisor && (
            <p className="text-xs text-muted-foreground">Supervisor: {local.supervisor}</p>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <PMTable rows={rows} isLoading={isLoading} />

          {/* Footer */}
          {!isLoading && rows.length > 0 && (
            <div className="px-4 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground no-print">
              <span>
                Menampilkan <b>{rows.length}</b> baris
              </span>
              <span>
                Generated: {new Date().toLocaleDateString("id-ID", { dateStyle: "medium" })}
              </span>
            </div>
          )}
        </div>

        {/* Signature block untuk print */}
        <div className="hidden print:grid grid-cols-3 gap-8 mt-10 px-2">
          {["Dibuat Oleh", "Diperiksa Oleh", "Disetujui Oleh"].map(label => (
            <div key={label} className="text-center">
              <div style={{ borderBottom: "1px solid #1e3a6e", height: "48px", marginBottom: "6px" }} />
              <p className="text-xs font-semibold" style={{ color: "#1e3a6e" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
