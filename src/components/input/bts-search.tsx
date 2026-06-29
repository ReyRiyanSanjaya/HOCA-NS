"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MasterBTS } from "@/types";

interface BTSSearchProps {
  btsData: MasterBTS[];
  selectedBTS: MasterBTS | null;
  onSelect: (bts: MasterBTS | null) => void;
  error?: string;
}

export function BTSSearch({
  btsData,
  selectedBTS,
  onSelect,
  error,
}: BTSSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return btsData.slice(0, 50);
    const q = query.toLowerCase();
    return btsData
      .filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.towerName.toLowerCase().includes(q) ||
          b.kabupaten.toLowerCase().includes(q) ||
          b.cluster.toLowerCase().includes(q) ||
          b.spm.toLowerCase().includes(q) ||
          b.spv.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [query, btsData]);

  const handleSelect = (bts: MasterBTS) => {
    onSelect(bts);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery("");
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>
        ID BTS <span className="text-destructive">*</span>
      </Label>

      {/* Selected BTS info */}
      {selectedBTS ? (
        <div className="rounded-xl border border-input bg-muted/50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedBTS.id}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedBTS.towerName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">Kabupaten: </span>
              <span className="font-medium">{selectedBTS.kabupaten}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cluster: </span>
              <span className="font-medium">{selectedBTS.cluster}</span>
            </div>
            <div>
              <span className="text-muted-foreground">PM: </span>
              <span className="font-medium">{selectedBTS.spm}</span>
            </div>
            <div>
              <span className="text-muted-foreground">SPV: </span>
              <span className="font-medium">{selectedBTS.spv}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lat: </span>
              <span className="font-medium">{selectedBTS.latitude}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lng: </span>
              <span className="font-medium">{selectedBTS.longitude}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">OA Date: </span>
              <span className="font-medium">{selectedBTS.newTowerOADate || "-"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Qty SP Seeding: </span>
              <span className="font-medium">{selectedBTS.qtySPSeedingByBrands || "-"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            placeholder="Search by ID BTS, Tower Name, Kabupaten, Cluster..."
            className={cn("pl-9 pr-9", error && "border-destructive")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
              <ScrollArea className="max-h-72">
                {filtered.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    No BTS found
                  </div>
                ) : (
                  <div className="p-1">
                    {filtered.map((bts) => (
                      <button
                        key={bts.id}
                        type="button"
                        onClick={() => handleSelect(bts)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-accent-foreground">
                              {bts.id}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {bts.towerName}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">
                              {bts.kabupaten}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bts.cluster}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {btsData.length > 50 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        Type to search more...
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
