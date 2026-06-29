"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn }   from "@/lib/utils";

interface AutocompleteInputProps {
  label:       string;
  placeholder?: string;
  suggestions: string[];
  value:       string;
  onChange:    (value: string) => void;
  error?:      string;
  required?:   boolean;
  loading?:    boolean;
}

// ─────────────────────────────────────────────────────────────
// Full-screen modal
// ─────────────────────────────────────────────────────────────
function AutocompleteModal({
  label,
  suggestions,
  value,
  onSelect,
  onClose,
}: {
  label:       string;
  suggestions: string[];
  value:       string;
  onSelect:    (v: string) => void;
  onClose:     () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const filtered = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const q = query.toLowerCase().trim();
    if (!q) return suggestions.slice(0, 80);
    return suggestions
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 80);
  }, [query, suggestions]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={`Cari ${label}…`}
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

      {/* Count */}
      <div className="shrink-0 px-4 py-2 bg-muted/30 border-b border-border/40">
        <p className="text-xs text-muted-foreground">
          {query.trim()
            ? `${filtered.length} hasil untuk "${query}"`
            : `${suggestions.length} ${label} tersedia`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Data {label} belum tersedia.
              <br />Import data di halaman Master terlebih dahulu.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-muted-foreground">
              Tidak ada hasil untuk &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((s) => {
              const isSelected = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelect(s)}
                  className={cn(
                    "w-full text-left px-4 py-4 flex items-center gap-3",
                    "transition-colors active:bg-primary/10",
                    isSelected
                      ? "bg-primary/8 hover:bg-primary/12"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold",
                    isSelected ? "gradient-blue text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {s.charAt(0).toUpperCase()}
                  </div>

                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isSelected && "font-semibold text-primary"
                  )}>
                    {s}
                  </span>

                  {isSelected
                    ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  }
                </button>
              );
            })}
          </div>
        )}
        <div className="h-8" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function AutocompleteInput({
  label, placeholder, suggestions, value,
  onChange, error, required, loading,
}: AutocompleteInputProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelect = (v: string) => {
    onChange(v);
    setModalOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label>
          {label}{required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {/* Trigger — looks like input, opens modal on tap */}
        <button
          type="button"
          onClick={() => !loading && setModalOpen(true)}
          disabled={loading}
          className={cn(
            "w-full h-12 flex items-center gap-3 px-4 rounded-2xl border text-left",
            "bg-muted/30 transition-all duration-200 active:scale-[0.99]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-destructive"
              : value
              ? "border-primary/40 bg-primary/5"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/50"
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          <span className={cn(
            "flex-1 text-sm truncate",
            value ? "font-semibold text-foreground" : "text-muted-foreground/70"
          )}>
            {loading
              ? `Memuat ${label}…`
              : value || placeholder || `Pilih ${label}…`}
          </span>

          {value ? (
            <button
              type="button"
              onClickCapture={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full
                bg-muted hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          )}
        </button>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {modalOpen && (
        <AutocompleteModal
          label={label}
          suggestions={suggestions}
          value={value}
          onSelect={handleSelect}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
