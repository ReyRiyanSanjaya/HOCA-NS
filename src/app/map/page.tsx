"use client";

import React from "react";
import { BTSMap } from "@/components/map/bts-map";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { useFilterStore } from "@/stores/filter-store";

export default function MapPage() {
  const { filter } = useFilterStore();

  return (
    <div className={[
      "fixed flex flex-col",
      // Mobile: below top header, above bottom nav
      "top-14 left-0 right-0 bottom-16",
      // Desktop: right of sidebar, full height
      "md:top-0 md:left-14 lg:left-56 md:bottom-0",
    ].join(" ")}>
      {/* Filter bar */}
      <div className="shrink-0 px-3 pt-3 pb-2 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <GlobalFilter />
      </div>
      {/* Map */}
      <div className="flex-1 min-h-0">
        <BTSMap filter={filter} />
      </div>
    </div>
  );
}
