"use client";

import React, { useState, useMemo } from "react";
import { Grid3X3, List, Map as MapIcon, Maximize2, X, Calendar, User, MapPin, Radio } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGallery } from "@/hooks/use-dashboard";
import { useFilterStore } from "@/stores/filter-store";
import { formatDateTime, getBrandColor, getGoogleMapsURL } from "@/lib/utils";
import type { GalleryItem } from "@/types";

type ViewMode = "grid" | "timeline" | "map";

export default function GalleryPage() {
  const { filter } = useFilterStore();
  const { data = [], isLoading } = useGallery(filter);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<GalleryItem | null>(null);

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Photo Gallery</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data.length} photos
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("timeline")}
            aria-label="Timeline view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("map")}
            aria-label="Map view"
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GlobalFilter />

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-fade-in">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))
            : data.length === 0
            ? (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                No photos found
              </div>
            )
            : data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`View photo for ${item.idBTS}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photoURL || "/placeholder.jpg"}
                    alt={item.idBTS}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23374151'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%239CA3AF' font-size='12'%3ENo Photo%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex flex-col justify-end">
                    <p className="text-white text-xs font-semibold truncate">{item.idBTS}</p>
                    <p className="text-white/80 text-xs truncate">{item.brand}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                    <Maximize2 className="h-4 w-4 text-white drop-shadow" />
                  </div>
                  <div
                    className="absolute top-2 left-2 h-2 w-2 rounded-full border border-white/30"
                    style={{ backgroundColor: getBrandColor(item.brand) }}
                  />
                </button>
              ))}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="space-y-6 animate-fade-in">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-5 w-32 mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="aspect-square rounded-xl" />
                    ))}
                  </div>
                </div>
              ))
            : grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{date}</h3>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={`View photo for ${item.idBTS}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photoURL || ""}
                          alt={item.idBTS}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23374151'/%3E%3C/svg%3E";
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                          <p className="text-white text-xs truncate">{item.brand}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* Map view placeholder */}
      {viewMode === "map" && (
        <div className="animate-fade-in">
          <div className="h-96 bg-muted rounded-2xl flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Map gallery view — photos with GPS coordinates
            </p>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selected && (
            <div className="flex flex-col md:flex-row max-h-[90vh]">
              {/* Photo */}
              <div className="relative flex-1 bg-black min-h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.photoURL || ""}
                  alt={selected.idBTS}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='.3em' fill='%239CA3AF' font-size='16'%3ENo Photo%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>

              {/* Info */}
              <div className="w-full md:w-72 bg-background border-t md:border-t-0 md:border-l border-border">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="font-semibold text-sm">Photo Details</span>
                </div>
                <ScrollArea className="h-64 md:h-auto md:max-h-96">
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">BTS</p>
                        <p className="font-semibold">{selected.idBTS}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: getBrandColor(selected.brand) }}
                      />
                      <div>
                        <p className="text-xs text-muted-foreground">Brand</p>
                        <p className="font-semibold">{selected.brand}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-semibold">{selected.tanggal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Promotor</p>
                        <p className="font-semibold">{selected.promotor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Supervisor</p>
                        <p className="font-semibold">{selected.supervisor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-semibold">{selected.kabupaten}</p>
                        <p className="text-xs text-muted-foreground">{selected.cluster}</p>
                      </div>
                    </div>
                    {selected.latitudeUser && selected.longitudeUser && (
                      <a
                        href={getGoogleMapsURL(selected.latitudeUser, selected.longitudeUser)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary text-xs underline"
                      >
                        <MapPin className="h-3 w-3" />
                        View on Google Maps
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
