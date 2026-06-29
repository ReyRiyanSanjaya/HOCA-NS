"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2,
  ChevronRight, Download, X, Loader2, Table2, Lock, Eye, EyeOff,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label }    from "@/components/ui/label";
import { Input }    from "@/components/ui/input";

import { parseImportFile } from "@/lib/csv-parser";
import { importMasterData } from "@/lib/api";
import { CACHE_KEYS, IMPORT_PASSWORD } from "@/lib/config";
import type { ImportTarget, ImportPreview } from "@/types";

// ── Schema kolom sesuai data asli ─────────────────────────────────────────
const SCHEMA: Record<
  ImportTarget,
  { required: string[]; optional: string[]; sample: string[][] }
> = {
  bts: {
    required: ["Tower ID", "Tower Name", "Lat", "Long", "Kabupaten"],
    optional: [
      "New Tower OA Date (NewTower Activated)",
      "Cluster",
      "Qty SP Seeding per BTS",
      "PM",
      "SPV",
    ],
    sample: [
      [
        "Tower ID",
        "Tower Name",
        "New Tower OA Date (NewTower Activated)",
        "Lat",
        "Long",
        "Cluster",
        "Qty SP Seeding per BTS",
        "PM",
        "SPV",
        "Kabupaten",
      ],
      [
        "BTS-001",
        "Tower Alpha",
        "2025-01-15",
        "-6.2088",
        "106.8456",
        "JKT-A",
        "5",
        "PM Jakarta",
        "SPV-01",
        "Jakarta Selatan",
      ],
    ],
  },
  promotor: {
    required: ["Nama Promotor Outstore"],
    optional: ["SPV", "Area", "Status"],
    sample: [
      ["Nama Promotor Outstore", "SPV", "Area", "Status"],
      ["Budi Santoso", "SPV-01", "Jakarta", "Active"],
    ],
  },
  spv: {
    required: ["Nama SPV"],
    optional: ["Area"],
    sample: [
      ["Nama SPV", "Area"],
      ["Ahmad Fauzi", "Jakarta"],
    ],
  },
};

const TARGET_LABELS: Record<ImportTarget, string> = {
  bts:      "Master BTS",
  promotor: "Master Promotor",
  spv:      "Master SPV",
};

const CACHE_KEY_MAP: Record<ImportTarget, string> = {
  bts:      CACHE_KEYS.masterBTS,
  promotor: CACHE_KEYS.masterPromotor,
  spv:      CACHE_KEYS.masterSPV,
};

function validateRows(target: ImportTarget, rows: Record<string, string>[]) {
  const required = SCHEMA[target].required;
  const errors: string[] = [];
  let mapped = 0;
  rows.forEach((row, idx) => {
    const missing = required.filter((col) => !row[col]?.trim());
    if (missing.length === 0) {
      mapped++;
    } else if (errors.length < 5) {
      errors.push(`Baris ${idx + 2}: kolom "${missing.join('", "')}" kosong`);
    }
  });
  return { mapped, errors };
}

