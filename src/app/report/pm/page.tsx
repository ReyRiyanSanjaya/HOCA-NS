"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Download, Search, RefreshCw, X,
  SlidersHorizontal, ChevronDown, ChevronUp,
  FileText, Users, Wifi,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast }          from "sonner";
import Link               from "next/link";
import { PageContainer }  from "@/components/layout/page-container";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import { Skeleton }       from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/use-dashboard";
import { useMasterBTS }    from "@/hooks/use-master-data";
import { useFilterStore }  from "@/stores/filter-store";
import { CACHE_KEYS, BRANDS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Transaction, MasterBTS } from "@/types";

// ─── types ─────────────────────────────────────────────────────────────────────
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

// Satu baris di tabel = akumulasi aktivasi promotor pada 1 hari tertentu
interface PMAccRow {
  no: number;
  tanggal: string;           // "2026-06-22"
  tanggalFmt: string;        // "22 Jun'26"
  promotor: string;
  supervisor: string;
  brand: string;
  towerIds: string[];        // daftar tower unik di hari itu
  speedtests: string[];      // daftar speedtest di hari itu
  aktivasiHariIni: number;   // jumlah aktivasi hari itu
  saldoAwal: number;         // akumulasi s/d hari sebelumnya
  saldoAkhir: number;        // saldoAwal + aktivasiHariIni
  remark: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────────
function fmtTanggal(raw: string): string {
  if (!raw) return "—";
  try {
    const [y, m, d] = raw.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d} ${months[m - 1]}'${String(y).slice(2)}`;
  } catch { return raw; }
}

/**
 * Akumulasikan transaksi menjadi baris per (promotor × tanggal),
 * hitung saldo awal & akhir running per promotor.
 */
function buildAccRows(transactions: Transaction[]): PMAccRow[] {
  // Group: promotor → tanggal → list tx
  const map = new Map<string, Map<string, Transaction[]>>();
  for (const tx of transactions) {
    const key  = tx.promotor || "(Tanpa Nama)";
    const tgl  = tx.tanggal  || "0000-00-00";
    if (!map.has(key)) map.set(key, new Map());
    const dayMap = map.get(key)!;
    if (!dayMap.has(tgl)) dayMap.set(tgl, []);
    dayMap.get(tgl)!.push(tx);
  }

  const result: PMAccRow[] = [];
  let no = 1;

  // Iterasi tiap promotor, urutkan tanggal ascending
  for (const [promotor, dayMap] of map) {
    const sortedDays = [...dayMap.keys()].sort();
    let running = 0;

    for (const tgl of sortedDays) {
      const txList = dayMap.get(tgl)!;
      const count  = txList.length;
      const towerIds   = [...new Set(txList.map(t => t.idBTS).filter(Boolean))];
      const speedtests = txList.map(t => t.speedtest).filter(Boolean);
      const supervisor = txList[0]?.supervisor || "";
      const brand      = txList[0]?.brand      || "";

      result.push({
        no:               no++,
        tanggal:          tgl,
        tanggalFmt:       fmtTanggal(tgl),
        promotor,
        supervisor,
        brand,
        towerIds,
        speedtests,
        aktivasiHariIni:  count,
        saldoAwal:        running,
        saldoAkhir:       running + count,
        remark:           "",
      });
      running += count;
    }
  }

  // Sort final: tanggal asc, lalu promotor asc
  result.sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal) ||
    a.promotor.localeCompare(b.promotor)
  );
  // Re-number setelah sort
  result.forEach((r, i) => { r.no = i + 1; });

  return result;
}

