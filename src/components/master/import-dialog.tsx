"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2,
  ChevronRight, Download, X, Loader2, Table2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

import { parseImportFile } from "@/lib/csv-parser";
import { importMasterData } from "@/lib/api";
import { CACHE_KEYS } from "@/lib/config";
import type { ImportTarget, ImportPreview } from "@/types";

// ── column mappings ────────────────────────────────────────────────────────
const SCHEMA: Record<ImportTarget, { required: string[]; optional: string[]; sample: string[][] }> = {
  bts: {
    required: ["ID BTS", "Tower Name", "Latitude", "Longitude", "Kabupaten"],
    optional: ["Kecamatan", "Kelurahan", "Cluster XL", "XL", "SPM", "SPV", "Region", "Branch",
               "New Tower OA Date", "Qty SP Seeding by Brand(s)", "Status Tower", "Priority"],
    sample: [
      ["ID BTS","Tower Name","Latitude","Longitude","Kabupaten","Kecamatan","Kelurahan",
       "Cluster XL","XL","SPM","SPV","Region","Branch","Status Tower","Priority"],
      ["BTS-001","Tower Alpha","-6.2088","106.8456","Jakarta Selatan","Kebayoran","Senopati",
       "JKT-A","XL001","PM Jakarta","SPV-01","DKI","Branch A","Active","High"],
    ],
  },
  promotor: {
    required: ["Nama Promotor"],
    optional: ["SPV", "Area", "Status"],
    sample: [
      ["Nama Promotor","SPV","Area","Status"],
      ["Budi Santoso","SPV-01","Jakarta","Active"],
    ],
  },
  spv: {
    required: ["Nama SPV"],
    optional: ["Area"],
    sample: [
      ["Nama SPV","Area"],
      ["Ahmad Fauzi","Jakarta"],
    ],
  },
};

const TARGET_LABELS: Record<ImportTarget, string> = {
  bts: "Master BTS",
  promotor: "Master Promotor",
  spv: "Master SPV",
};

const CACHE_KEY_MAP: Record<ImportTarget, string> = {
  bts: CACHE_KEYS.masterBTS,
  promotor: CACHE_KEYS.masterPromotor,
  spv: CACHE_KEYS.masterSPV,
};

function validateRows(target: ImportTarget, rows: Record<string, string>[]) {
  const required = SCHEMA[target].required;
  const errors: string[] = [];
  let mapped = 0;

  rows.forEach((row, idx) => {
    const missing = required.filter((col) => !row[col]?.trim());
    if (missing.length === 0) {
      mapped++;
    } else {
      if (errors.length < 5) {
        errors.push(`Row ${idx + 2}: missing ${missing.join(", ")}`);
      }
    }
  });

  return { mapped, errors };
}

