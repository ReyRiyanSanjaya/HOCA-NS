"use client";

import React, { useEffect } from "react";
import { MapPin, Navigation, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/use-geolocation";
import { formatDistance } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";

interface GPSCaptureProps {
  btslat?: number;
  btsLng?: number;
  onLocationCapture: (lat: number, lng: number, distance: number) => void;
}

export function GPSCapture({ btslat, btsLng, onLocationCapture }: GPSCaptureProps) {
  const { latitude, longitude, accuracy, error, loading, getLocation } =
    useGeolocation(true);
  const { settings } = useSettings();

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      let distance = 0;
      if (btslat !== undefined && btsLng !== undefined) {
        const { calculateDistance } = require("@/lib/utils");
        distance = calculateDistance(latitude, longitude, btslat, btsLng);
      }
      onLocationCapture(latitude, longitude, distance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const isInsideRadius =
    latitude !== null &&
    longitude !== null &&
    btslat !== undefined &&
    btsLng !== undefined;

  const getDistance = () => {
    if (!isInsideRadius) return null;
    const { calculateDistance } = require("@/lib/utils");
    return calculateDistance(latitude!, longitude!, btslat!, btsLng!);
  };

  const distance = getDistance();
  const insideRadius = distance !== null && distance <= settings.radiusGPS;

  return (
    <div className="space-y-1.5">
      <Label>GPS Location</Label>
      <div className="rounded-xl border border-input bg-muted/30 p-3 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting GPS location...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        ) : latitude !== null ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="font-medium">Location captured</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Lat: {latitude.toFixed(6)}</span>
              <span>Lng: {longitude?.toFixed(6)}</span>
              {accuracy && <span>Acc: ±{Math.round(accuracy)}m</span>}
            </div>

            {distance !== null && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={insideRadius ? "success" : "destructive"}
                  className="gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  {formatDistance(distance)} from BTS
                </Badge>
                {insideRadius ? (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Inside radius ({settings.radiusGPS}m)
                  </span>
                ) : (
                  <span className="text-xs text-red-500">
                    Outside radius ({settings.radiusGPS}m)
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Waiting for GPS...
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getLocation}
          disabled={loading}
          className="gap-2 w-full"
        >
          <Navigation className="h-4 w-4" />
          {loading ? "Getting location..." : "Refresh GPS"}
        </Button>
      </div>
    </div>
  );
}
