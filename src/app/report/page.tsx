"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Copy,
  RefreshCw,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/use-dashboard";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS } from "@/lib/config";
import { formatDateTime, formatDistance } from "@/lib/utils";
import type { Transaction } from "@/types";

type SortKey = keyof Transaction;
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

const COLUMNS: { key: keyof Transaction; label: string; width?: string }[] = [
  { key: "tanggal", label: "Date", width: "100px" },
  { key: "jam", label: "Time", width: "80px" },
  { key: "supervisor", label: "Supervisor", width: "130px" },
  { key: "promotor", label: "Promotor", width: "130px" },
  { key: "brand", label: "Brand", width: "90px" },
  { key: "idBTS", label: "ID BTS", width: "120px" },
  { key: "mdn", label: "MDN", width: "120px" },
  { key: "distanceFromBTS", label: "Distance", width: "100px" },
  { key: "status", label: "Status", width: "90px" },
];

export default function ReportPage() {
  const { filter } = useFilterStore();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useTransactions(filter);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tanggal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (tx) =>
        tx.idBTS.toLowerCase().includes(q) ||
        tx.promotor.toLowerCase().includes(q) ||
        tx.supervisor.toLowerCase().includes(q) ||
        tx.brand.toLowerCase().includes(q) ||
        tx.mdn.toLowerCase().includes(q) ||
        tx.tanggal?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const cmp = String(av) < String(bv) ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportCSV = useCallback(() => {
    const visibleCols = COLUMNS.filter((c) => !hiddenColumns.has(c.key));
    const header = visibleCols.map((c) => c.label).join(",");
    const rows = sorted.map((tx) =>
      visibleCols
        .map((c) => {
          const v = tx[c.key];
          if (c.key === "distanceFromBTS") return formatDistance(Number(v));
          return `"${String(v || "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [sorted, hiddenColumns]);

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(sorted, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported");
  }, [sorted]);

  const handlePrint = () => window.print();

  const handleCopy = useCallback(() => {
    const text = sorted
      .map((tx) => `${tx.tanggal}\t${tx.supervisor}\t${tx.promotor}\t${tx.brand}\t${tx.idBTS}\t${tx.mdn}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [sorted]);

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Report</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {sorted.length} records found
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] })}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">JSON</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GlobalFilter />

      <Card>
        <CardHeader className="pb-3">
          {/* Search + column toggle */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in table..."
                className="pl-9 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex gap-1">
              {COLUMNS.map((col) => (
                <Button
                  key={col.key}
                  variant={hiddenColumns.has(col.key) ? "ghost" : "outline"}
                  size="sm"
                  className={`h-8 text-xs gap-1 ${hiddenColumns.has(col.key) ? "opacity-50" : ""}`}
                  onClick={() => toggleColumn(col.key)}
                >
                  <EyeOff className="h-3 w-3" />
                  {col.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
                  {COLUMNS.filter((c) => !hiddenColumns.has(c.key)).map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Photo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3" colSpan={COLUMNS.length + 2}>
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 2}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginated.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      {COLUMNS.filter((c) => !hiddenColumns.has(c.key)).map((col) => (
                        <td key={col.key} className="px-3 py-3 text-xs">
                          {col.key === "distanceFromBTS" ? (
                            <span className={Number(tx[col.key]) > 500 ? "text-red-500" : "text-green-600 dark:text-green-400"}>
                              {formatDistance(Number(tx[col.key]))}
                            </span>
                          ) : col.key === "status" ? (
                            <Badge
                              variant={tx.status === "Success" ? "success" : "warning"}
                              className="text-xs"
                            >
                              {tx.status || "Pending"}
                            </Badge>
                          ) : col.key === "brand" ? (
                            <Badge variant="info" className="text-xs">
                              {tx.brand}
                            </Badge>
                          ) : (
                            <span className="truncate block max-w-32">
                              {String(tx[col.key] || "-")}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        {tx.photoURL ? (
                          <a
                            href={tx.photoURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-input rounded-lg px-2 py-1 bg-background text-foreground text-xs"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span>
                {Math.min((currentPage - 1) * pageSize + 1, sorted.length)}–
                {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
