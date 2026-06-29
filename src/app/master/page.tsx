"use client";

import React, { useState } from "react";
import { RefreshCw, Search, Upload, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }  from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportDialog } from "@/components/master/import-dialog";
import { AdminGuard }   from "@/components/auth/admin-guard";
import { useMasterBTS, useMasterPromotor, useMasterSPV } from "@/hooks/use-master-data";
import { CACHE_KEYS } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ImportTarget } from "@/types";

// ── Wrapper: guard wraps content ───────────────────────────────────────────
export default function MasterPage() {
  return (
    <AdminGuard pageName="Master Data">
      <MasterPageContent />
    </AdminGuard>
  );
}

// ── Actual content ─────────────────────────────────────────────────────────
function MasterPageContent() {
  const queryClient = useQueryClient();
  const { data: btsData = [],      isLoading: btsLoading }      = useMasterBTS();
  const { data: promotorData = [], isLoading: promotorLoading } = useMasterPromotor();
  const { data: spvData = [],      isLoading: spvLoading }      = useMasterSPV();

  const [btsSearch,      setBtsSearch]      = useState("");
  const [promotorSearch, setPromotorSearch] = useState("");
  const [spvSearch,      setSpvSearch]      = useState("");
  const [importTarget,   setImportTarget]   = useState<ImportTarget>("bts");
  const [importOpen,     setImportOpen]     = useState(false);

  const openImport = (target: ImportTarget) => {
    setImportTarget(target);
    setImportOpen(true);
  };

  const filteredBTS = btsData.filter(
    (b) => !btsSearch || [b.id, b.towerName, b.kabupaten, b.cluster, b.spm]
      .some((v) => v?.toLowerCase().includes(btsSearch.toLowerCase()))
  );
  const filteredPromotor = promotorData.filter(
    (p) => !promotorSearch || [p.namaPromotor, p.spv, p.area]
      .some((v) => v?.toLowerCase().includes(promotorSearch.toLowerCase()))
  );
  const filteredSPV = spvData.filter(
    (s) => !spvSearch || [s.namaSPV, s.area]
      .some((v) => v?.toLowerCase().includes(spvSearch.toLowerCase()))
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterBTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterPromotor] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterSPV] });
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl gradient-indigo flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Master Data</h1>
            <p className="text-xs text-muted-foreground">Admin only · Data dari Google Sheets</p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
            bg-card border border-border/60 hover:bg-muted/50 shadow-sm
            transition-all duration-200 active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <Tabs defaultValue="bts">
        {/* Tab bar */}
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl p-1 bg-muted/60">
          <TabsTrigger value="bts" className="rounded-xl text-xs font-semibold gap-1.5">
            BTS
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1
              rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {btsData.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="promotor" className="rounded-xl text-xs font-semibold gap-1.5">
            Promotor
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1
              rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {promotorData.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="spv" className="rounded-xl text-xs font-semibold gap-1.5">
            SPV
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1
              rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {spvData.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── BTS ─────────────────────────────────── */}
        <TabsContent value="bts" className="mt-4 animate-fade-up">
          <Card>
            <CardHeader className="pb-3 px-3 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari ID BTS, Tower, Kabupaten…" className="pl-9 h-9 rounded-xl" value={btsSearch} onChange={(e) => setBtsSearch(e.target.value)} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{filteredBTS.length}</span>
                <button
                  onClick={() => openImport("bts")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                    gradient-blue text-white shadow-md shadow-blue-500/25
                    transition-all active:scale-95 shrink-0"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                loading={btsLoading}
                empty={!btsSearch ? "Belum ada data · klik Import untuk upload CSV" : "Tidak ada hasil"}
                headers={["Tower ID", "Tower Name", "Kabupaten", "Cluster", "PM", "SPV", "Status"]}
                rows={filteredBTS.slice(0, 200).map((b) => [
                  <span key="id" className="font-semibold text-primary">{b.id}</span>,
                  b.towerName,
                  b.kabupaten,
                  b.cluster,
                  b.spm,
                  b.spv,
                  <Badge key="s" variant={b.statusTower === "Active" ? "success" : b.statusTower === "Problem" ? "destructive" : "warning"} className="text-xs">{b.statusTower || "—"}</Badge>,
                ])}
                colSpan={7}
              />
              {filteredBTS.length > 200 && <p className="text-xs text-center text-muted-foreground py-3">Tampil 200 dari {filteredBTS.length}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROMOTOR ─────────────────────────────── */}
        <TabsContent value="promotor" className="mt-4 animate-fade-up">
          <Card>
            <CardHeader className="pb-3 px-3 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari nama, SPV, area…" className="pl-9 h-9 rounded-xl" value={promotorSearch} onChange={(e) => setPromotorSearch(e.target.value)} />
                </div>
                <button
                  onClick={() => openImport("promotor")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                    gradient-green text-white shadow-md shadow-green-500/25
                    transition-all active:scale-95 shrink-0"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                loading={promotorLoading}
                empty={!promotorSearch ? "Belum ada data · klik Import" : "Tidak ada hasil"}
                headers={["Nama Promotor", "SPV", "Area", "Status"]}
                rows={filteredPromotor.map((p, i) => [
                  <span key={i} className="font-medium">{p.namaPromotor}</span>,
                  p.spv,
                  p.area,
                  <Badge key="s" variant={p.status === "Active" ? "success" : "secondary"} className="text-xs">{p.status || "Active"}</Badge>,
                ])}
                colSpan={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SPV ──────────────────────────────────── */}
        <TabsContent value="spv" className="mt-4 animate-fade-up">
          <Card>
            <CardHeader className="pb-3 px-3 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari nama SPV, area…" className="pl-9 h-9 rounded-xl" value={spvSearch} onChange={(e) => setSpvSearch(e.target.value)} />
                </div>
                <button
                  onClick={() => openImport("spv")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                    gradient-purple text-white shadow-md shadow-purple-500/25
                    transition-all active:scale-95 shrink-0"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                loading={spvLoading}
                empty={!spvSearch ? "Belum ada data · klik Import" : "Tidak ada hasil"}
                headers={["Nama SPV", "Area"]}
                rows={filteredSPV.map((s) => [
                  <span key="n" className="font-medium">{s.namaSPV}</span>,
                  s.area,
                ])}
                colSpan={2}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportDialog open={importOpen} target={importTarget} onClose={() => setImportOpen(false)} />
    </PageContainer>
  );
}

// ── Reusable table component ───────────────────────────────────────────────
function DataTable({
  loading, empty, headers, rows, colSpan,
}: {
  loading: boolean;
  empty: string;
  headers: string[];
  rows: React.ReactNode[][];
  colSpan: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                <td colSpan={colSpan} className="px-3 py-3">
                  <Skeleton className="h-4 w-full rounded-lg" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-center py-12 text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                {cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 max-w-40 truncate">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