// ── download sample CSV ────────────────────────────────────────────────────
function downloadSample(target: ImportTarget) {
  const { sample } = SCHEMA[target];
  const csv = sample.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `template_${target}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Props ──────────────────────────────────────────────────────────────────
interface ImportDialogProps {
  open: boolean;
  target: ImportTarget;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────
export function ImportDialog({ open, target, onClose }: ImportDialogProps) {
  const queryClient  = useQueryClient();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState<string>("");
  const [mode, setMode]           = useState<"append" | "replace">("append");
  const [step, setStep]           = useState<"upload" | "preview" | "done">("upload");

  const reset = useCallback(() => {
    setPreview(null);
    setParseError("");
    setStep("upload");
    setMode("append");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // Parse file on select
  const handleFile = async (file: File) => {
    if (!file) return;
    setParseError("");
    try {
      const result = await parseImportFile(file);
      if (result.total === 0) {
        setParseError("File kosong — tidak ada baris data.");
        return;
      }
      const { mapped, errors } = validateRows(target, result.rows);
      setPreview({
        target,
        headers: result.headers,
        rows: result.rows,
        total: result.total,
        mapped,
        errors,
      });
      setStep("preview");
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  // Submit mutation
  const mutation = useMutation({
    mutationFn: () => importMasterData(target, preview!.rows, mode),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Import berhasil!`, {
          description: `${res.inserted} baris ditambahkan, ${res.updated} diperbarui, ${res.skipped} dilewati.`,
        });
        queryClient.invalidateQueries({ queryKey: [CACHE_KEY_MAP[target]] });
        setStep("done");
      } else {
        toast.error("Import gagal", { description: res.errors?.[0] || res.message });
      }
    },
    onError: (err: Error) => {
      toast.error("Import gagal", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import {TARGET_LABELS[target]}
          </DialogTitle>
          <DialogDescription>
            Upload CSV atau TSV • Data akan ditulis ke Google Sheets
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30 text-xs">
          {(["upload", "preview", "done"] as const).map((s, i) => (
            <React.Fragment key={s}>
              <span className={`font-medium ${step === s ? "text-primary" : "text-muted-foreground"}`}>
                {i + 1}. {s === "upload" ? "Pilih File" : s === "preview" ? "Preview" : "Selesai"}
              </span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">

            {/* ── STEP: UPLOAD ─────────────────────────── */}
            {step === "upload" && (
              <>
                {/* Drop zone */}
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium text-sm">Klik atau drag & drop file di sini</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: CSV atau TSV • Encoding: UTF-8
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 gap-2">
                    <Upload className="h-4 w-4" />
                    Pilih File
                  </Button>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                {parseError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {parseError}
                  </div>
                )}

                {/* Template columns info */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Kolom yang dibutuhkan</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => downloadSample(target)}
                    >
                      <Download className="h-3 w-3" />
                      Download Template
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEMA[target].required.map((col) => (
                      <Badge key={col} variant="default" className="text-xs">{col}</Badge>
                    ))}
                    {SCHEMA[target].optional.map((col) => (
                      <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Biru</span> = wajib •{" "}
                    <span className="font-medium">Abu</span> = opsional
                  </p>
                </div>
              </>
            )}

            {/* ── STEP: PREVIEW ────────────────────────── */}
            {step === "preview" && preview && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{preview.total}</p>
                    <p className="text-xs text-muted-foreground">Total Baris</p>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {preview.mapped}
                    </p>
                    <p className="text-xs text-muted-foreground">Siap Import</p>
                  </div>
                  <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {preview.total - preview.mapped}
                    </p>
                    <p className="text-xs text-muted-foreground">Tidak Lengkap</p>
                  </div>
                </div>

                {/* Validation errors */}
                {preview.errors.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Peringatan ({preview.errors.length})
                    </p>
                    {preview.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{e}</p>
                    ))}
                    {preview.total - preview.mapped > preview.errors.length && (
                      <p className="text-xs text-muted-foreground">
                        …dan {preview.total - preview.mapped - preview.errors.length} baris lainnya
                      </p>
                    )}
                  </div>
                )}

                {/* Import mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Mode Import</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["append", "replace"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`rounded-xl border p-3 text-left text-sm transition-all ${
                          mode === m
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <p className="font-semibold capitalize">{m === "append" ? "Tambah (Append)" : "Ganti Semua (Replace)"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m === "append"
                            ? "Tambah baris baru, ID BTS yang sudah ada akan diperbarui"
                            : "Hapus semua data lama, ganti dengan file ini"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data table preview */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Table2 className="h-3 w-3" />
                    Preview Data (5 baris pertama)
                  </p>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b">
                          {preview.headers.slice(0, 8).map((h) => (
                            <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                          {preview.headers.length > 8 && (
                            <th className="px-2 py-2 text-muted-foreground">+{preview.headers.length - 8} lagi</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                            {preview.headers.slice(0, 8).map((h) => (
                              <td key={h} className="px-2 py-1.5 max-w-28 truncate">
                                {row[h] || <span className="text-muted-foreground">—</span>}
                              </td>
                            ))}
                            {preview.headers.length > 8 && <td className="px-2 py-1.5 text-muted-foreground">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Progress bar during upload */}
                {mutation.isPending && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Mengirim ke Google Sheets…</span>
                    </div>
                    <Progress value={undefined} className="h-2 animate-pulse" />
                  </div>
                )}
              </>
            )}

            {/* ── STEP: DONE ───────────────────────────── */}
            {step === "done" && mutation.data && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <p className="text-lg font-bold">Import Berhasil!</p>
                  <p className="text-sm text-muted-foreground mt-1">{mutation.data.message}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  <div className="bg-green-500/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {mutation.data.inserted}
                    </p>
                    <p className="text-xs text-muted-foreground">Ditambah</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {mutation.data.updated}
                    </p>
                    <p className="text-xs text-muted-foreground">Diperbarui</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{mutation.data.skipped}</p>
                    <p className="text-xs text-muted-foreground">Dilewati</p>
                  </div>
                </div>
                {mutation.data.errors?.length > 0 && (
                  <div className="text-left rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold text-destructive mb-1">Error:</p>
                    {mutation.data.errors.slice(0, 3).map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex gap-2 justify-between px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" onClick={step === "upload" ? handleClose : reset} className="gap-2">
            {step === "done" ? <X className="h-4 w-4" /> : null}
            {step === "done" ? "Tutup" : step === "upload" ? "Batal" : "← Ulang"}
          </Button>

          {step === "preview" && (
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || preview!.mapped === 0}
              className="gap-2"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Mengimpor…</>
              ) : (
                <><Upload className="h-4 w-4" /> Import {preview!.mapped} Baris</>
              )}
            </Button>
          )}

          {step === "done" && (
            <Button onClick={handleClose} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Selesai
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
