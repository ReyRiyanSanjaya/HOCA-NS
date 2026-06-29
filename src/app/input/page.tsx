"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";

import { PageContainer }             from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }                    from "@/components/ui/button";
import { Input }                     from "@/components/ui/input";
import { Label }                     from "@/components/ui/label";
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
import { getDeviceInfo, getBrowserInfo, getGoogleMapsURL, getTodayString } from "@/lib/utils";
import { addToOfflineQueue } from "@/lib/offline-queue";
import type { MasterBTS }    from "@/types";

// ── Validation schema sesuai form ──────────────────────────────────────────
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

export default function InputPage() {
  const queryClient = useQueryClient();
  const { data: btsData = [], isLoading: btsLoading } = useMasterBTS();
  const { data: promotorData = [] } = useMasterPromotor();
  const { data: spvData = [] }      = useMasterSPV();

  const [selectedBTS,   setSelectedBTS]   = useState<MasterBTS | null>(null);
  const [btsError,      setBtsError]      = useState("");
  const [photoBase64,   setPhotoBase64]   = useState<string | null>(null);
  const [photoError,    setPhotoError]    = useState("");
  const [gpsData,       setGpsData]       = useState<{ lat: number; lng: number; distance: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

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
      fd.append("action",           "transaction");
      fd.append("supervisor",       values.supervisor);
      fd.append("idBTS",            selectedBTS.id);
      fd.append("promotor",         values.promotor);
      fd.append("brand",            values.brand);
      fd.append("mdn",              values.mdn);
      fd.append("photoBase64",      photoBase64);
      fd.append("latitudeUser",     String(gpsData.lat));
      fd.append("longitudeUser",    String(gpsData.lng));
      fd.append("distanceFromBTS",  String(gpsData.distance));
      fd.append("googleMapsURL",    getGoogleMapsURL(gpsData.lat, gpsData.lng));
      fd.append("device",           getDeviceInfo());
      fd.append("browser",          getBrowserInfo());
      fd.append("tanggal",          getTodayString());

      return postTransaction(fd);
    },
    onSuccess: (data) => {
      toast.success("Aktivasi berhasil dikirim!", {
        description: `ID Transaksi: ${data.id}`,
      });
      reset();
      setSelectedBTS(null);
      setPhotoBase64(null);
      setGpsData(null);
      setBtsError("");
      setPhotoError("");
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
              supervisor:    vals.supervisor,
              idBTS:         selectedBTS.id,
              promotor:      vals.promotor,
              brand:         vals.brand,
              mdn:           vals.mdn,
              photoBase64,
              latitudeUser:  gpsData.lat,
              longitudeUser: gpsData.lng,
            },
          });
          toast.warning("Disimpan ke antrian offline", {
            description: "Akan dikirim otomatis saat koneksi pulih",
          });
        }
      } else {
        toast.error("Pengiriman gagal", { description: error.message });
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    let valid = true;
    if (!selectedBTS) { setBtsError("Pilih ID BTS terlebih dahulu"); valid = false; }
    else               setBtsError("");
    if (!photoBase64)  { setPhotoError("Dokumentasi foto wajib diisi"); valid = false; }
    else               setPhotoError("");
    if (!valid) return;
    mutation.mutate(values);
  });

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Input Aktivasi SP Seeding</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Isi semua data dengan lengkap dan benar
          </p>
        </div>

        {/* Offline banner */}
        {typeof window !== "undefined" && !navigator.onLine && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <p className="text-sm">Kamu sedang offline. Data akan disimpan ke antrian.</p>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-4">

            {/* 1. Supervisor */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">1. Supervisor</CardTitle>
              </CardHeader>
              <CardContent>
                <AutocompleteInput
                  label="Supervisor"
                  placeholder="Cari nama supervisor…"
                  suggestions={spvList}
                  value={supervisorValue || ""}
                  onChange={(v) => setValue("supervisor", v, { shouldValidate: true })}
                  error={errors.supervisor?.message}
                  required
                />
              </CardContent>
            </Card>

            {/* 2. ID BTS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">2. ID BTS</CardTitle>
              </CardHeader>
              <CardContent>
                {btsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Memuat data BTS…
                  </div>
                ) : (
                  <BTSSearch
                    btsData={btsData}
                    selectedBTS={selectedBTS}
                    onSelect={(bts) => {
                      setSelectedBTS(bts);
                      if (bts) setBtsError("");
                    }}
                    error={btsError}
                  />
                )}
              </CardContent>
            </Card>

            {/* 3. Nama Promotor Outstore */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">3. Nama Promotor Outstore</CardTitle>
              </CardHeader>
              <CardContent>
                <AutocompleteInput
                  label="Nama Promotor Outstore"
                  placeholder="Cari nama promotor…"
                  suggestions={promotorList}
                  value={promotorValue || ""}
                  onChange={(v) => setValue("promotor", v, { shouldValidate: true })}
                  error={errors.promotor?.message}
                  required
                />
              </CardContent>
            </Card>

            {/* 4. Brand */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">4. Brand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>
                    Brand (Smartfren / XL / Axis){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v) => setValue("brand", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className={errors.brand ? "border-destructive" : ""}>
                      <SelectValue placeholder="Pilih brand…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.brand && (
                    <p className="text-xs text-destructive">{errors.brand.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 5. MDN Aktivasi */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">5. MDN Aktivasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label htmlFor="mdn">
                    MDN Aktivasi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mdn"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Contoh: 08123456789"
                    className={errors.mdn ? "border-destructive" : ""}
                    {...register("mdn")}
                  />
                  {errors.mdn ? (
                    <p className="text-xs text-destructive">{errors.mdn.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Masukkan nomor MDN yang diaktivasi</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 6. Dokumentasi (Foto) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">6. Dokumentasi</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload
                  onPhotoChange={(base64) => {
                    setPhotoBase64(base64);
                    if (base64) setPhotoError("");
                  }}
                  error={photoError}
                />
              </CardContent>
            </Card>

            {/* GPS — auto, bukan field wajib user */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Lokasi GPS (Otomatis)</CardTitle>
              </CardHeader>
              <CardContent>
                <GPSCapture
                  btslat={selectedBTS?.latitude}
                  btsLng={selectedBTS?.longitude}
                  onLocationCapture={(lat, lng, distance) =>
                    setGpsData({ lat, lng, distance })
                  }
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="pb-4">
              {mutation.isError && (
                <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {(mutation.error as Error).message}
                </div>
              )}
              {mutation.isSuccess && (
                <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Aktivasi berhasil dikirim!
                </div>
              )}
              <Button
                type="submit"
                size="xl"
                className="w-full gap-2"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim…
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Kirim Aktivasi
                  </>
                )}
              </Button>
            </div>

          </div>
        </form>
      </div>
    </PageContainer>
  );
}
