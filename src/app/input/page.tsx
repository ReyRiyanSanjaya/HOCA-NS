"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send, AlertTriangle, CheckCircle2, WifiOff,
  UserCircle, Radio, Users2, Tag, Hash, Camera, MapPin,
  ChevronRight,
} from "lucide-react";

import { PageContainer }   from "@/components/layout/page-container";
import { Button }          from "@/components/ui/button";
import { Input }           from "@/components/ui/input";
import { Label }           from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/input/autocomplete-input";
import { BTSSearch }         from "@/components/input/bts-search";
import { PhotoUpload }       from "@/components/input/photo-upload";
import { GPSCapture }        from "@/components/input/gps-capture";

import { useMasterBTS, useMasterPromotor, useMasterSPV } from "@/hooks/use-master-data";
import { postTransaction }   from "@/lib/api";
import { BRANDS, CACHE_KEYS } from "@/lib/config";
import { getDeviceInfo, getBrowserInfo, getGoogleMapsURL, getTodayString, cn } from "@/lib/utils";
import { addToOfflineQueue } from "@/lib/offline-queue";
import type { MasterBTS }    from "@/types";

const schema = z.object({
  supervisor: z.string().min(1, "Supervisor wajib diisi"),
  promotor:   z.string().min(1, "Nama Promotor wajib diisi"),
  brand:      z.string().min(1, "Brand wajib dipilih"),
  mdn:        z.string()
    .min(8,  "MDN minimal 8 digit")
    .max(16, "MDN maksimal 16 digit")
    .regex(/^\d+$/, "MDN hanya boleh angka"),
});
type FormValues = z.infer<typeof schema>;

const BRAND_COLORS: Record<string, string> = {
  Smartfren: "from-red-500 to-red-600",
  XL:        "from-blue-500 to-blue-600",
  Axis:      "from-purple-500 to-purple-600",
};

const BRAND_ICONS: Record<string, string> = {
  Smartfren: "🔴",
  XL:        "🔵",
  Axis:      "🟣",
};

interface FormSectionProps {
  step: number;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  gradient: string;
  children: React.ReactNode;
  done?: boolean;
}

