"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2, ChevronRight,
  Download, X, Loader2, Lock, Eye, EyeOff, Table2, FileUp,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { parseImportFile } from "@/lib/csv-parser";
import { importMasterData } from "@/lib/api";
import { CACHE_KEYS, IMPORT_PASSWORD } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ImportTarget, ImportPreview } from "@/types";

// ── Schema ─────────────────────────────────────────────────────────────────
const SCHEMA: Record<ImportTarget, {
  required: string[];
  optional: string[];
  sample: string[][];
}> = {
  bts: {
    required: ["Tower ID", "Lat", "Long", "Kabupaten"],
    optional: ["Tower Name", "New Tower OA Date (NewTower Activated)", "Cluster", "Qty SP Seeding per BTS", "PM", "SPV"],
    sample: [
      ["Tower ID","Tower Name","New Tower OA Date (NewTower Activated)","Lat","Long","Cluster","Qty SP Seeding per BTS","PM","SPV","Kabupaten"],
      ["SUM-AC-JTH-0013","Tower Alpha","2026-05-04","-6.2088","106.8456","NS-NAD","50 Pcs","AYUB HARIYONO","DOLLY AULIA","Kab. Aceh Besar"],
    ],
  },
  promotor: {
    required: ["Nama Promotor Outstore"],
    optional: ["SPV", "Area", "Status"],
    sample: [
      ["Nama Promotor Outstore","SPV","Area","Status"],
      ["Budi Santoso","Ahmad Fauzi","Jakarta Selatan","Active"],
      ["Siti Rahayu","Budi Hartono","Jawa Barat","Active"],
    ],
  },
  spv: {
    required: ["Nama SPV"],
    optional: ["Area"],
    sample: [
      ["Nama SPV","Area"],
      ["Ahmad Fauzi","Jakarta Selatan"],
      ["Budi Hartono","Jawa Barat"],
    ],
  },
};

const TARGET_LABELS: Record<ImportTarget, string> = {
  bts: "Master BTS", promotor: "Master Promotor", spv: "Master SPV",
};
const CACHE_KEY_MAP: Record<ImportTarget, string> = {
  bts: CACHE_KEYS.masterBTS, promotor: CACHE_KEYS.masterPromotor, spv: CACHE_KEYS.masterSPV,
};
const TARGET_GRADIENT: Record<ImportTarget, string> = {
  bts: "gradient-blue", promotor: "gradient-green", spv: "gradient-purple",
};

function validateRows(target: ImportTarget, rows: Record<string, string>[]) {
  const required = SCHEMA[target].required;
  const errors: string[] = [];
  let mapped = 0;
  rows.forEach((row, idx) => {
    const missing = required.filter((col) => !row[col]?.trim());
    if (missing.length === 0) { mapped++; }
    else if (errors.length < 5) {
      errors.push(`Baris ${idx + 2}: "${missing.join('", "')}" kosong`);
    }
  });
  return { mapped, errors };
}

