"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Radio, MapPin, Layers, User,
  Calendar, Package, ChevronDown, Loader2,
} from "lucide-react";
import { Label }      from "@/components/ui/label";
import { Badge }      from "@/components/ui/badge";
import { cn }         from "@/lib/utils";
import type { MasterBTS } from "@/types";

interface BTSSearchProps {
  btsData:     MasterBTS[];
  selectedBTS: MasterBTS | null;
  onSelect:    (bts: MasterBTS | null) => void;
  error?:      string;
  loading?:    boolean;
}

export function BTSSearch({ btsData, selectedBTS, onSelect, error, loading }: BTSSearchProps) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!btsData || btsData.length === 0) return [];
    if (!q) return btsData.slice(0, 50);
    return btsData
      .filter(
        (b) =>
          (b.id          || "").toLowerCase().includes(q) ||
          (b.towerName   || "").toLowerCase().includes(q) ||
          (b.kabupaten   || "").toLowerCase().includes(q) ||
          (b.cluster     || "").toLowerCase().includes(q) ||
          (b.spm         || "").toLowerCase().includes(q) ||
          (b.spv         || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [query, btsData]);

  const handleSelect = useCallback((bts: MasterBTS) => {
    onSelect(bts);
    setQuery("");
    setOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [onSelect]);

  // ── SELECTED STATE ──────────────────────────────────────────────────────
  if (selectedBTS) {
    return (
      <div className="space-y-1.5">
        <Label>ID BTS <span className="text-destructive">*</span></Label>
        <div className="rounded-2xl border border-primary/30 bg-card overflow-hidden shadow-sm">
          {/* Blue header */}
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
              onClick={handleClear}
              className="h-7 w-7 flex items-center justify-center rounded-xl
                bg-white/20 hover:bg-white/35 text-white transition-all shrink-0
                active:scale-95"
              aria-label="Ganti BTS"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 text-xs divide-x divide-y divide-border/40">
            {[
              { icon: MapPin,   label: "Kabupaten", value: selectedBTS.kabupaten },
              { icon: Layers,   label: "Cluster",   value: selectedBTS.cluster },
              { icon: User,     label: "PM",        value: selectedBTS.spm },
              { icon: User,     label: "SPV",       value: selectedBTS.spv },
              { icon: MapPin,   label: "Koordinat", value: `${selectedBTS.latitude}, ${selectedBTS.longitude}` },
              { icon: Calendar, label: "OA Date",   value: selectedBTS.newTowerOADate || "—" },
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

          {selectedBTS.qtySPSeedingByBrands && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border/40 bg-muted/20">
              <Package className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Qty SP Seeding:</span>
              <span className="text-xs font-semibold">{selectedBTS.qtySPSeedingByBrands}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SEARCH STATE ────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5 relative" ref={wrapRef}>
      <Label>ID BTS <span className="text-destructive">*</span></Label>

      {/* Input */}
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            loading
              ? "Memuat data BTS…"
              : btsData.length > 0
              ? `Cari dari ${btsData.length} BTS — Tower ID, Nama, Kabupaten, Cluster…`
              : "Data BTS belum tersedia"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={loading || btsData.length === 0}
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-2xl border text-sm",
            "bg-muted/30 placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200",
            error ? "border-destructive" : "border-border/60"
          )}
        />
        <ChevronDown className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )} />
      </div>

      {/* Dropdown */}
      {open && !loading && btsData.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1.5
          rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden
          animate-scale-in">

          {/* Results count */}
          <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">
              {query.trim()
                ? `${filtered.length} hasil untuk "${query}"`
                : `${filtered.length} BTS ditampilkan`}
            </span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[10px] text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-64 overscroll-contain">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-center text-muted-foreground">
                Tidak ada BTS yang cocok dengan &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filtered.map((bts) => (
                  <button
                    key={bts.id}
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent onBlur closing dropdown before onClick fires
                      e.preventDefault();
                      handleSelect(bts);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl
                      hover:bg-primary/8 active:bg-primary/15 transition-colors
                      focus:outline-none focus:bg-primary/8"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary truncate leading-tight">
                          {bts.id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bts.towerName || "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-0.5">
                        <p className="text-[10px] text-muted-foreground truncate max-w-28">
                          {bts.kabupaten}
                        </p>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {bts.cluster}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {filtered.length > 0 && btsData.length > 50 && !query && (
            <div className="px-3 py-2 border-t border-border/40 bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center">
                Ketik untuk filter dari {btsData.length} total BTS
              </p>
            </div>
          )}
        </div>
      )}

      {/* No data warning */}
      {!loading && btsData.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          ⚠️ Data BTS belum dimuat. Pastikan koneksi ke Google Apps Script aktif.
        </p>
      )}

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
