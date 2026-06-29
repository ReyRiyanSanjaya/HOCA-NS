"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMasterBTS, fetchMasterPromotor, fetchMasterSPV } from "@/lib/api";
import { CACHE_KEYS, CACHE_TIMES } from "@/lib/config";

export function useMasterBTS() {
  return useQuery({
    queryKey: [CACHE_KEYS.masterBTS],
    queryFn: fetchMasterBTS,
    staleTime: CACHE_TIMES.masterData,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}

export function useMasterPromotor() {
  return useQuery({
    queryKey: [CACHE_KEYS.masterPromotor],
    queryFn: fetchMasterPromotor,
    staleTime: CACHE_TIMES.masterData,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}

export function useMasterSPV() {
  return useQuery({
    queryKey: [CACHE_KEYS.masterSPV],
    queryFn: fetchMasterSPV,
    staleTime: CACHE_TIMES.masterData,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}
