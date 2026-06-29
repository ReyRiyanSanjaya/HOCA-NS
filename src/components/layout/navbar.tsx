"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Map, BarChart3, PlusCircle,
  Table2, Image, Database, Settings,
  Sun, Moon, Monitor, X, Radio, Zap,
  ShieldCheck, LogOut, LogIn, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { AdminLoginModal } from "@/components/auth/admin-login-modal";
import { toast } from "sonner";

// ── All nav items ──────────────────────────────────────────────────────────
const navItems = [
  { href: "/",                label: "Dashboard",      icon: LayoutDashboard, shortLabel: "Home",     adminOnly: false },
  { href: "/input",           label: "Input",          icon: PlusCircle,      shortLabel: "Input",    adminOnly: false },
  { href: "/map",             label: "Peta BTS",       icon: Map,             shortLabel: "Map",      adminOnly: false },
  { href: "/analytics",       label: "Analitik",       icon: BarChart3,       shortLabel: "Analitik", adminOnly: false },
  { href: "/tower-analysis",  label: "Target Tower",   icon: Target,          shortLabel: "Target",   adminOnly: false },
  { href: "/report",          label: "Laporan",        icon: Table2,          shortLabel: "Laporan",  adminOnly: false },
  { href: "/gallery",         label: "Galeri",         icon: Image,           shortLabel: "Galeri",   adminOnly: false },
  { href: "/master",          label: "Master",         icon: Database,        shortLabel: "Master",   adminOnly: true  },
  { href: "/settings",        label: "Pengaturan",     icon: Settings,        shortLabel: "Setting",  adminOnly: true  },
];

// Mobile bottom bar shows first 5 public items
const BOTTOM_ITEMS = navItems.filter((n) => !n.adminOnly).slice(0, 5);

