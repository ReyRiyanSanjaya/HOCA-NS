"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Layers,
  Navigation,
  X,
  Radio,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMapData, fetchBTSHistory } from "@/lib/api";
import { MARKER_COLORS, CACHE_KEYS } from "@/lib/config";
import { formatDateTime, formatDistance, getGoogleMapsNavigationURL } from "@/lib/utils";
import { useFilterStore } from "@/stores/filter-store";
import type { GlobalFilter } from "@/types";

type MapView = "street" | "satellite" | "terrain";

interface MarkerData {
  id: string;
  towerName: string;
  latitude: number;
  longitude: number;
  kabupaten: string;
  cluster: string;
  pm: string;
  spv: string;
  markerStatus: string;
  activationCount: number;
  lastActivation: string | null;
  lastPromotor: string | null;
  lastPhotoURL: string | null;
}

interface BTSMapProps {
  filter: Partial<GlobalFilter>;
}

export function BTSMap({ filter }: BTSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [mapView, setMapView] = useState<MapView>("street");
  const [selectedBTS, setSelectedBTS] = useState<MarkerData | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMarkerRef, setUserMarkerRef] = useState<unknown>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  const { data: mapData, isLoading } = useQuery({
    queryKey: [CACHE_KEYS.masterBTS, "map", filter],
    queryFn: () => fetchMapData(filter),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: btsHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["bts-history", selectedBTS?.id],
    queryFn: () => fetchBTSHistory(selectedBTS!.id),
    enabled: !!selectedBTS && sideOpen,
  });

  // Load Leaflet on client
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const leafletL = L as typeof import("leaflet");

    const map = leafletL.map(mapRef.current, {
      center: [-2.5489, 118.0149],
      zoom: 5,
      zoomControl: false,
    });

    leafletL.control.zoom({ position: "bottomright" }).addTo(map);

    const streetLayer = leafletL.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap contributors", maxZoom: 19 }
    );

    streetLayer.addTo(map);
    (mapInstanceRef as React.MutableRefObject<unknown>).current = map;

    return () => {
      map.remove();
      (mapInstanceRef as React.MutableRefObject<unknown>).current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData?.markers || !L) return;

    const leafletL = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      (m as import("leaflet").Marker).remove();
    });
    markersRef.current = [];

    const markers = mapData.markers;
    if (!markers.length) return;

    markers.forEach((bts) => {
      const color = MARKER_COLORS[bts.markerStatus as keyof typeof MARKER_COLORS] || MARKER_COLORS.never;

      const icon = leafletL.divIcon({
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background-color:${color};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:transform 0.2s;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/>
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
            <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/>
            <path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>
          </svg>
        </div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      const marker = leafletL.marker([bts.latitude, bts.longitude], { icon });

      marker.bindPopup(`
        <div style="font-family:inherit;min-width:200px;padding:4px">
          <strong style="font-size:13px">${bts.id}</strong>
          <p style="font-size:11px;color:#666;margin:2px 0">${bts.towerName}</p>
          <hr style="margin:6px 0;border:none;border-top:1px solid #eee"/>
          <div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:2px">
            <span><b>Kabupaten:</b><br/>${bts.kabupaten}</span>
            <span><b>Cluster:</b><br/>${bts.cluster}</span>
            <span><b>SPV:</b><br/>${bts.spv || "-"}</span>
            <span><b>PM:</b><br/>${bts.pm || "-"}</span>
          </div>
          <hr style="margin:6px 0;border:none;border-top:1px solid #eee"/>
          <div style="font-size:11px">
            <b>Activations:</b> ${bts.activationCount}
            ${bts.lastActivation ? `<br/><b>Last:</b> ${bts.lastActivation}` : ""}
            ${bts.lastPromotor ? `<br/><b>By:</b> ${bts.lastPromotor}` : ""}
          </div>
          <a href="${getGoogleMapsNavigationURL(bts.latitude, bts.longitude)}" 
             target="_blank" 
             style="display:block;margin-top:6px;text-align:center;background:#3B82F6;color:white;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:11px">
            Navigate
          </a>
        </div>
      `);

      marker.on("click", () => {
        setSelectedBTS(bts);
        setSideOpen(true);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData, L]);

  // Change map layer
  const changeMapView = useCallback(
    (view: MapView) => {
      if (!mapInstanceRef.current || !L) return;
      const leafletL = L as typeof import("leaflet");
      const map = mapInstanceRef.current as import("leaflet").Map;

      map.eachLayer((layer) => {
        if (layer instanceof leafletL.TileLayer) layer.remove();
      });

      const tiles: Record<MapView, string> = {
        street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        satellite:
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      };

      leafletL.tileLayer(tiles[view], {
        attribution: "© Map contributors",
        maxZoom: 19,
      }).addTo(map);

      setMapView(view);
    },
    [L]
  );

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!mapInstanceRef.current || !L) return;
    const leafletL = L as typeof import("leaflet");
    const map = mapInstanceRef.current as import("leaflet").Map;

    navigator.geolocation?.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);

      if (userMarkerRef) {
        (userMarkerRef as import("leaflet").Marker).remove();
      }

      const icon = leafletL.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5)"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const m = leafletL.marker([latitude, longitude], { icon }).addTo(map);
      setUserMarkerRef(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, userMarkerRef]);

  // Search on map
  const handleSearch = () => {
    if (!mapInstanceRef.current || !mapData?.markers || !searchQuery.trim()) return;
    const map = mapInstanceRef.current as import("leaflet").Map;
    const q = searchQuery.toLowerCase();
    const found = mapData.markers.find(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.towerName.toLowerCase().includes(q) ||
        b.kabupaten.toLowerCase().includes(q)
    );
    if (found) {
      map.setView([found.latitude, found.longitude], 15);
      setSelectedBTS(found);
      setSideOpen(true);
    }
  };

  const statusColors: Record<string, string> = {
    never: "bg-gray-500",
    today: "bg-green-500",
    week: "bg-blue-500",
    month: "bg-amber-500",
    problem: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    never: "Never Activated",
    today: "Activated Today",
    week: "Activated This Week",
    month: "Activated This Month",
    problem: "Problem",
  };

  return (
    <div className="relative w-full h-full">
      {/* Map */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-lg">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading map data...</span>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        {/* Search */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search BTS on map..."
              className="pl-9 bg-background/95 backdrop-blur-sm shadow-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            variant="default"
            size="icon"
            onClick={handleSearch}
            className="shadow-md shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map View Controls */}
      <div className="absolute bottom-20 md:bottom-6 right-4 z-10 flex flex-col gap-2">
        <Button
          variant={mapView === "street" ? "default" : "secondary"}
          size="sm"
          onClick={() => changeMapView("street")}
          className="shadow-md text-xs"
        >
          Street
        </Button>
        <Button
          variant={mapView === "satellite" ? "default" : "secondary"}
          size="sm"
          onClick={() => changeMapView("satellite")}
          className="shadow-md text-xs"
        >
          Satellite
        </Button>
        <Button
          variant={mapView === "terrain" ? "default" : "secondary"}
          size="sm"
          onClick={() => changeMapView("terrain")}
          className="shadow-md text-xs"
        >
          Terrain
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={getUserLocation}
          className="shadow-md"
          aria-label="My location"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-20 md:bottom-6 left-4 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-xl p-3 shadow-md space-y-1.5">
          <p className="text-xs font-semibold mb-2">Legend</p>
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${statusColors[key]}`} />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats badge */}
      {mapData && (
        <div className="absolute top-20 left-4 z-10">
          <div className="bg-background/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md">
            <p className="text-xs font-medium">
              {mapData.markers.length} BTS towers
            </p>
          </div>
        </div>
      )}

      {/* BTS Side Panel */}
      {sideOpen && selectedBTS && (
        <div className="absolute top-0 right-0 bottom-0 w-full md:w-96 bg-background/97 backdrop-blur-lg border-l border-border z-20 flex flex-col shadow-2xl animate-fade-in">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold truncate">{selectedBTS.id}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedBTS.towerName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSideOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* BTS Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Kabupaten</p>
                  <p className="font-semibold mt-0.5">{selectedBTS.kabupaten}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Cluster</p>
                  <p className="font-semibold mt-0.5">{selectedBTS.cluster}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">PM</p>
                  <p className="font-semibold mt-0.5">{selectedBTS.pm || "-"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">SPV</p>
                  <p className="font-semibold mt-0.5">{selectedBTS.spv || "-"}</p>
                </div>
              </div>

              {/* Activation Stats */}
              <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3 border border-primary/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {selectedBTS.activationCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Activations</p>
                </div>
                <div className="flex-1 min-w-0">
                  {selectedBTS.lastActivation && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDateTime(selectedBTS.lastActivation)}
                    </p>
                  )}
                  {selectedBTS.lastPromotor && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3 shrink-0" />
                      {selectedBTS.lastPromotor}
                    </p>
                  )}
                  <Badge
                    variant={
                      selectedBTS.markerStatus === "today"
                        ? "success"
                        : selectedBTS.markerStatus === "never"
                        ? "secondary"
                        : "info"
                    }
                    className="mt-1 text-xs"
                  >
                    {statusLabels[selectedBTS.markerStatus] || selectedBTS.markerStatus}
                  </Badge>
                </div>
              </div>

              {/* Last Photo */}
              {selectedBTS.lastPhotoURL && (
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Last Photo
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedBTS.lastPhotoURL}
                    alt="Last activation photo"
                    className="w-full h-40 object-cover rounded-xl border"
                  />
                </div>
              )}

              {/* Navigate Button */}
              <a
                href={getGoogleMapsNavigationURL(
                  selectedBTS.latitude,
                  selectedBTS.longitude
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default" className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Navigate to BTS
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              </a>

              {/* History */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <ChevronRight className="h-4 w-4" /> Activation History
                </p>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : !btsHistory?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activation history
                  </p>
                ) : (
                  <div className="space-y-2">
                    {btsHistory.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-muted/40 rounded-xl p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{tx.brand}</span>
                          <span className="text-muted-foreground">
                            {tx.tanggal}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          Promotor: {tx.promotor}
                        </p>
                        <p className="text-muted-foreground">
                          MDN: {tx.mdn}
                        </p>
                        <p className="text-muted-foreground">
                          Distance: {formatDistance(tx.distanceFromBTS)}
                        </p>
                        {tx.photoURL && (
                          <a
                            href={tx.photoURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline flex items-center gap-1"
                          >
                            <ImageIcon className="h-3 w-3" /> View Photo
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
