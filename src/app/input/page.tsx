"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/input/autocomplete-input";
import { BTSSearch } from "@/components/input/bts-search";
import { PhotoUpload } from "@/components/input/photo-upload";
import { GPSCapture } from "@/components/input/gps-capture";
import { useMasterBTS, useMasterPromotor, useMasterSPV } from "@/hooks/use-master-data";
import { postTransaction } from "@/lib/api";
import { BRANDS, CACHE_KEYS } from "@/lib/config";
import {
  getDeviceInfo,
  getBrowserInfo,
  getGoogleMapsURL,
  getTodayString,
} from "@/lib/utils";
import { addToOfflineQueue } from "@/lib/offline-queue";
import type { MasterBTS } from "@/types";

const schema = z.object({
  supervisor: z.string().min(1, "Supervisor is required"),
  promotor: z.string().min(1, "Promotor is required"),
  brand: z.string().min(1, "Brand is required"),
  mdn: z.string().min(5, "MDN must be at least 5 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function InputPage() {
  const queryClient = useQueryClient();
  const { data: btsData = [], isLoading: btsLoading } = useMasterBTS();
  const { data: promotorData = [] } = useMasterPromotor();
  const { data: spvData = [] } = useMasterSPV();

  const [selectedBTS, setSelectedBTS] = useState<MasterBTS | null>(null);
  const [btsError, setBtsError] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    distance: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const supervisorValue = watch("supervisor");
  const promotorValue = watch("promotor");

  const spvList = spvData.map((s) => s.namaSPV);
  const promotorList = promotorData.map((p) => p.namaPromotor);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedBTS) throw new Error("Please select a BTS");
      if (!photoBase64) throw new Error("Please add a photo");
      if (!gpsData) throw new Error("GPS location not captured");

      const formData = new FormData();
      formData.append("action", "transaction");
      formData.append("supervisor", values.supervisor);
      formData.append("promotor", values.promotor);
      formData.append("brand", values.brand);
      formData.append("idBTS", selectedBTS.id);
      formData.append("mdn", values.mdn);
      formData.append("photoBase64", photoBase64);
      formData.append("latitudeUser", String(gpsData.lat));
      formData.append("longitudeUser", String(gpsData.lng));
      formData.append("distanceFromBTS", String(gpsData.distance));
      formData.append("googleMapsURL", getGoogleMapsURL(gpsData.lat, gpsData.lng));
      formData.append("device", getDeviceInfo());
      formData.append("browser", getBrowserInfo());
      formData.append("tanggal", getTodayString());

      return postTransaction(formData);
    },
    onSuccess: (data) => {
      toast.success("Activation submitted successfully!", {
        description: `Transaction ID: ${data.id}`,
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
      // Queue offline if network error
      if (!navigator.onLine) {
        if (selectedBTS && photoBase64 && gpsData) {
          const vals = watch();
          addToOfflineQueue({
            timestamp: new Date().toISOString(),
            formData: {
              supervisor: vals.supervisor,
              promotor: vals.promotor,
              brand: vals.brand,
              idBTS: selectedBTS.id,
              mdn: vals.mdn,
              photoBase64,
              latitudeUser: gpsData.lat,
              longitudeUser: gpsData.lng,
            },
          });
          toast.warning("Saved to offline queue", {
            description: "Will submit when connection is restored",
          });
        }
      } else {
        toast.error("Submission failed", {
          description: error.message,
        });
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    let valid = true;
    if (!selectedBTS) {
      setBtsError("Please select a BTS");
      valid = false;
    } else {
      setBtsError("");
    }
    if (!photoBase64) {
      setPhotoError("Please add a photo");
      valid = false;
    } else {
      setPhotoError("");
    }
    if (!valid) return;
    mutation.mutate(values);
  });

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">New Activation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submit SP seeding activation data
          </p>
        </div>

        {/* Offline Banner */}
        {typeof window !== "undefined" && !navigator.onLine && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <p className="text-sm">
              You&apos;re offline. Submissions will be queued.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-4">
            {/* Supervisor */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Supervisor & Promotor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AutocompleteInput
                  label="Supervisor"
                  placeholder="Search supervisor..."
                  suggestions={spvList}
                  value={supervisorValue || ""}
                  onChange={(v) => setValue("supervisor", v, { shouldValidate: true })}
                  error={errors.supervisor?.message}
                  required
                />
                <AutocompleteInput
                  label="Promotor"
                  placeholder="Search promotor..."
                  suggestions={promotorList}
                  value={promotorValue || ""}
                  onChange={(v) => setValue("promotor", v, { shouldValidate: true })}
                  error={errors.promotor?.message}
                  required
                />
              </CardContent>
            </Card>

            {/* Brand */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Brand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>
                    Brand <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v) => setValue("brand", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className={errors.brand ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select brand..." />
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

            {/* BTS Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">BTS Tower</CardTitle>
              </CardHeader>
              <CardContent>
                {btsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading BTS data...
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

            {/* MDN */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">MDN Number</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label htmlFor="mdn">
                    MDN <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mdn"
                    type="tel"
                    placeholder="Enter MDN number..."
                    className={errors.mdn ? "border-destructive" : ""}
                    {...register("mdn")}
                  />
                  {errors.mdn && (
                    <p className="text-xs text-destructive">{errors.mdn.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* GPS */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">GPS Location</CardTitle>
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

            {/* Photo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Photo Documentation</CardTitle>
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
                  Activation submitted successfully!
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Activation
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
