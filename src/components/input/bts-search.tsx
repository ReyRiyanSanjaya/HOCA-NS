"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Radio, MapPin, Layers, User, Calendar, Package, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MasterBTS } from "@/types";

interface BTSSearchProps {
  btsData: MasterBTS[];
  selectedBTS: MasterBTS | null;
  onSelect: (bts: MasterBTS | null) => void;
  error?: string;
}

export function BTSSearch({ btsData, selectedBTS, onSelect, error }: BTSSearchProps) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return btsData.slice(0, 40);
    return btsData
      .filter((b) =>
        b.id.toLowerCase().includes(q) ||
        b.towerName.toLowerCase().includes(q) ||
        b.kabupaten.toLowerCase().includes(q) ||
        b.cluster.toLowerCase().includes(q) ||
        b.spm.toLowerCase().includes(q) ||
        b.spv.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [query, btsData]);

  const handleSelect = (bts: MasterBTS) => {
    onSelect(bts);
    setQuery("");
    setOpen(false);
  };

  if (selectedBTS) {
    return (
      <div className="space-y-1.5">
        <Label>ID BTS <span className="text-destructive">*</span></Label>

        {/* Selected card */}
        <div className={cn(
          "rounded-2xl border bg-card overflow-hidden",
          "border-primary/30 shadow-sm"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 gradient-blue">
            <div className="flex items-center gap-2.5 min-w-0">
              <Radio className="h-5 w-5 text-white shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">{selectedBTS.id}</p>
                <p className="text-xs text-white/80 truncate">{selectedBTS.towerName || "—"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="h-7 w-7 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all shrink-0"
              aria-label="Ganti BTS"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-0 text-xs divide-x divide-y divide-border/40">
            {[
              { icon: MapPin,   label: "Kabupaten", value: selectedBTS.kabupaten },
              { icon: Layers,   label: "Cluster",   value: selectedBTS.cluster },
              { icon: User,     label: "PM",         value: selectedBTS.spm },
              { icon: User,     label: "SPV",        value: selectedBTS.spv },
              { icon: MapPin,   label: "Koordinat",  value: `${selectedBTS.latitude}, ${selectedBTS.longitude}` },
              { icon: Calendar, label: "OA Date",    value: selectedBTS.newTowerOADate || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2 px-3 py-2.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-semibold truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Qty seeding */}
          {selectedBTS.qtySPSeedingByBrands && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <Package className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Qty SP Seeding:</span>
              <span className="text-xs font-semibold">{selectedBTS.qtySPSeedingByBrands}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>ID BTS <span className="text-destructive">*</span></Label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          placeholder="Cari Tower ID, Tower Name, Kabupaten, Cluster…"
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-2xl border bg-muted/30 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            "transition-all duration-200",
            error ? "border-destructive" : "border-border/60"
          )}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden">
            <ScrollArea className="max-h-64">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-center text-muted-foreground">
                  Tidak ada BTS yang ditemukan
                </div>
              ) : (
                <div className="p-1.5">
                  {filtered.map((bts) => (
                    <button
                      key={bts.id}
                      type="button"
                      onClick={() => handleSelect(bts)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate text-primary">{bts.id}</p>
                          <p className="text-xs text-muted-foreground truncate">{bts.towerName}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground">{bts.kabupaten}</p>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{bts.cluster}</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                  {btsData.length > 40 && !query && (
                    <p className="text-[10px] text-center text-muted-foreground py-2">
                      Ketik untuk cari lebih banyak dari {btsData.length} BTS
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
