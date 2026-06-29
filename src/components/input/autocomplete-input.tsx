"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  label: string;
  placeholder?: string;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  loading?: boolean;
}

export function AutocompleteInput({
  label, placeholder, suggestions, value,
  onChange, error, required, loading,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!suggestions || suggestions.length === 0) return [];
    const q = value.toLowerCase().trim();
    if (!q) return suggestions.slice(0, 40);
    return suggestions
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 40);
  }, [value, suggestions]);

  return (
    <div className="space-y-1.5 relative" ref={wrapRef}>
      <Label>
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>

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
              ? `Memuat ${label}…`
              : placeholder || `Cari ${label}…`
          }
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={loading}
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-2xl border text-sm",
            "bg-muted/30 placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200",
            error ? "border-destructive" : "border-border/60"
          )}
        />

        {/* Right icon: clear if has value, otherwise chevron */}
        {value ? (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onChange(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            "transition-transform duration-200 pointer-events-none",
            open && "rotate-180"
          )} />
        )}
      </div>

      {/* Dropdown */}
      {open && !loading && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1.5
          rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden
          animate-scale-in">

          {/* Header */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
              <p className="text-[10px] text-muted-foreground">
                {filtered.length} dari {suggestions.length} {label}
              </p>
            </div>
          )}

          <div className="overflow-y-auto max-h-56 overscroll-contain">
            {suggestions.length === 0 ? (
              <div className="px-4 py-5 text-sm text-center text-muted-foreground">
                Data {label} belum tersedia.
                <br />
                <span className="text-xs">Import data di halaman Master terlebih dahulu.</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-5 text-sm text-center text-muted-foreground">
                Tidak ada hasil untuk &ldquo;{value}&rdquo;
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filtered.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur before click
                      onChange(s);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors",
                      "hover:bg-primary/8 active:bg-primary/15",
                      "focus:outline-none focus:bg-primary/8",
                      value === s && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
