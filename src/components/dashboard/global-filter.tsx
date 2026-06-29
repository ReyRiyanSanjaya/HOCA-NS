"use client";

import React, { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilterStore } from "@/stores/filter-store";
import { useMasterBTS, useMasterPromotor, useMasterSPV } from "@/hooks/use-master-data";
import { BRANDS } from "@/lib/config";

export function GlobalFilter() {
  const { filter, setFilter, resetFilter } = useFilterStore();
  const [expanded, setExpanded] = useState(false);
  const { data: btsData } = useMasterBTS();
  const { data: promotorData } = useMasterPromotor();
  const { data: spvData } = useMasterSPV();

  const kabupatenList = [...new Set(btsData?.map((b) => b.kabupaten) || [])].sort();
  const clusterList = [...new Set(btsData?.map((b) => b.cluster) || [])].sort();
  const pmList = [...new Set(btsData?.map((b) => b.spm) || [])].sort();
  const supervisorList = [...new Set(spvData?.map((s) => s.namaSPV) || [])].sort();
  const promotorList = [...new Set(promotorData?.map((p) => p.namaPromotor) || [])].sort();

  const activeFilters = Object.values(filter).filter(Boolean).length;

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        {/* Top row: search + toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keyword..."
              className="pl-9 h-9"
              value={filter.keyword}
              onChange={(e) => setFilter({ keyword: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1 shrink-0 h-9"
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFilters > 0 && (
              <Badge variant="default" className="h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full">
                {activeFilters}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilter} className="h-9 px-2">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
            {/* Date Range */}
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filter.dateTo}
                onChange={(e) => setFilter({ dateTo: e.target.value })}
              />
            </div>

            {/* Supervisor */}
            <div className="space-y-1">
              <Label className="text-xs">Supervisor</Label>
              <Select
                value={filter.supervisor || "all"}
                onValueChange={(v) => setFilter({ supervisor: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {supervisorList.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Promotor */}
            <div className="space-y-1">
              <Label className="text-xs">Promotor</Label>
              <Select
                value={filter.promotor || "all"}
                onValueChange={(v) => setFilter({ promotor: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {promotorList.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <Label className="text-xs">Brand</Label>
              <Select
                value={filter.brand || "all"}
                onValueChange={(v) => setFilter({ brand: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kabupaten */}
            <div className="space-y-1">
              <Label className="text-xs">Kabupaten</Label>
              <Select
                value={filter.kabupaten || "all"}
                onValueChange={(v) => setFilter({ kabupaten: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {kabupatenList.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cluster */}
            <div className="space-y-1">
              <Label className="text-xs">Cluster</Label>
              <Select
                value={filter.cluster || "all"}
                onValueChange={(v) => setFilter({ cluster: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {clusterList.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PM */}
            <div className="space-y-1">
              <Label className="text-xs">PM</Label>
              <Select
                value={filter.pm || "all"}
                onValueChange={(v) => setFilter({ pm: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {pmList.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs">Status Tower</Label>
              <Select
                value={filter.statusTower || "all"}
                onValueChange={(v) => setFilter({ statusTower: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Problem">Problem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
