"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Map, BarChart3, PlusCircle,
  Table2, Image, Database, Settings,
  Sun, Moon, Monitor, Menu, X, Radio, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard, shortLabel: "Home" },
  { href: "/input",     label: "Input",     icon: PlusCircle,      shortLabel: "Input" },
  { href: "/map",       label: "Peta BTS",  icon: Map,             shortLabel: "Map" },
  { href: "/analytics", label: "Analitik",  icon: BarChart3,       shortLabel: "Chart" },
  { href: "/report",    label: "Laporan",   icon: Table2,          shortLabel: "Report" },
  { href: "/gallery",   label: "Galeri",    icon: Image,           shortLabel: "Galeri" },
  { href: "/master",    label: "Master",    icon: Database,        shortLabel: "Master" },
  { href: "/settings",  label: "Pengaturan",icon: Settings,        shortLabel: "Setting" },
];

// 4 items shown in bottom bar, rest in drawer
const BOTTOM_ITEMS = navItems.slice(0, 4);

export function Navbar() {
  const pathname   = usePathname();
  const { theme, setTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen sidebar flex-col z-40
        border-r border-border/60
        bg-card/95 backdrop-blur-xl
        shadow-[1px_0_20px_rgba(0,0,0,0.05)]
        dark:shadow-[1px_0_20px_rgba(0,0,0,0.3)]">

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-[1.125rem] border-b border-border/60 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl gradient-blue shadow-lg shadow-blue-500/30">
            <Radio className="h-[1.1rem] w-[1.1rem] text-white" />
          </div>
          <div className="hidden lg:flex flex-col min-w-0">
            <span className="text-sm font-bold leading-tight truncate">AXIS Seeding</span>
            <span className="text-[10px] text-muted-foreground">XL · Axis · Smartfren</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-200 relative",
                  active
                    ? "gradient-blue text-white shadow-md shadow-blue-500/25"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
                <span className="hidden lg:block truncate">{label}</span>
                {/* Active indicator pill on icon-only mode */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-300 lg:hidden" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme + version */}
        <div className="px-2 py-3 border-t border-border/60 space-y-1 shrink-0">
          <button
            onClick={cycleTheme}
            className="flex w-full items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm
              font-medium text-muted-foreground hover:bg-accent hover:text-foreground
              transition-all duration-200"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-[1.1rem] w-[1.1rem] shrink-0" />
            <span className="hidden lg:block">{themeLabel}</span>
          </button>
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1">
            <Zap className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/50">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40",
        "bg-card/90 backdrop-blur-2xl",
        "border-t border-border/60",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.08)]",
        "safe-bottom"
      )}>
        <div className="grid grid-cols-5 h-[3.75rem]">
          {BOTTOM_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5
                    rounded-b-full gradient-blue" />
                )}
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200",
                  active && "gradient-blue shadow-md shadow-blue-500/30 scale-110"
                )}>
                  <Icon className={cn(
                    "h-[1.1rem] w-[1.1rem] transition-colors",
                    active ? "text-white" : "text-muted-foreground"
                  )} />
                </div>
                <span className={cn(
                  "text-[9px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {shortLabel}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-xl">
              <Menu className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* ── MOBILE DRAWER ───────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

          {/* Panel */}
          <div
            className="absolute bottom-0 left-0 right-0 animate-slide-up rounded-t-3xl overflow-hidden
              bg-card/95 backdrop-blur-2xl border-t border-border/60
              shadow-[0_-8px_40px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-blue shadow-lg shadow-blue-500/30">
                  <Radio className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">AXIS Seeding</p>
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

            {/* Nav grid */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-2">
              {navItems.map(({ href, shortLabel, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-2xl",
                      "transition-all duration-200 active:scale-95",
                      active
                        ? "gradient-blue text-white shadow-md shadow-blue-500/25"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">{shortLabel}</span>
                  </Link>
                );
              })}
            </div>

            {/* Theme toggle */}
            <div className="px-4 pb-4 pt-2 border-t border-border/60 mt-2">
              <button
                onClick={() => { cycleTheme(); setDrawerOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl
                  bg-muted/50 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <ThemeIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Tema: {themeLabel}</span>
              </button>
            </div>

            {/* Safe area */}
            <div className="safe-bottom" />
          </div>
        </div>
      )}
    </>
  );
}
