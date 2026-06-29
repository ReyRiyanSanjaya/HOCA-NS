"use client";

import React, { useState } from "react";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { AdminLoginModal } from "./admin-login-modal";
import { cn } from "@/lib/utils";

interface AdminGuardProps {
  children: React.ReactNode;
  pageName?: string;
}

export function AdminGuard({ children, pageName = "halaman ini" }: AdminGuardProps) {
  const { isAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {/* Blocked screen */}
      <div className="page-offset min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6 animate-scale-in">
          {/* Icon */}
          <div className="mx-auto h-24 w-24 rounded-3xl gradient-rose flex items-center justify-center shadow-xl shadow-red-500/25">
            <ShieldAlert className="h-12 w-12 text-white" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Akses Ditolak</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {pageName} hanya dapat diakses oleh{" "}
              <span className="font-semibold text-foreground">Administrator</span>.
              <br />Login dengan akun admin untuk melanjutkan.
            </p>
          </div>

          {/* Login button */}
          <button
            onClick={() => setShowLogin(true)}
            className={cn(
              "w-full h-14 rounded-2xl font-semibold text-base text-white",
              "gradient-blue shadow-lg shadow-blue-500/30",
              "flex items-center justify-center gap-2",
              "transition-all duration-200 active:scale-[0.98]"
            )}
          >
            <LogIn className="h-5 w-5" />
            Login Admin
          </button>
        </div>
      </div>

      <AdminLoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        title={`Login untuk akses ${pageName}`}
      />
    </>
  );
}
