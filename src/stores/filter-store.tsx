"use client";

import React, { createContext, useContext, useState } from "react";
import type { GlobalFilter } from "@/types";

const initialFilter: GlobalFilter = {
  dateFrom: "",
  dateTo: "",
  supervisor: "",
  promotor: "",
  brand: "",
  kabupaten: "",
  cluster: "",
  pm: "",
  statusTower: "",
  keyword: "",
};

interface FilterContextType {
  filter: GlobalFilter;
  setFilter: (partial: Partial<GlobalFilter>) => void;
  resetFilter: () => void;
}

const FilterContext = createContext<FilterContextType>({
  filter: initialFilter,
  setFilter: () => {},
  resetFilter: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilterState] = useState<GlobalFilter>(initialFilter);

  const setFilter = (partial: Partial<GlobalFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  };

  const resetFilter = () => setFilterState(initialFilter);

  return (
    <FilterContext.Provider value={{ filter, setFilter, resetFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterStore() {
  return useContext(FilterContext);
}