// ─── Excel export ───────────────────────────────────────────────────────────────
function exportToExcel(rows: PMAccRow[], filterInfo: PMFilter) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: PM Report ──────────────────────────────────────────────────────
  const HEADERS = [
    "No",
    "Tanggal Seeding Execution",
    "Tower ID",
    "Speedtest Result",
    "Promotor Name",
    "Brand",
    "Supervisor",
    "Aktivasi Hari Ini",
    "Saldo Awal",
    "Saldo Akhir",
    "Remark",
  ];

  const sheetData: (string | number)[][] = [
    // Judul
    ["PM Reporting – Post SP Seeding Execution"],
    [filterInfo.dateFrom || filterInfo.dateTo
      ? `Periode: ${filterInfo.dateFrom || "—"} s/d ${filterInfo.dateTo || "—"}`
      : `Generated: ${new Date().toLocaleDateString("id-ID")}`],
    [], // baris kosong
    HEADERS,
    ...rows.map(r => [
      r.no,
      r.tanggalFmt,
      r.towerIds.join(", ") || "—",
      r.speedtests.length ? r.speedtests.map(s =>
        s.toLowerCase().includes("mbps") ? s : `${s} Mbps`
      ).join(", ") : "—",
      r.promotor,
      r.brand,
      r.supervisor,
      r.aktivasiHariIni,
      r.saldoAwal,
      r.saldoAkhir,
      r.remark,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Lebar kolom
  ws["!cols"] = [
    { wch: 5  },  // No
    { wch: 22 },  // Tanggal
    { wch: 30 },  // Tower ID
    { wch: 22 },  // Speedtest
    { wch: 24 },  // Promotor Name
    { wch: 12 },  // Brand
    { wch: 22 },  // Supervisor
    { wch: 16 },  // Aktivasi
    { wch: 12 },  // Saldo Awal
    { wch: 12 },  // Saldo Akhir
    { wch: 28 },  // Remark
  ];

  XLSX.utils.book_append_sheet(wb, ws, "PM Report");

  // ── Sheet 2: Rekap per Promotor ─────────────────────────────────────────────
  const promotorMap = new Map<string, { total: number; supervisor: string; brand: string }>();
  for (const r of rows) {
    const prev = promotorMap.get(r.promotor);
    if (!prev) {
      promotorMap.set(r.promotor, { total: r.aktivasiHariIni, supervisor: r.supervisor, brand: r.brand });
    } else {
      prev.total += r.aktivasiHariIni;
    }
  }

  const rekapData: (string | number)[][] = [
    ["Rekap Akumulasi per Promotor"],
    [],
    ["No", "Promotor Name", "Supervisor", "Brand", "Total Aktivasi"],
    ...[...promotorMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, val], i) => [i + 1, name, val.supervisor, val.brand, val.total]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(rekapData);
  ws2["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Rekap Promotor");

  // Download
  const filename = `PM_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success(`${rows.length} baris diekspor ke Excel`);
}

// ─── Filter Panel ──────────────────────────────────────────────────────────────
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
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm mb-4 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari Tower ID, promotor, supervisor…"
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
            open || activeCount > 0 ? "gradient-blue text-white shadow-md" : "bg-muted/60 hover:bg-muted text-muted-foreground"
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
          <button onClick={reset}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-4 pt-3 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "Dari",       type: "date", key: "dateFrom" as const },
              { label: "Sampai",     type: "date", key: "dateTo"   as const },
            ].map(({ label, type, key }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
                <Input type={type} className="h-8 text-xs rounded-xl border-border/60"
                  value={filter[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
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

// ─── Table Preview ─────────────────────────────────────────────────────────────
function PMTable({ rows, isLoading }: { rows: PMAccRow[]; isLoading: boolean }) {
  const COLS = [
    { label: "No",                       cls: "w-10 text-center" },
    { label: "Tanggal Seeding",          cls: "min-w-[110px] text-center" },
    { label: "Tower ID",                 cls: "min-w-[160px]" },
    { label: "Speedtest Result",         cls: "min-w-[130px] text-center" },
    { label: "Promotor Name",            cls: "min-w-[140px]" },
    { label: "Brand",                    cls: "min-w-[80px] text-center" },
    { label: "Aktivasi\nHari Ini",       cls: "min-w-[80px] text-center" },
    { label: "Saldo Awal",               cls: "min-w-[80px] text-center" },
    { label: "Saldo Akhir",              cls: "min-w-[80px] text-center" },
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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-20" />
        <p className="text-sm">Tidak ada data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {COLS.map(col => (
              <th key={col.label}
                className={cn("border px-3 py-2.5 text-center text-[11px] font-bold text-white whitespace-pre-line", col.cls)}
                style={{ background: "#1e3a6e", borderColor: "#1e3a6e" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.promotor}-${r.tanggal}`}
              style={{ background: idx % 2 === 0 ? "#ffffff" : "#f0f4ff" }}>
              <td className="border px-2 py-2.5 text-center font-semibold" style={{ borderColor: "#c5d0e6", color: "#1e3a6e" }}>{r.no}</td>
              <td className="border px-3 py-2.5 text-center tabular-nums" style={{ borderColor: "#c5d0e6" }}>{r.tanggalFmt}</td>
              <td className="border px-3 py-2.5 font-mono text-[10px]" style={{ borderColor: "#c5d0e6", color: "#1e3a6e" }}>
                {r.towerIds.length > 0 ? r.towerIds.join(", ") : "—"}
              </td>
              <td className="border px-3 py-2.5 text-center" style={{ borderColor: "#c5d0e6", color: r.speedtests.length ? "#0d6efd" : "#9ca3af" }}>
                {r.speedtests.length
                  ? r.speedtests.map(s => s.toLowerCase().includes("mbps") ? s : `${s} Mbps`).join(", ")
                  : "—"}
              </td>
              <td className="border px-3 py-2.5 font-medium" style={{ borderColor: "#c5d0e6" }}>{r.promotor}</td>
              <td className="border px-3 py-2.5 text-center font-semibold" style={{ borderColor: "#c5d0e6", color: "#6d28d9" }}>{r.brand || "—"}</td>
              <td className="border px-3 py-2.5 text-center font-bold text-blue-700" style={{ borderColor: "#c5d0e6" }}>{r.aktivasiHariIni}</td>
              <td className="border px-3 py-2.5 text-center tabular-nums text-muted-foreground" style={{ borderColor: "#c5d0e6" }}>{r.saldoAwal}</td>
              <td className="border px-3 py-2.5 text-center font-bold text-green-700" style={{ borderColor: "#c5d0e6" }}>{r.saldoAkhir}</td>
            </tr>
          ))}
        </tbody>
        {/* Total row */}
        <tfoot>
          <tr style={{ background: "#e8f0fe" }}>
            <td colSpan={6} className="border px-3 py-2.5 text-right font-bold text-[11px]" style={{ borderColor: "#c5d0e6", color: "#1e3a6e" }}>
              TOTAL
            </td>
            <td className="border px-3 py-2.5 text-center font-bold text-blue-800" style={{ borderColor: "#c5d0e6" }}>
              {rows.reduce((s, r) => s + r.aktivasiHariIni, 0)}
            </td>
            <td className="border px-3 py-2.5" style={{ borderColor: "#c5d0e6" }} />
            <td className="border px-3 py-2.5 text-center font-bold text-green-800" style={{ borderColor: "#c5d0e6" }}>
              {Math.max(...rows.map(r => r.saldoAkhir), 0)}
            </td>
          </tr>
        </tfoot>
      </table>
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

  // apply filter to raw transactions
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
        (t.tanggal || "").includes(q)
      );
    }
    return list;
  }, [data, local]);

  // build accumulated rows
  const accRows = useMemo(() => buildAccRows(filtered), [filtered]);

  const opts = useMemo(() => ({
    supervisors: [...new Set(data.map(t => t.supervisor).filter(Boolean))].sort() as string[],
    promotors:   [...new Set(data.map(t => t.promotor).filter(Boolean))].sort() as string[],
  }), [data]);

  const handleExportExcel = useCallback(() => {
    if (!accRows.length) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    exportToExcel(accRows, local);
  }, [accRows, local]);

  // stats
  const stats = useMemo(() => {
    const totalAktivasi = accRows.reduce((s, r) => s + r.aktivasiHariIni, 0);
    const uniquePromotor = new Set(accRows.map(r => r.promotor)).size;
    const uniqueTower    = new Set(filtered.map(t => t.idBTS)).size;
    const withSpeedtest  = filtered.filter(t => t.speedtest).length;
    return { totalAktivasi, uniquePromotor, uniqueTower, withSpeedtest };
  }, [accRows, filtered]);

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/report"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              ← Laporan
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PM Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Post SP Seeding Execution — Akumulasi per promotor per hari
          </p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Memuat…</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {accRows.length} baris akumulasi dari {filtered.length} transaksi
            </p>
          )}
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
            onClick={handleExportExcel}
            disabled={!accRows.length}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 disabled:opacity-40 shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {[
            { label: "Total Aktivasi",    value: String(stats.totalAktivasi),   color: "#3b82f6", icon: Wifi },
            { label: "Promotor Aktif",    value: String(stats.uniquePromotor),  color: "#f59e0b", icon: Users },
            { label: "Unique Tower",      value: String(stats.uniqueTower),     color: "#10b981", icon: FileText },
            { label: "Ada Speedtest",     value: String(stats.withSpeedtest),   color: "#8b5cf6", icon: Wifi },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-card border border-border/60 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon className="h-4 w-4" style={{ color }} />
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
      <PMFilterPanel filter={local} setFilter={v => setLocal(v)}
        opts={opts} total={data.length} matched={filtered.length} />

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: "#1e3a6e" }}>
              PM Reporting – Post SP Seeding Execution
            </p>
            {local.dateFrom || local.dateTo ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Periode: {local.dateFrom || "—"} s/d {local.dateTo || "—"}
              </p>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", { dateStyle: "medium" })}
          </p>
        </div>

        <PMTable rows={accRows} isLoading={isLoading} />

        {!isLoading && accRows.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Menampilkan <b>{accRows.length}</b> baris akumulasi</span>
            <span>Saldo akhir maksimal: <b className="text-green-700">{Math.max(...accRows.map(r => r.saldoAkhir), 0)}</b></span>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