function downloadSample(target: ImportTarget) {
  const csv = SCHEMA[target].sample
    .map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_${target}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Step = "auth" | "upload" | "preview" | "done";

const STEP_LABELS: Record<Step, string> = {
  auth: "Verifikasi", upload: "Pilih File", preview: "Preview", done: "Selesai",
};
const ALL_STEPS: Step[] = ["auth", "upload", "preview", "done"];

interface ImportDialogProps {
  open: boolean;
  target: ImportTarget;
  onClose: () => void;
}

export function ImportDialog({ open, target, onClose }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<Step>("auth");
  const [password,    setPassword]    = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [authError,   setAuthError]   = useState("");
  const [authShake,   setAuthShake]   = useState(false);
  const [preview,     setPreview]     = useState<ImportPreview | null>(null);
  const [parseError,  setParseError]  = useState("");
  const [mode,        setMode]        = useState<"append" | "replace">("append");
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const reset = useCallback(() => {
    setStep("auth"); setPassword(""); setShowPwd(false);
    setAuthError(""); setPreview(null); setParseError(""); setMode("append");
    setBatchProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const handleAuth = () => {
    if (password === IMPORT_PASSWORD) {
      setAuthError(""); setStep("upload");
    } else {
      setAuthError("Password salah. Coba lagi.");
      setAuthShake(true);
      setTimeout(() => setAuthShake(false), 500);
      setPassword("");
    }
  };

  const handleFile = async (file: File) => {
    setParseError("");
    try {
      const result = await parseImportFile(file);
      if (result.total === 0) { setParseError("File kosong."); return; }
      const { mapped, errors } = validateRows(target, result.rows);
      setPreview({ target, headers: result.headers, rows: result.rows, total: result.total, mapped, errors });
      setStep("preview");
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      setBatchProgress({ done: 0, total: preview!.mapped });
      return importMasterData(target, preview!.rows, mode, (done, total) => {
        setBatchProgress({ done, total });
      });
    },
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

  if (!open) return null;

  const gradClass = TARGET_GRADIENT[target];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

      {/* Sheet — bottom on mobile, centered on tablet+ */}
      <div
        className={cn(
          "relative w-full sm:max-w-lg",
          "bg-card border border-border/60",
          "rounded-t-3xl sm:rounded-3xl",
          "shadow-[0_-8px_60px_rgba(0,0,0,0.25)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.2)]",
          "flex flex-col",
          "max-h-[92vh]",
          "animate-slide-up sm:animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg", gradClass)}>
              <FileUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base">Import {TARGET_LABELS[target]}</p>
              <p className="text-xs text-muted-foreground">CSV / TSV → Google Sheets</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-1 px-5 py-2.5 bg-muted/30 border-b border-border/60 overflow-x-auto shrink-0">
          {ALL_STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <span className={cn(
                "text-xs font-semibold whitespace-nowrap px-2.5 py-1 rounded-full transition-all",
                step === s
                  ? cn("text-white shadow-md", gradClass)
                  : ALL_STEPS.indexOf(step) > i
                  ? "text-green-600 dark:text-green-400 bg-green-500/10"
                  : "text-muted-foreground"
              )}>
                {i + 1}. {STEP_LABELS[s]}
              </span>
              {i < ALL_STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── AUTH ─────────────────────────────────────────── */}
          {step === "auth" && (
            <div className={cn("space-y-5 max-w-xs mx-auto py-2", authShake && "animate-shake")}>
              <div className="text-center space-y-3">
                <div className={cn("mx-auto h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl", gradClass)}>
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-base">Akses Terlindungi</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Masukkan password import</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password Import</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Password…"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    className={cn(
                      "w-full h-12 px-4 pr-12 rounded-xl border bg-muted/30 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                      authError ? "border-destructive" : "border-border/60"
                    )}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{authError}
                  </p>
                )}
              </div>
              <button
                onClick={handleAuth}
                disabled={!password}
                className={cn(
                  "w-full h-12 rounded-xl font-semibold text-sm text-white",
                  "flex items-center justify-center gap-2 shadow-lg",
                  "transition-all active:scale-[0.98] disabled:opacity-50",
                  gradClass
                )}
              >
                <Lock className="h-4 w-4" />Verifikasi
              </button>
            </div>
          )}

          {/* ── UPLOAD ───────────────────────────────────────── */}
          {step === "upload" && (
            <>
              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-border/60 rounded-2xl p-7 text-center
                  cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all active:scale-[0.99]"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-sm">Ketuk untuk pilih file</p>
                <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx/.xls) · CSV · TSV</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {parseError && (
                <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{parseError}
                </div>
              )}
              {/* Column guide */}
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Kolom yang diperlukan</p>
                  <button
                    onClick={() => downloadSample(target)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-sm",
                      gradClass
                    )}
                  >
                    <Download className="h-3 w-3" />Template
                  </button>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Wajib</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEMA[target].required.map((c) => (
                      <span key={c} className={cn("text-xs font-medium text-white px-2 py-0.5 rounded-full", gradClass)}>{c}</span>
                    ))}
                  </div>
                </div>
                {SCHEMA[target].optional.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Opsional</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SCHEMA[target].optional.map((c) => (
                        <span key={c} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PREVIEW ──────────────────────────────────────── */}
          {step === "preview" && preview && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total", value: preview.total, color: "bg-muted/60 text-foreground" },
                  { label: "Siap", value: preview.mapped, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
                  { label: "Lewat", value: preview.total - preview.mapped, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn("rounded-2xl p-3 text-center", color)}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs font-medium opacity-80">{label}</p>
                  </div>
                ))}
              </div>
              {/* Warnings */}
              {preview.errors.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />Peringatan ({preview.errors.length})
                  </p>
                  {preview.errors.map((e, i) => <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{e}</p>)}
                  {preview.total - preview.mapped > preview.errors.length && (
                    <p className="text-xs text-muted-foreground">…dan {preview.total - preview.mapped - preview.errors.length} baris lainnya</p>
                  )}
                </div>
              )}
              {/* Mode */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode Import</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["append", "replace"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      className={cn(
                        "rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
                        mode === m ? cn("border-transparent text-white shadow-md", gradClass) : "border-border/60 hover:bg-muted/50"
                      )}
                    >
                      <p className="text-sm font-semibold">{m === "append" ? "Tambah / Perbarui" : "Ganti Semua"}</p>
                      <p className={cn("text-xs mt-0.5", mode === m ? "text-white/80" : "text-muted-foreground")}>
                        {m === "append" ? "ID yang sama diperbarui" : "⚠️ Hapus data lama"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {/* Preview table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Table2 className="h-3.5 w-3.5" />Preview (5 baris)
                </p>
                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60">
                        {preview.headers.slice(0, 6).map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                        {preview.headers.length > 6 && <th className="px-3 py-2.5 text-muted-foreground">+{preview.headers.length - 6}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          {preview.headers.slice(0, 6).map((h) => (
                            <td key={h} className="px-3 py-2 max-w-[120px] truncate">
                              {row[h] || <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                          {preview.headers.length > 6 && <td className="px-3 py-2 text-muted-foreground">…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {mutation.isPending && (
                <div className="space-y-2 animate-fade-up">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Mengirim ke Google Sheets…
                    </span>
                    <span className="font-bold text-primary">
                      {batchProgress.done}/{batchProgress.total}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", gradClass)}
                      style={{
                        width: batchProgress.total > 0
                          ? `${Math.round((batchProgress.done / batchProgress.total) * 100)}%`
                          : "15%",
                        animation: batchProgress.total === 0 ? "pulse 1.5s ease-in-out infinite" : "none",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {batchProgress.total > 0
                      ? `Batch ${Math.ceil(batchProgress.done / 50)} dari ${Math.ceil(batchProgress.total / 50)} · ${Math.round((batchProgress.done / batchProgress.total) * 100)}%`
                      : "Memproses…"
                    }
                  </p>
                </div>
              )}
            </>
          )}
          {/* ── DONE ─────────────────────────────────────────── */}
          {step === "done" && mutation.data && (
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/30">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">Import Berhasil!</p>
                <p className="text-sm text-muted-foreground mt-1">{mutation.data.message}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[
                  { label: "Ditambah",   value: mutation.data.inserted, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
                  { label: "Diperbarui", value: mutation.data.updated,  color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { label: "Dilewati",   value: mutation.data.skipped,  color: "bg-muted text-muted-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn("rounded-2xl p-3 text-center", color)}>
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs">{label}</p>
                  </div>
                ))}
              </div>
              {mutation.data.errors?.length > 0 && (
                <div className="text-left rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5">
                  <p className="text-xs font-semibold text-destructive mb-1">Error:</p>
                  {mutation.data.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-destructive">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>{/* end body */}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-t border-border/60 bg-muted/20">
          <button
            onClick={step === "auth" || step === "done" ? handleClose : step === "upload" ? reset : () => setStep("upload")}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-all active:scale-95"
          >
            {step === "done" ? "Tutup" : step === "auth" ? "Batal" : "← Kembali"}
          </button>
          <div className="flex gap-2">
            {step === "auth" && (
              <button onClick={handleAuth} disabled={!password}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50", gradClass)}>
                <Lock className="h-4 w-4" />Masuk
              </button>
            )}
            {step === "preview" && (
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending || preview!.mapped === 0}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50", gradClass)}>
                {mutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Mengimpor…</>
                  : <><Upload className="h-4 w-4" />Import {preview!.mapped} Baris</>
                }
              </button>
            )}
            {step === "done" && (
              <button onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md gradient-green transition-all active:scale-95">
                <CheckCircle2 className="h-4 w-4" />Selesai
              </button>
            )}
          </div>
        </div>
        <div className="safe-bottom sm:hidden" />
      </div>
    </div>
  );
}