function FormSection({ step, icon: Icon, title, subtitle, gradient, children, done }: FormSectionProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border/60 bg-card overflow-hidden",
      "shadow-sm hover:shadow-md transition-shadow duration-300",
      "animate-fade-up"
    )}>
      {/* Header strip */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3.5",
        "border-b border-border/40 bg-muted/30"
      )}>
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          "shadow-md",
          done ? "gradient-green" : `bg-gradient-to-br ${gradient}`
        )}>
          {done
            ? <CheckCircle2 className="h-4 w-4 text-white" />
            : <Icon className="h-4 w-4 text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Langkah {step}
            </span>
            {done && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          </div>
          <p className="text-sm font-semibold truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

export default function InputPage() {
  const queryClient = useQueryClient();
  const { data: btsData = [], isLoading: btsLoading } = useMasterBTS();
  const { data: promotorData = [], isLoading: promotorLoading } = useMasterPromotor();
  const { data: spvData = [],      isLoading: spvLoading }      = useMasterSPV();

  const [selectedBTS, setSelectedBTS] = useState<MasterBTS | null>(null);
  const [btsError,    setBtsError]    = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoError,  setPhotoError]  = useState("");
  const [gpsData,     setGpsData]     = useState<{ lat: number; lng: number; distance: number } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("");

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const supervisorValue = watch("supervisor");
  const promotorValue   = watch("promotor");
  const spvList      = spvData.map((s) => s.namaSPV);
  const promotorList = promotorData.map((p) => p.namaPromotor);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedBTS) throw new Error("Pilih BTS terlebih dahulu");
      if (!photoBase64) throw new Error("Dokumentasi foto wajib diisi");
      if (!gpsData)     throw new Error("Lokasi GPS belum tertangkap");
      const fd = new FormData();
      fd.append("action",          "transaction");
      fd.append("supervisor",      values.supervisor);
      fd.append("idBTS",           selectedBTS.id);
      fd.append("promotor",        values.promotor);
      fd.append("brand",           values.brand);
      fd.append("mdn",             values.mdn);
      fd.append("photoBase64",     photoBase64);
      fd.append("latitudeUser",    String(gpsData.lat));
      fd.append("longitudeUser",   String(gpsData.lng));
      fd.append("distanceFromBTS", String(gpsData.distance));
      fd.append("googleMapsURL",   getGoogleMapsURL(gpsData.lat, gpsData.lng));
      fd.append("device",          getDeviceInfo());
      fd.append("browser",         getBrowserInfo());
      fd.append("tanggal",         getTodayString());
      return postTransaction(fd);
    },
    onSuccess: (data) => {
      toast.success("Aktivasi berhasil dikirim! 🎉", { description: `ID: ${data.id}` });
      reset();
      setSelectedBTS(null);
      setPhotoBase64(null);
      setGpsData(null);
      setBtsError("");
      setPhotoError("");
      setSelectedBrand("");
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.dashboard] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.transactions] });
    },
    onError: (error: Error) => {
      if (!navigator.onLine) {
        const vals = watch();
        if (selectedBTS && photoBase64 && gpsData) {
          addToOfflineQueue({
            timestamp: new Date().toISOString(),
            formData: {
              supervisor: vals.supervisor, idBTS: selectedBTS.id,
              promotor: vals.promotor, brand: vals.brand, mdn: vals.mdn,
              photoBase64, latitudeUser: gpsData.lat, longitudeUser: gpsData.lng,
            },
          });
          toast.warning("Disimpan ke antrian offline");
        }
      } else {
        toast.error("Pengiriman gagal", { description: error.message });
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    let valid = true;
    if (!selectedBTS) { setBtsError("Pilih ID BTS terlebih dahulu"); valid = false; }
    else setBtsError("");
    if (!photoBase64) { setPhotoError("Dokumentasi foto wajib diisi"); valid = false; }
    else setPhotoError("");
    if (!valid) return;
    mutation.mutate(values);
  });

  // Progress indicator
  const steps = [
    !!supervisorValue,
    !!selectedBTS,
    !!promotorValue,
    !!selectedBrand,
    !!(watch("mdn")?.length >= 8),
    !!photoBase64,
  ];
  const completedSteps = steps.filter(Boolean).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-xl font-bold sm:text-2xl">Input Aktivasi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">SP Seeding — Isi semua data dengan benar</p>
        </div>

        {/* ── Progress bar ─────────────────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/60 p-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Progress pengisian</p>
            <span className="text-xs font-bold text-primary">{completedSteps}/{steps.length}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-blue transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {steps.map((done, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all duration-300",
                  done ? "gradient-blue scale-110" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* ── Offline banner ────────────────────────────────── */}
        {typeof window !== "undefined" && !navigator.onLine && (
          <div className="mb-4 flex items-center gap-3 p-3.5 rounded-2xl
            bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Offline — data akan disimpan ke antrian</p>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-3">

            {/* 1. Supervisor */}
            <FormSection
              step={1} icon={UserCircle} gradient="from-blue-500 to-blue-600"
              title="Supervisor" done={!!supervisorValue}
            >
              <AutocompleteInput
                label="Nama Supervisor"
                placeholder="Cari nama supervisor…"
                suggestions={spvList}
                value={supervisorValue || ""}
                onChange={(v) => setValue("supervisor", v, { shouldValidate: true })}
                error={errors.supervisor?.message}
                loading={spvLoading}
                required
              />
            </FormSection>

            {/* 2. ID BTS */}
            <FormSection
              step={2} icon={Radio} gradient="from-slate-500 to-slate-600"
              title="ID BTS / Tower" subtitle="Cari tower target aktivasi"
              done={!!selectedBTS}
            >
              <BTSSearch
                btsData={btsData}
                selectedBTS={selectedBTS}
                onSelect={(bts) => { setSelectedBTS(bts); if (bts) setBtsError(""); }}
                error={btsError}
                loading={btsLoading}
              />
            </FormSection>

            {/* 3. Promotor */}
            <FormSection
              step={3} icon={Users2} gradient="from-emerald-500 to-emerald-600"
              title="Nama Promotor Outstore" done={!!promotorValue}
            >
              <AutocompleteInput
                label="Nama Promotor Outstore"
                placeholder="Cari nama promotor…"
                suggestions={promotorList}
                value={promotorValue || ""}
                onChange={(v) => setValue("promotor", v, { shouldValidate: true })}
                error={errors.promotor?.message}
                loading={promotorLoading}
                required
              />
            </FormSection>

            {/* 4. Brand */}
            <FormSection
              step={4} icon={Tag} gradient="from-purple-500 to-purple-600"
              title="Brand" subtitle="Pilih operator yang diaktivasi"
              done={!!selectedBrand}
            >
              {/* Brand picker cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setValue("brand", b, { shouldValidate: true });
                      setSelectedBrand(b);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-semibold",
                      "transition-all duration-200 active:scale-95",
                      selectedBrand === b
                        ? `bg-gradient-to-br ${BRAND_COLORS[b]} text-white border-transparent shadow-lg`
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <span className="text-xl">{BRAND_ICONS[b]}</span>
                    <span>{b}</span>
                  </button>
                ))}
              </div>
              {errors.brand && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.brand.message}
                </p>
              )}
              {/* Hidden select for form state */}
              <Select
                value={selectedBrand}
                onValueChange={(v) => { setValue("brand", v, { shouldValidate: true }); setSelectedBrand(v); }}
              >
                <SelectTrigger className="sr-only" tabIndex={-1}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormSection>

            {/* 5. MDN */}
            <FormSection
              step={5} icon={Hash} gradient="from-cyan-500 to-cyan-600"
              title="MDN Aktivasi" subtitle="Nomor yang diaktivasi"
              done={!!(watch("mdn")?.length >= 8)}
            >
              <div className="space-y-1.5">
                <Label htmlFor="mdn" className="text-sm">
                  MDN Aktivasi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mdn"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0812 3456 7890"
                  className={cn(
                    "h-12 text-lg font-mono tracking-widest",
                    errors.mdn ? "border-destructive" : ""
                  )}
                  {...register("mdn")}
                />
                {errors.mdn ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.mdn.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Masukkan nomor MDN tanpa spasi atau tanda hubung</p>
                )}
              </div>
            </FormSection>

            {/* 6. Dokumentasi */}
            <FormSection
              step={6} icon={Camera} gradient="from-pink-500 to-pink-600"
              title="Dokumentasi Foto" subtitle="Foto bukti aktivasi"
              done={!!photoBase64}
            >
              <PhotoUpload
                onPhotoChange={(base64) => {
                  setPhotoBase64(base64);
                  if (base64) setPhotoError("");
                }}
                error={photoError}
              />
            </FormSection>

            {/* GPS (auto) */}
            <FormSection
              step={7} icon={MapPin} gradient="from-orange-500 to-orange-600"
              title="Lokasi GPS" subtitle="Otomatis — verifikasi jarak ke BTS"
              done={!!gpsData}
            >
              <GPSCapture
                btslat={selectedBTS?.latitude}
                btsLng={selectedBTS?.longitude}
                onLocationCapture={(lat, lng, distance) =>
                  setGpsData({ lat, lng, distance })
                }
              />
            </FormSection>

            {/* Submit */}
            <div className="pt-2 pb-4">
              {mutation.isError && (
                <div className="mb-3 flex items-center gap-3 p-3.5 rounded-2xl
                  bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{(mutation.error as Error).message}</span>
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full h-14 text-base font-semibold rounded-2xl",
                  "gradient-blue shadow-lg shadow-blue-500/30",
                  "hover:opacity-90 active:scale-[0.98]",
                  "transition-all duration-200"
                )}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim…
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Kirim Aktivasi
                  </div>
                )}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </PageContainer>
  );
}
