"use client";

import React from "react";
import { BTSMap } from "@/components/map/bts-map";
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
      {/* Map — filter is handled inside BTSMap itself */}
      <div className="flex-1 min-h-0">
        <BTSMap filter={filter} />
      </div>
    </div>
  );
}
