"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  label: string;
  placeholder?: string;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function AutocompleteInput({
  label,
  placeholder,
  suggestions,
  value,
  onChange,
  error,
  required,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 30);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        placeholder={placeholder || `Search ${label}...`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn(error && "border-destructive")}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
