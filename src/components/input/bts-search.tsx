"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Radio, MapPin, Layers, User,
  Calendar, Package, ChevronRight, Loader2,
} from "lucide-react";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import { cn }     from "@/lib/utils";
import type { MasterBTS } from "@/types";

interface BTSSearchProps {
  btsData:     MasterBTS[];
  selectedBTS: MasterBTS | null;
  onSelect:    (bts: MasterBTS | null) => void;
  error?:      string;
  loading?:    boolean;
}

// ─────────────────────────────────────────────────────────────
// Full-screen search modal
// ─────────────────────────────────────────────────────────────
function BTSSearchModal({
  btsData,
  onSelect,
  onClose,
}: {
  btsData:  MasterBTS[];
  onSelect: (bts: MasterBTS) => void;
  onClose:  () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!btsData || btsData.length === 0) return [];
    if (!q) return btsData.slice(0, 60);
    return btsData.filter(
      (b) =>
        (b.id          || "").toLowerCase().includes(q) ||
        (b.towerName   || "").toLowerCase().includes(q) ||
        (b.kabupaten   || "").toLowerCase().includes(q) ||
        (b.cluster     || "").toLowerCase().includes(q) ||
        (b.spm         || "").toLowerCase().includes(q) ||
        (b.spv         || "").toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query, btsData]);

  return (
    // Full-screen overlay — rendered via portal pattern (fixed inset-0 z-[200])
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "hsl(var(--background))" }}>

      {/* ── Header / Search bar ─────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={`Cari dari ${btsData.length} BTS…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-10 rounded-2xl border border-border
              bg-muted/40 text-base font-medium placeholder:text-muted-foreground/60
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2
                h-6 w-6 flex items-center justify-center rounded-full
                bg-muted hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 h-10 px-4 rounded-xl bg-muted hover:bg-muted/80
            text-sm font-medium transition-colors active:scale-95"
        >
          Batal
        </button>
      </div>

      {/* ── Results count ───────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2 bg-muted/30 border-b border-border/40">
        <p className="text-xs text-muted-foreground">
          {query.trim()
            ? `${filtered.length} hasil untuk "${query}"`
            : `Menampilkan ${filtered.length} dari ${btsData.length} BTS`}
        </p>
      </div>

      {/* ── Scrollable list ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {btsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
            <Radio className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center">
              Data BTS belum tersedia.
              <br />Import data BTS di halaman Master terlebih dahulu.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Tidak ada BTS yang cocok dengan &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((bts) => (
              <button
                key={bts.id}
                type="button"
                onClick={() => onSelect(bts)}
                className="w-full text-left px-4 py-3.5 hover:bg-muted/50
                  active:bg-primary/10 transition-colors flex items-center gap-3"
              >
                {/* Icon */}
                <div className="shrink-0 h-10 w-10 rounded-xl gradient-blue
                  flex items-center justify-center shadow-sm">
                  <Radio className="h-5 w-5 text-white" />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-primary truncate leading-tight">
                    {bts.id}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {bts.towerName || "—"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">{bts.kabupaten}</span>
                    {bts.cluster && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {bts.cluster}
                      </Badge>
                    )}
                    {bts.spv && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-24">
                        SPV: {bts.spv}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Bottom padding for mobile */}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function BTSSearch({ btsData, selectedBTS, onSelect, error, loading }: BTSSearchProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelect = useCallback((bts: MasterBTS) => {
    onSelect(bts);
    setModalOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <>
      <div className="space-y-1.5">
        <Label>ID BTS <span className="text-destructive">*</span></Label>

        {selectedBTS ? (
          /* ── Selected card ─────────────────────────────────── */
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
                  bg-white/20 hover:bg-white/35 text-white transition-all shrink-0 active:scale-95"
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

            {/* Change button */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full py-2.5 text-xs font-semibold text-primary
                bg-primary/5 hover:bg-primary/10 border-t border-border/40
                transition-colors active:scale-[0.99]"
            >
              Ganti BTS
            </button>
          </div>
        ) : (
          /* ── Trigger button ─────────────────────────────────── */
          <button
            type="button"
            onClick={() => !loading && setModalOpen(true)}
            disabled={loading}
            className={cn(
              "w-full h-14 flex items-center gap-3 px-4 rounded-2xl border",
              "bg-muted/30 text-left transition-all duration-200 active:scale-[0.99]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error ? "border-destructive" : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
            ) : (
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <span className={cn(
              "flex-1 text-sm",
              loading || btsData.length === 0 ? "text-muted-foreground" : "text-muted-foreground/70"
            )}>
              {loading
                ? "Memuat data BTS…"
                : btsData.length > 0
                ? `Cari dari ${btsData.length} BTS — Tower ID, Nama, Kabupaten…`
                : "Data BTS belum tersedia"}
            </span>
            {!loading && btsData.length > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            )}
          </button>
        )}

        {/* No data hint */}
        {!loading && btsData.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Import data BTS terlebih dahulu di halaman Master.
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Full-screen modal — mounted outside form context */}
      {modalOpen && (
        <BTSSearchModal
          btsData={btsData}
          onSelect={handleSelect}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
