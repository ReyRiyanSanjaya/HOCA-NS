"use client";

import React from "react";
import { BTSMap } from "@/components/map/bts-map";
import { GlobalFilter } from "@/components/dashboard/global-filter";
import { useFilterStore } from "@/stores/filter-store";

export default function MapPage() {
  const { filter } = useFilterStore();

  return (
    <div className="fixed inset-0 md:left-16 lg:left-56 flex flex-col">
      {/* Filter bar at top */}
      <div className="shrink-0 p-3 bg-background/95 backdrop-blur-sm border-b border-border">
        <GlobalFilter />
      </div>
      {/* Full screen map */}
      <div className="flex-1 min-h-0">
        <BTSMap filter={filter} />
      </div>
    </div>
  );
}
