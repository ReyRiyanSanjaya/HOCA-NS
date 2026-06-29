"use client";

import React from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/providers/settings-provider";
import { useTheme } from "next-themes";
import { getOfflineQueue, clearOfflineQueue } from "@/lib/offline-queue";
import { toast } from "sonner";
import { GAS_BASE_URL, APP_CONFIG } from "@/lib/config";
import {
  Settings,
  MapPin,
  Palette,
  RefreshCw,
  Image as ImageIcon,
  Globe,
  Wifi,
  Info,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const offlineQueue = getOfflineQueue();

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm">Configure app preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* GPS Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                GPS Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="radius">GPS Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  min={50}
                  max={5000}
                  value={settings.radiusGPS}
                  onChange={(e) => updateSettings({ radiusGPS: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Activations outside this radius will be flagged
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Map Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Map Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Default Map View</Label>
                <Select
                  value={settings.defaultMapView}
                  onValueChange={(v) =>
                    updateSettings({
                      defaultMapView: v as "street" | "satellite" | "terrain",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="street">Street</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="terrain">Terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Data Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="refresh">Dashboard Refresh Interval (seconds)</Label>
                <Input
                  id="refresh"
                  type="number"
                  min={10}
                  max={300}
                  value={settings.refreshInterval}
                  onChange={(e) =>
                    updateSettings({ refreshInterval: Number(e.target.value) })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Image Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="compress">
                  Image Quality: {Math.round(settings.imageCompression * 100)}%
                </Label>
                <Input
                  id="compress"
                  type="range"
                  min={30}
                  max={100}
                  value={Math.round(settings.imageCompression * 100)}
                  onChange={(e) =>
                    updateSettings({
                      imageCompression: Number(e.target.value) / 100,
                    })
                  }
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Lower quality = smaller file size
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Offline Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                Offline Queue
              </CardTitle>
              <CardDescription>
                Submissions queued when offline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Queued items:
                  <Badge variant={offlineQueue.length > 0 ? "warning" : "success"} className="ml-2">
                    {offlineQueue.length}
                  </Badge>
                </span>
                {offlineQueue.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      clearOfflineQueue();
                      toast.success("Offline queue cleared");
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Queue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">GAS URL</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {GAS_BASE_URL}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Update NEXT_PUBLIC_GAS_URL in .env.local to point to your Google Apps Script deployment.
              </p>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-semibold">{APP_CONFIG.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                v{APP_CONFIG.version} • {APP_CONFIG.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