function downloadSample(target: ImportTarget) {
  const { sample } = SCHEMA[target];
  const csv = sample
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `template_${target}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Props ──────────────────────────────────────────────────────────────────
interface ImportDialogProps {
  open:    boolean;
  target:  ImportTarget;
  onClose: () => void;
}

type Step = "auth" | "upload" | "preview" | "done";

// ── Component ──────────────────────────────────────────────────────────────
export function ImportDialog({ open, target, onClose }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [step,       setStep]       = useState<Step>("auth");
  const [password,   setPassword]   = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [authError,  setAuthError]  = useState("");
  const [preview,    setPreview]    = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState("");
  const [mode,       setMode]       = useState<"append" | "replace">("append");

  const reset = useCallback(() => {
    setStep("auth");
    setPassword("");
    setShowPwd(false);
    setAuthError("");
    setPreview(null);
    setParseError("");
    setMode("append");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1: authenticate ────────────────────────────────────────────────
  const handleAuth = () => {
    if (password === IMPORT_PASSWORD) {
      setAuthError("");
      setStep("upload");
    } else {
      setAuthError("Kata sandi salah. Coba lagi.");
      setPassword("");
    }
  };

  // ── Step 2: parse file ──────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setParseError("");
    try {
      const result = await parseImportFile(file);
      if (result.total === 0) {
        setParseError("File kosong — tidak ada baris data.");
        return;
      }
      const { mapped, errors } = validateRows(target, result.rows);
      setPreview({ target, headers: result.headers, rows: result.rows, total: result.total, mapped, errors });
      setStep("preview");
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  // ── Step 3: submit ──────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => importMasterData(target, preview!.rows, mode),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Import berhasil!", {
          description: `${res.inserted} ditambah · ${res.updated} diperbarui · ${res.skipped} dilewati`,
        });
        queryClient.invalidateQueries({ queryKey: [CACHE_KEY_MAP[target]] });
        setStep("done");
      } else {
        toast.error("Import gagal", { description: res.errors?.[0] || res.message });
      }
    },
    onError: (err: Error) => toast.error("Import gagal", { description: err.message }),
  });

  const STEPS: Step[] = ["auth", "upload", "preview", "done"];
  const stepLabels: Record<Step, string> = {
    auth:    "Verifikasi",
    upload:  "Pilih File",
    preview: "Preview",
    done:    "Selesai",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import {TARGET_LABELS[target]}
          </DialogTitle>
          <DialogDescription>
            Upload CSV atau TSV · Data ditulis langsung ke Google Sheets
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b bg-muted/30 text-xs overflow-x-auto">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <span
                className={`font-medium whitespace-nowrap ${
                  step === s ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {i + 1}. {stepLabels[s]}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">

            {/* ══ STEP: AUTH ════════════════════════════════ */}
            {step === "auth" && (
              <div className="max-w-sm mx-auto py-4 space-y-5">
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-base">Akses Terlindungi</p>
                  <p className="text-sm text-muted-foreground">
                    Masukkan kata sandi untuk mengakses fitur import data master
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-pwd">Kata Sandi Import</Label>
                  <div className="relative">
                    <Input
                      id="import-pwd"
                      type={showPwd ? "text" : "password"}
                      placeholder="Masukkan kata sandi…"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                      className={`pr-10 ${authError ? "border-destructive" : ""}`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {authError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {authError}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleAuth}
                  disabled={!password}
                >
                  <Lock className="h-4 w-4" />
                  Verifikasi
                </Button>
              </div>
            )}

            {/* ══ STEP: UPLOAD ══════════════════════════════ */}
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
                  <p className="font-medium text-sm">Klik atau drag &amp; drop file di sini</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format CSV atau TSV · Encoding UTF-8
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 gap-2" type="button">
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

                {/* Kolom info + template */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Kolom yang dibutuhkan</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => downloadSample(target)}
                      type="button"
                    >
                      <Download className="h-3 w-3" />
                      Download Template CSV
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Wajib:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SCHEMA[target].required.map((col) => (
                        <Badge key={col} variant="default" className="text-xs">{col}</Badge>
                      ))}
                    </div>
                  </div>

                  {SCHEMA[target].optional.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Opsional:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SCHEMA[target].optional.map((col) => (
                          <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BTS column mapping hint */}
                  {target === "bts" && (
                    <p className="text-xs text-muted-foreground bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                      💡 Kolom &quot;Tower ID&quot; digunakan sebagai ID unik. Pastikan tidak ada duplikat.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ══ STEP: PREVIEW ═════════════════════════════ */}
            {step === "preview" && preview && (
              <>
                {/* Summary cards */}
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

                {/* Validation warnings */}
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

                {/* Mode */}
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
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <p className={`font-semibold ${mode === m ? "text-primary" : ""}`}>
                          {m === "append" ? "Tambah / Perbarui" : "Ganti Semua (Replace)"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m === "append"
                            ? "Baris baru ditambah, Tower ID yang sudah ada diperbarui"
                            : "⚠️ Hapus semua data lama, ganti dengan file ini"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Table2 className="h-3 w-3" />
                    Preview (5 baris pertama)
                  </p>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b">
                          {preview.headers.slice(0, 8).map((h) => (
                            <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                          {preview.headers.length > 8 && (
                            <th className="px-2 py-2 text-muted-foreground">
                              +{preview.headers.length - 8} lagi
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                            {preview.headers.slice(0, 8).map((h) => (
                              <td key={h} className="px-2 py-1.5 max-w-32 truncate">
                                {row[h] || <span className="text-muted-foreground">—</span>}
                              </td>
                            ))}
                            {preview.headers.length > 8 && (
                              <td className="px-2 py-1.5 text-muted-foreground">…</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {mutation.isPending && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mengirim ke Google Sheets…</p>
                    <Progress value={undefined} className="h-1.5 animate-pulse" />
                  </div>
                )}
              </>
            )}

            {/* ══ STEP: DONE ════════════════════════════════ */}
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
                    <p className="text-xs font-semibold text-destructive mb-1">Error detail:</p>
                    {mutation.data.errors.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <Button
            variant="ghost"
            onClick={step === "auth" || step === "done" ? handleClose : step === "upload" ? reset : () => setStep("upload")}
          >
            {step === "done" ? "Tutup" : step === "auth" ? "Batal" : "← Kembali"}
          </Button>

          <div className="flex gap-2">
            {step === "auth" && (
              <Button onClick={handleAuth} disabled={!password} className="gap-2">
                <Lock className="h-4 w-4" />
                Masuk
              </Button>
            )}

            {step === "preview" && (
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || preview!.mapped === 0}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Mengimpor…</>
                ) : (
                  <><Upload className="h-4 w-4" />Import {preview!.mapped} Baris</>
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
        </div>

      </DialogContent>
    </Dialog>
  );
}
