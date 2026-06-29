"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDashboard, fetchAnalytics, fetchTransactions, fetchGallery } from "@/lib/api";
import { CACHE_KEYS, CACHE_TIMES } from "@/lib/config";
import type { GlobalFilter } from "@/types";

export function useDashboard(filter?: Partial<GlobalFilter>) {
  return useQuery({
    queryKey: [CACHE_KEYS.dashboard, filter],
    queryFn: () => fetchDashboard(filter),
    staleTime: CACHE_TIMES.dashboard,
    refetchInterval: CACHE_TIMES.dashboard,
  });
}

export function useAnalytics(filter?: Partial<GlobalFilter>) {
  return useQuery({
    queryKey: [CACHE_KEYS.analytics, filter],
    queryFn: () => fetchAnalytics(filter),
    staleTime: CACHE_TIMES.analytics,
    refetchInterval: CACHE_TIMES.analytics,
  });
}

export function useTransactions(filter?: Partial<GlobalFilter>) {
  return useQuery({
    queryKey: [CACHE_KEYS.transactions, filter],
    queryFn: () => fetchTransactions(filter),
    staleTime: CACHE_TIMES.analytics,
  });
}

export function useGallery(filter?: Partial<GlobalFilter>) {
  return useQuery({
    queryKey: [CACHE_KEYS.gallery, filter],
    queryFn: () => fetchGallery(filter),
    staleTime: CACHE_TIMES.gallery,
  });
}
