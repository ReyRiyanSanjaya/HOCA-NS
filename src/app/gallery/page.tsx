"use client";

import React, { useState, useMemo } from "react";
import { Grid3X3, List, Maximize2, Calendar, User, MapPin, Radio, Image as ImageIcon } from "lucide-react";
import { PageContainer }  from "@/components/layout/page-container";
import { GlobalFilter }   from "@/components/dashboard/global-filter";
import { Button }         from "@/components/ui/button";
import { Badge }          from "@/components/ui/badge";
import { Skeleton }       from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea }     from "@/components/ui/scroll-area";
import { useGallery }     from "@/hooks/use-dashboard";
import { useFilterStore } from "@/stores/filter-store";
import { getBrandColor, getGoogleMapsURL, cn } from "@/lib/utils";
import type { GalleryItem } from "@/types";

// ── Google Drive thumbnail helper ──────────────────────────────────────────
// Drive "uc?id=" URLs are blocked in img tags. Use thumbnail endpoint instead.
function driveImgUrl(url: string, size = 400): string {
  if (!url) return "";
  if (url.includes("thumbnail")) return url;
  let fileId = "";
  const ucMatch  = url.match(/[?&]id=([^&]+)/);
  const viewMatch = url.match(/\/d\/([^/]+)/);
  if (ucMatch)       fileId = ucMatch[1];
  else if (viewMatch) fileId = viewMatch[1];
  if (!fileId) return url;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='54' text-anchor='middle' fill='%2364748b' font-size='10' font-family='sans-serif'%3ENo Photo%3C/text%3E%3C/svg%3E";

type ViewMode = "grid" | "timeline";

// ── Gallery image thumbnail ─────────────────────────────────────────────────
function GalleryThumb({
  item, onClick,
}: { item: GalleryItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const src = driveImgUrl(item.photoURL, 300);
  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-2xl overflow-hidden border border-border/60
        hover:ring-2 hover:ring-primary hover:shadow-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary bg-muted"
      aria-label={`Foto ${item.idBTS}`}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={item.idBTS}
        className={cn(
          "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          (e.target as HTMLImageElement).src = PLACEHOLDER;
          setLoaded(true);
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 flex flex-col justify-end">
        <p className="text-white text-xs font-bold truncate">{item.idBTS}</p>
        <p className="text-white/70 text-[10px] truncate">{item.brand}</p>
      </div>
      {/* Brand dot */}
      <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full border-2 border-white/60 shadow"
        style={{ backgroundColor: getBrandColor(item.brand) }} />
      {/* Expand icon */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-4 w-4 text-white drop-shadow" />
      </div>
    </button>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const { filter } = useFilterStore();
  const { data = [], isLoading } = useGallery(filter);
  const [viewMode, setViewMode]  = useState<ViewMode>("grid");
  const [selected, setSelected]  = useState<GalleryItem | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, GalleryItem[]> = {};
    data.forEach((item) => {
      const date = item.tanggal || "Unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Galeri Foto</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "Memuat…" : `${data.length} foto dokumentasi`}
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon-sm"
            onClick={() => setViewMode("grid")} aria-label="Grid view">
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "timeline" ? "default" : "ghost"} size="icon-sm"
            onClick={() => setViewMode("timeline")} aria-label="Timeline view">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GlobalFilter />

      {/* ── GRID ──────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-fade-up">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))
            : data.length === 0
            ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
                  <p className="text-muted-foreground text-sm">Belum ada foto dokumentasi</p>
                </div>
              )
            : data.map((item) => (
                <GalleryThumb key={item.id} item={item} onClick={() => setSelected(item)} />
              ))
          }
        </div>
      )}

      {/* ── TIMELINE ──────────────────────────────────────────────────── */}
      {viewMode === "timeline" && (
        <div className="space-y-6 animate-fade-up">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-5 w-32 mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="aspect-square rounded-2xl" />
                    ))}
                  </div>
                </div>
              ))
            : grouped.length === 0
            ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
                  <p className="text-muted-foreground text-sm">Belum ada foto dokumentasi</p>
                </div>
              )
            : grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{date}</h3>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {items.map((item) => (
                      <GalleryThumb key={item.id} item={item} onClick={() => setSelected(item)} />
                    ))}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* ── LIGHTBOX ──────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl">
          {selected && (
            <div className="flex flex-col md:flex-row max-h-[90vh]">
              {/* Photo */}
              <div className="relative flex-1 bg-slate-900 min-h-64 md:min-h-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={driveImgUrl(selected.photoURL, 800)}
                  alt={selected.idBTS}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
                {/* Open in Drive link */}
                {selected.photoURL && (
                  <a
                    href={selected.photoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5
                      rounded-xl bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
                  >
                    Buka Asli
                  </a>
                )}
              </div>

              {/* Info panel */}
              <div className="w-full md:w-72 bg-card border-t md:border-t-0 md:border-l border-border flex flex-col">
                <div className="px-4 py-3.5 border-b border-border">
                  <p className="font-bold text-sm">Detail Foto</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.tanggal}</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3.5 text-sm">
                    {[
                      { icon: Radio,   label: "ID BTS",    value: selected.idBTS },
                      { icon: Radio,   label: "Tower",     value: selected.towerName || "—" },
                      {
                        icon: MapPin, label: "Brand",
                        value: selected.brand,
                        color: getBrandColor(selected.brand),
                      },
                      { icon: User,    label: "Promotor",  value: selected.promotor },
                      { icon: User,    label: "Supervisor",value: selected.supervisor },
                      { icon: MapPin,  label: "Kabupaten", value: selected.kabupaten },
                      { icon: MapPin,  label: "Cluster",   value: selected.cluster || "—" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                          <p className="font-semibold truncate" style={color ? { color } : {}}>
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* GPS link */}
                    {selected.latitudeUser && selected.longitudeUser && (
                      <a
                        href={getGoogleMapsURL(selected.latitudeUser, selected.longitudeUser)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary text-xs hover:underline mt-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Lihat di Google Maps
                      </a>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
