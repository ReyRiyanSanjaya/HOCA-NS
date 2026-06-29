"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
}

export function AdminLoginModal({ open, onClose, onSuccess, title }: AdminLoginModalProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [shake, setShake]       = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) { setUsername(""); setPassword(""); setError(""); setShowPwd(false); }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Username dan password wajib diisi"); return; }
    setLoading(true);
    setError("");
    // small delay for UX
    await new Promise((r) => setTimeout(r, 400));
    const ok = login(username, password);
    setLoading(false);
    if (ok) {
      onSuccess?.();
      onClose();
    } else {
      setError("Username atau password salah");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-sm animate-scale-in",
        "rounded-3xl border border-border/60 bg-card",
        "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
        shake && "animate-shake"
      )}>
        {/* Top gradient bar */}
        <div className="h-1.5 w-full rounded-t-3xl gradient-blue" />

        <div className="p-6 space-y-5">
          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Admin Login</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {title || "Akses khusus administrator"}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="Username admin…"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl border bg-muted/30 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "transition-all duration-200",
                    error ? "border-destructive" : "border-border/60"
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password…"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className={cn(
                    "w-full h-12 px-4 pr-12 rounded-xl border bg-muted/30 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "transition-all duration-200",
                    error ? "border-destructive" : "border-border/60"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className={cn(
                "w-full h-12 rounded-xl font-semibold text-sm text-white",
                "gradient-blue shadow-lg shadow-blue-500/25",
                "flex items-center justify-center gap-2",
                "transition-all duration-200 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              )}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Masuk sebagai Admin
                </>
              )}
            </button>
          </form>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
