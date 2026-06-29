"use client";

import React, { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFilterStore } from "@/stores/filter-store";
import { useMasterBTS, useMasterPromotor, useMasterSPV } from "@/hooks/use-master-data";
import { BRANDS } from "@/lib/config";
import { cn } from "@/lib/utils";

export function GlobalFilter() {
  const { filter, setFilter, resetFilter } = useFilterStore();
  const [expanded, setExpanded] = useState(false);
  const { data: btsData }      = useMasterBTS();
  const { data: promotorData } = useMasterPromotor();
  const { data: spvData }      = useMasterSPV();

  const kabupatenList  = [...new Set(btsData?.map((b) => b.kabupaten)     || [])].sort();
  const clusterList    = [...new Set(btsData?.map((b) => b.cluster)       || [])].sort();
  const pmList         = [...new Set(btsData?.map((b) => b.spm)           || [])].sort();
  const supervisorList = [...new Set(spvData?.map((s) => s.namaSPV)       || [])].sort();
  const promotorList   = [...new Set(promotorData?.map((p) => p.namaPromotor) || [])].sort();

  const activeFilters = Object.values(filter).filter(Boolean).length;

  return (
    <div className={cn(
      "rounded-2xl border border-border/60 bg-card shadow-sm mb-5",
      "overflow-hidden transition-all duration-300"
    )}>
      {/* Top row */}
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari keyword…"
            className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            value={filter.keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
          />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold",
            "transition-all duration-200 active:scale-95",
            expanded || activeFilters > 0
              ? "gradient-blue text-white shadow-md shadow-blue-500/25"
              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {activeFilters > 0 && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold">
              {activeFilters}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {activeFilters > 0 && (
          <button
            onClick={resetFilter}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10
              text-destructive hover:bg-destructive/20 transition-colors"
            title="Reset filter"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilters > 0 && !expanded && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {Object.entries(filter).map(([key, value]) =>
            value ? (
              <Badge
                key={key}
                variant="secondary"
                className="text-[10px] gap-1 pl-2 pr-1 py-0.5 rounded-full"
              >
                {value}
                <button
                  onClick={() => setFilter({ [key]: "" })}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ) : null
          )}
        </div>
      )}

      {/* Expanded filters */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/40 pt-3 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">

            {/* Date range */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Dari</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={filter.dateFrom}
                onChange={(e) => setFilter({ dateFrom: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sampai</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={filter.dateTo}
                onChange={(e) => setFilter({ dateTo: e.target.value })} />
            </div>

            {[
              { label: "Supervisor", key: "supervisor", list: supervisorList },
              { label: "Promotor",   key: "promotor",   list: promotorList },
              { label: "Kabupaten",  key: "kabupaten",  list: kabupatenList },
              { label: "Cluster",    key: "cluster",    list: clusterList },
              { label: "PM",         key: "pm",         list: pmList },
            ].map(({ label, key, list }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {label}
                </Label>
                <Select
                  value={(filter as unknown as Record<string, string>)[key] || "all"}
                  onValueChange={(v) => setFilter({ [key]: v === "all" ? "" : v } as Partial<typeof filter>)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border/60">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {list.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Brand */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Brand</Label>
              <Select
                value={filter.brand || "all"}
                onValueChange={(v) => setFilter({ brand: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Status</Label>
              <Select
                value={filter.statusTower || "all"}
                onValueChange={(v) => setFilter({ statusTower: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/60">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Problem">Problem</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {activeFilters > 0 && (
            <button
              onClick={resetFilter}
              className="mt-3 text-xs text-muted-foreground hover:text-destructive
                underline underline-offset-2 transition-colors"
            >
              Reset semua filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
