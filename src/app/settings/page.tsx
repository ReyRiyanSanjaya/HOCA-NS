"use client";

import React, { useState } from "react";
import { PageContainer }  from "@/components/layout/page-container";
import { AdminGuard }     from "@/components/auth/admin-guard";
import { Label }          from "@/components/ui/label";
import { Input }          from "@/components/ui/input";
import { Badge }          from "@/components/ui/badge";
import { Progress }       from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSettings }  from "@/providers/settings-provider";
import { useAuth }      from "@/providers/auth-provider";
import { useTheme }     from "next-themes";
import { getOfflineQueue, clearOfflineQueue } from "@/lib/offline-queue";
import { toast }        from "sonner";
import { GAS_BASE_URL, APP_CONFIG, CACHE_TIMES, DEFAULT_SETTINGS } from "@/lib/config";
import {
  Settings, MapPin, Palette, RefreshCw, Image as ImageIcon,
  Globe, Wifi, Info, Trash2, LogOut, ShieldCheck, CheckCircle2,
  Sun, Moon, Monitor, Radio, Zap, Clock, Database, Copy,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <AdminGuard pageName="Pengaturan">
      <SettingsContent />
    </AdminGuard>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SettingSection({
  icon: Icon, gradient, title, description, children, defaultOpen = true,
}: {
  icon: React.ElementType; gradient: string; title: string; description?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/40 hover:bg-muted/20 transition-colors text-left"
      >
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shadow-md shrink-0", gradient)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Setting row ──────────────────────────────────────────────────────────────
function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Main settings content ────────────────────────────────────────────────────
function SettingsContent() {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme }          = useTheme();
  const { admin, logout }            = useAuth();
  const offlineQueue                 = getOfflineQueue();
  const [copied, setCopied]          = useState(false);

  const copyGasUrl = () => {
    navigator.clipboard.writeText(GAS_BASE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("URL disalin");
    });
  };

  const resetToDefault = () => {
    updateSettings(DEFAULT_SETTINGS);
    toast.success("Pengaturan direset ke default");
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pengaturan</h1>
              <p className="text-muted-foreground text-sm">Konfigurasi aplikasi</p>
            </div>
          </div>
          <button onClick={resetToDefault}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium border border-border/60 hover:bg-muted transition-all text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
        </div>

        <div className="space-y-3">

          {/* ── Admin info ─────────────────────────────────── */}
          {admin && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{admin.displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">@{admin.username}</span>
                      <Badge className="text-[9px] bg-blue-500/15 text-blue-600 border-0 px-1.5">Administrator</Badge>
                    </div>
                    {admin.loginAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Login: {new Date(admin.loginAt).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => { logout(); toast.success("Berhasil logout"); }}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-all shrink-0">
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* ── Tampilan / Tema ─────────────────────────────── */}
          <SettingSection icon={Palette} gradient="gradient-purple" title="Tampilan" description="Tema dan preferensi visual">
            <div>
              <p className="text-sm font-medium mb-3">Tema Warna</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value:"light",  label:"Light",  icon:Sun,     emoji:"☀️" },
                  { value:"dark",   label:"Dark",   icon:Moon,    emoji:"🌙" },
                  { value:"system", label:"System", icon:Monitor, emoji:"💻" },
                ] as const).map(({ value, label, emoji }) => (
                  <button key={value} onClick={() => setTheme(value)}
                    className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl border-2 text-sm font-semibold transition-all active:scale-95",
                      theme === value ? "border-primary bg-primary/10 text-primary shadow-md" : "border-border/60 hover:border-primary/30 hover:bg-muted/40")}>
                    <span className="text-2xl">{emoji}</span>
                    <span>{label}</span>
                    {theme === value && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </SettingSection>

          {/* ── GPS ─────────────────────────────────────────── */}
          <SettingSection icon={MapPin} gradient="gradient-green" title="GPS & Lokasi" description="Konfigurasi radius aktivasi">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Radius GPS</Label>
                  <span className={cn("text-sm font-bold px-2.5 py-1 rounded-xl",
                    settings.radiusGPS <= 300 ? "bg-green-500/10 text-green-600" :
                    settings.radiusGPS <= 500 ? "bg-amber-500/10 text-amber-600" :
                    "bg-red-500/10 text-red-500")}>
                    {settings.radiusGPS} m
                  </span>
                </div>
                <input type="range" min={50} max={2000} step={50}
                  value={settings.radiusGPS}
                  onChange={e => updateSettings({ radiusGPS: Number(e.target.value) })}
                  className="w-full accent-primary h-2 rounded-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Ketat (50m)</span>
                  <span>Longgar (2000m)</span>
                </div>
                <Input id="radius" type="number" min={50} max={5000}
                  value={settings.radiusGPS}
                  onChange={e => updateSettings({ radiusGPS: Number(e.target.value) })}
                  className="h-9 mt-2 text-sm" />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Aktivasi di luar radius ini akan ditandai ⚠ sebagai di luar jangkauan. Rekomendasi: 300–500m.
                </p>
              </div>

              {/* Radius visual indicator */}
              <div className="rounded-xl bg-muted/40 p-3 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { range:"≤ 300m", label:"Sangat Ketat",  color:"text-green-600", icon:"✅" },
                  { range:"≤ 500m", label:"Normal",         color:"text-amber-600", icon:"⚡" },
                  { range:"> 500m", label:"Longgar",        color:"text-red-500",   icon:"⚠️" },
                ].map(({ range, label, color, icon }) => (
                  <div key={range} className={cn("rounded-lg p-2", settings.radiusGPS <= 300 && range === "≤ 300m" ? "bg-green-500/10" : settings.radiusGPS <= 500 && range === "≤ 500m" ? "bg-amber-500/10" : settings.radiusGPS > 500 && range === "> 500m" ? "bg-red-500/10" : "")}>
                    <p className="text-base">{icon}</p>
                    <p className={cn("font-semibold", color)}>{range}</p>
                    <p className="text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </SettingSection>

          {/* ── Peta ─────────────────────────────────────────── */}
          <SettingSection icon={Globe} gradient="gradient-teal" title="Peta" description="Tampilan default peta BTS">
            <SettingRow label="Tampilan Default Peta" hint="Digunakan saat halaman peta pertama kali dibuka">
              <Select value={settings.defaultMapView}
                onValueChange={v => updateSettings({ defaultMapView: v as "street" | "satellite" | "terrain" })}>
                <SelectTrigger className="h-9 w-36 text-xs rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="street">🗺️ Street</SelectItem>
                  <SelectItem value="satellite">🛰️ Satellite</SelectItem>
                  <SelectItem value="terrain">🏔️ Terrain</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SettingSection>

          {/* ── Data & Refresh ───────────────────────────────── */}
          <SettingSection icon={RefreshCw} gradient="gradient-blue" title="Data & Auto Refresh" description="Interval pembaruan data otomatis">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Interval Refresh Dashboard</Label>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-xl bg-blue-500/10">
                    {settings.refreshInterval}s
                  </span>
                </div>
                <input type="range" min={10} max={300} step={10}
                  value={settings.refreshInterval}
                  onChange={e => updateSettings({ refreshInterval: Number(e.target.value) })}
                  className="w-full accent-primary h-2 rounded-full" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Cepat (10s)</span>
                  <span>Lambat (300s)</span>
                </div>
              </div>

              {/* Cache info */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cache Times</p>
                {([
                  { label:"Dashboard",  val:CACHE_TIMES.dashboard/1000,   unit:"s" },
                  { label:"Analytics",  val:CACHE_TIMES.analytics/1000,   unit:"s" },
                  { label:"Master BTS", val:CACHE_TIMES.masterData/60000, unit:"min" },
                  { label:"Gallery",    val:CACHE_TIMES.gallery/1000,     unit:"s" },
                ]).map(({ label, val, unit }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">{val}{unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </SettingSection>

          {/* ── Kualitas Foto ────────────────────────────────── */}
          <SettingSection icon={ImageIcon} gradient="gradient-pink" title="Kualitas Foto" description="Kompresi foto dokumentasi aktivasi">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tingkat Kompresi</span>
                <span className={cn("text-sm font-bold px-2.5 py-1 rounded-xl",
                  settings.imageCompression >= 0.7 ? "bg-green-500/10 text-green-600" :
                  settings.imageCompression >= 0.5 ? "bg-amber-500/10 text-amber-600" :
                  "bg-red-500/10 text-red-500")}>
                  {Math.round(settings.imageCompression * 100)}%
                </span>
              </div>
              <input type="range" min={30} max={100}
                value={Math.round(settings.imageCompression * 100)}
                onChange={e => updateSettings({ imageCompression: Number(e.target.value) / 100 })}
                className="w-full accent-primary h-2 rounded-full" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>File kecil (30%)</span>
                <span>Kualitas terbaik (100%)</span>
              </div>
              <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Rekomendasi:</p>
                <p>70–80% — keseimbangan kualitas dan ukuran file. Lebih rendah = upload lebih cepat, tapi detail foto berkurang.</p>
              </div>
            </div>
          </SettingSection>

          {/* ── Antrian Offline ──────────────────────────────── */}
          <SettingSection icon={Wifi} gradient="gradient-amber" title="Antrian Offline"
            description={`${offlineQueue.length} item tertunda`} defaultOpen={offlineQueue.length > 0}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                    offlineQueue.length > 0 ? "bg-amber-500/15" : "bg-green-500/15")}>
                    {offlineQueue.length > 0
                      ? <AlertTriangle className="h-5 w-5 text-amber-500" />
                      : <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{offlineQueue.length} item dalam antrian</p>
                    <p className="text-xs text-muted-foreground">
                      {offlineQueue.length > 0 ? "Akan dikirim saat online" : "Tidak ada data tertunda"}
                    </p>
                  </div>
                </div>
                {offlineQueue.length > 0 && (
                  <button onClick={() => { clearOfflineQueue(); toast.success("Antrian dikosongkan"); }}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                    Kosongkan
                  </button>
                )}
              </div>

              {offlineQueue.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {offlineQueue.slice(0, 10).map((item, i) => (
                    <div key={i} className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{item.formData.idBTS}</span>
                        <span className="text-muted-foreground tabular-nums">{item.timestamp?.substring(0, 16).replace("T", " ")}</span>
                      </div>
                      <p className="text-muted-foreground">{item.formData.promotor} · {item.formData.brand}</p>
                    </div>
                  ))}
                  {offlineQueue.length > 10 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{offlineQueue.length - 10} item lainnya</p>
                  )}
                </div>
              )}
            </div>
          </SettingSection>

          {/* ── API / Koneksi ─────────────────────────────────── */}
          <SettingSection icon={Database} gradient="gradient-slate" title="API & Koneksi" description="Google Apps Script endpoint" defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">GAS Web App URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] bg-muted px-3 py-2 rounded-xl break-all leading-relaxed border border-border/60">
                    {GAS_BASE_URL}
                  </code>
                  <button onClick={copyGasUrl}
                    className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 hover:bg-muted transition-all shrink-0"
                    title="Copy URL">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Connection status hint */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Info Koneksi</p>
                <p>Data disimpan di Google Sheets via Google Apps Script. Pastikan URL di atas dapat diakses dan script ter-deploy sebagai <em>Anyone</em>.</p>
              </div>
            </div>
          </SettingSection>

          {/* ── App Info ─────────────────────────────────────── */}
          <SettingSection icon={Info} gradient="gradient-indigo" title="Tentang Aplikasi" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Radio className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold">{APP_CONFIG.name}</p>
                  <p className="text-xs text-muted-foreground">{APP_CONFIG.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge className="text-[9px] bg-blue-500/15 text-blue-600 border-0">v{APP_CONFIG.version}</Badge>
                    <Badge className="text-[9px] bg-green-500/15 text-green-600 border-0">Next.js 15</Badge>
                    <Badge className="text-[9px] bg-purple-500/15 text-purple-600 border-0">TanStack Query</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label:"Framework",   value:"Next.js 15 App Router" },
                  { label:"UI",          value:"Tailwind CSS + shadcn/ui" },
                  { label:"Charts",      value:"Recharts" },
                  { label:"Map",         value:"Leaflet.js" },
                  { label:"Backend",     value:"Google Apps Script" },
                  { label:"Database",    value:"Google Sheets" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </SettingSection>

        </div>
      </div>
    </PageContainer>
  );
}
