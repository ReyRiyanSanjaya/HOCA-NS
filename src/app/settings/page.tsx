"use client";

import React from "react";
import { PageContainer }  from "@/components/layout/page-container";
import { AdminGuard }     from "@/components/auth/admin-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label }   from "@/components/ui/label";
import { Input }   from "@/components/ui/input";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSettings }   from "@/providers/settings-provider";
import { useAuth }       from "@/providers/auth-provider";
import { useTheme }      from "next-themes";
import { getOfflineQueue, clearOfflineQueue } from "@/lib/offline-queue";
import { toast }         from "sonner";
import { GAS_BASE_URL, APP_CONFIG } from "@/lib/config";
import {
  Settings, MapPin, Palette, RefreshCw, Image as ImageIcon,
  Globe, Wifi, Info, Trash2, LogOut, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <AdminGuard pageName="Pengaturan">
      <SettingsContent />
    </AdminGuard>
  );
}

function SettingsContent() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme }          = useTheme();
  const { admin, logout }            = useAuth();
  const offlineQueue                 = getOfflineQueue();

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pengaturan</h1>
            <p className="text-muted-foreground text-sm">Konfigurasi aplikasi</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* ── Admin Info ─────────────────────────────── */}
          {admin && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl gradient-blue flex items-center justify-center shadow-md shadow-blue-500/25">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{admin.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{admin.username} · Administrator</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { logout(); toast.success("Berhasil logout"); }}
                    className="gap-2 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── GPS ──────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-green flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="radius">Radius GPS (meter)</Label>
                <Input
                  id="radius"
                  type="number"
                  min={50}
                  max={5000}
                  value={settings.radiusGPS}
                  onChange={(e) => updateSettings({ radiusGPS: Number(e.target.value) })}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Aktivasi di luar radius ini akan ditandai sebagai jauh
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Tampilan ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-purple flex items-center justify-center">
                  <Palette className="h-3.5 w-3.5 text-white" />
                </div>
                Tampilan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>Tema</Label>
                {/* Theme picker cards */}
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-medium transition-all active:scale-95",
                        theme === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:bg-muted/60"
                      )}
                    >
                      {t === "light" ? "☀️ Light" : t === "dark" ? "🌙 Dark" : "💻 System"}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Map ──────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-teal flex items-center justify-center">
                  <Globe className="h-3.5 w-3.5 text-white" />
                </div>
                Peta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>Tampilan Default</Label>
                <Select
                  value={settings.defaultMapView}
                  onValueChange={(v) => updateSettings({ defaultMapView: v as "street" | "satellite" | "terrain" })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="street">🗺️ Street</SelectItem>
                    <SelectItem value="satellite">🛰️ Satellite</SelectItem>
                    <SelectItem value="terrain">🏔️ Terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── Data ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-blue flex items-center justify-center">
                  <RefreshCw className="h-3.5 w-3.5 text-white" />
                </div>
                Data & Refresh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="refresh">Interval Refresh Dashboard (detik)</Label>
                <Input
                  id="refresh"
                  type="number"
                  min={10}
                  max={300}
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
                  className="h-11"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Foto ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-pink flex items-center justify-center">
                  <ImageIcon className="h-3.5 w-3.5 text-white" />
                </div>
                Kualitas Foto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Kompresi</Label>
                <span className={cn(
                  "text-sm font-bold px-2 py-0.5 rounded-lg",
                  settings.imageCompression >= 0.7 ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : settings.imageCompression >= 0.5 ? "bg-amber-500/10 text-amber-600"
                  : "bg-red-500/10 text-red-500"
                )}>
                  {Math.round(settings.imageCompression * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={Math.round(settings.imageCompression * 100)}
                onChange={(e) => updateSettings({ imageCompression: Number(e.target.value) / 100 })}
                className="w-full accent-primary h-2 rounded-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>File kecil (30%)</span>
                <span>Kualitas terbaik (100%)</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Offline Queue ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-amber flex items-center justify-center">
                  <Wifi className="h-3.5 w-3.5 text-white" />
                </div>
                Antrian Offline
              </CardTitle>
              <CardDescription>Pengiriman yang tertunda saat offline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Antrian:</span>
                  <Badge variant={offlineQueue.length > 0 ? "warning" : "success"}>
                    {offlineQueue.length} item
                  </Badge>
                </div>
                {offlineQueue.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { clearOfflineQueue(); toast.success("Antrian dikosongkan"); }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Kosongkan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── API Info ──────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl gradient-slate flex items-center justify-center">
                  <Info className="h-3.5 w-3.5 text-white" />
                </div>
                API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">GAS URL</p>
              <code className="text-xs bg-muted px-3 py-2 rounded-xl block break-all leading-relaxed">
                {GAS_BASE_URL}
              </code>
            </CardContent>
          </Card>

          {/* ── App Info ──────────────────────────────────── */}
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="font-semibold">{APP_CONFIG.name}</p>
              <p className="text-xs text-muted-foreground">
                v{APP_CONFIG.version} · {APP_CONFIG.description}
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </PageContainer>
  );
}