export function Navbar() {
  const pathname   = usePathname();
  const { theme, setTheme } = useTheme();
  const { isAdmin, admin, logout } = useAuth();
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [loginOpen,   setLoginOpen]   = useState(false);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon  = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    toast.success("Berhasil logout");
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════════ */}
      <aside className={cn(
        "hidden md:flex fixed left-0 top-0 h-screen flex-col z-40",
        "w-14 lg:w-56",
        "bg-card/95 backdrop-blur-xl",
        "border-r border-border/60",
        "shadow-[1px_0_20px_rgba(0,0,0,0.05)] dark:shadow-[1px_0_20px_rgba(0,0,0,0.3)]",
        "transition-all duration-300"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border/60 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gradient-blue shadow-lg shadow-blue-500/30">
            <Radio className="h-[1.1rem] w-[1.1rem] text-white" />
          </div>
          <div className="hidden lg:flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold leading-tight truncate">HCA NS Seeding</span>
            <span className="text-[10px] text-muted-foreground">XL · Axis · Smartfren</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {/* Section: Public */}
          <div className="hidden lg:block px-2 py-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Menu</span>
          </div>
          {navItems.filter((n) => !n.adminOnly).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} title={label} className={cn(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-200 relative group",
                active
                  ? "gradient-blue text-white shadow-md shadow-blue-500/25"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}>
                <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
                <span className="hidden lg:block truncate">{label}</span>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-300 lg:hidden" />}
              </Link>
            );
          })}

          {/* Section: Admin */}
          <div className="pt-2">
            <div className="hidden lg:flex items-center gap-2 px-2 py-1">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" />Admin
              </span>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            {!isAdmin && <div className="mx-2 my-1 h-px bg-border/60 lg:hidden" />}
            {navItems.filter((n) => n.adminOnly).map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} title={label} className={cn(
                  "flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 relative group",
                  active
                    ? "gradient-blue text-white shadow-md shadow-blue-500/25"
                    : isAdmin
                    ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                    : "text-muted-foreground/40 cursor-default pointer-events-none"
                )}>
                  <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
                  <span className="hidden lg:block truncate">{label}</span>
                  {!isAdmin && <span className="hidden lg:block ml-auto text-[9px] bg-muted rounded px-1 py-0.5">Admin</span>}
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-300 lg:hidden" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom: admin/login + theme */}
        <div className="px-2 py-3 border-t border-border/60 space-y-1 shrink-0">
          {isAdmin ? (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium text-primary truncate flex-1">{admin?.displayName}</span>
              <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Logout">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="hidden lg:flex w-full items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm
                font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              <LogIn className="h-[1.1rem] w-[1.1rem] shrink-0" />
              <span>Login Admin</span>
            </button>
          )}

          <button
            onClick={cycleTheme}
            className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm
              font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
            <ThemeIcon className="h-[1.1rem] w-[1.1rem] shrink-0" />
            <span className="hidden lg:block">{themeLabel}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1">
            <Zap className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/40">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MOBILE — TOP HEADER BAR
      ══════════════════════════════════════════════════════ */}
      <header className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-40 h-14",
        "bg-card/95 backdrop-blur-xl",
        "border-b border-border/60",
        "flex items-center justify-between px-4",
        "shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl gradient-blue flex items-center justify-center shadow-md shadow-blue-500/30">
            <Radio className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">HCA NS Seeding</p>
          </div>
        </div>

        {/* Right: admin badge + menu */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Admin</span>
            </div>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted active:scale-95 transition-all"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="0" y1="1" x2="18" y2="1"/>
              <line x1="0" y1="7" x2="14" y2="7"/>
              <line x1="0" y1="13" x2="10" y2="13"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MOBILE — BOTTOM NAV (4 primary items)
      ══════════════════════════════════════════════════════ */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-card/95 backdrop-blur-2xl",
        "border-t border-border/60",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.08)]",
        "safe-bottom"
      )}>
        <div className="grid grid-cols-5 h-16">
          {BOTTOM_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex flex-col items-center justify-center gap-0.5 relative">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full gradient-blue" />
                )}
                <div className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-2xl transition-all duration-200",
                  active && "gradient-blue shadow-lg shadow-blue-500/30 scale-110"
                )}>
                  <Icon className={cn("h-5 w-5", active ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          MOBILE — FULL DRAWER (slide from right)
      ══════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />

          {/* Panel */}
          <div
            className={cn(
              "absolute top-0 right-0 bottom-0 w-[78vw] max-w-xs",
              "bg-card/97 backdrop-blur-2xl",
              "border-l border-border/60",
              "shadow-[-8px_0_40px_rgba(0,0,0,0.2)]",
              "flex flex-col animate-slide-right"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl gradient-blue flex items-center justify-center">
                  <Radio className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">HCA NS Seeding</p>
                  <p className="text-[10px] text-muted-foreground">XL · Axis · Smartfren</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {/* Public items */}
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Menu</p>
              {navItems.filter((n) => !n.adminOnly).map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium",
                      "transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "gradient-blue text-white shadow-md shadow-blue-500/20"
                        : "text-foreground hover:bg-muted/70"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}

              {/* Admin items */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" />Admin
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              {navItems.filter((n) => n.adminOnly).map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                const disabled = !isAdmin;
                return (
                  <Link
                    key={href}
                    href={disabled ? "#" : href}
                    onClick={(e) => {
                      if (disabled) { e.preventDefault(); setLoginOpen(true); setDrawerOpen(false); return; }
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium",
                      "transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "gradient-blue text-white shadow-md shadow-blue-500/20"
                        : disabled
                        ? "text-muted-foreground/50 bg-muted/30"
                        : "text-foreground hover:bg-muted/70"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {disabled && (
                      <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                        Login
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Drawer footer */}
            <div className="shrink-0 border-t border-border/60 p-3 space-y-2">
              {/* Admin status */}
              {isAdmin ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-primary/5 border border-primary/15">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{admin?.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">Administrator</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium
                      text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors shrink-0"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setLoginOpen(true); setDrawerOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium
                    bg-primary/5 border border-primary/15 text-primary hover:bg-primary/10 transition-all active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  Login sebagai Admin
                </button>
              )}

              {/* Theme */}
              <button
                onClick={() => { cycleTheme(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium
                  bg-muted/50 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tema: {themeLabel}</span>
              </button>

              <div className="safe-bottom" />
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Login Modal ──────────────────────────────── */}
      <AdminLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="Login Admin"
      />
    </>
  );
}
