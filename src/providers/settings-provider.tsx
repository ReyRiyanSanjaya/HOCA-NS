"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/config";
import { getLocalStorage, setLocalStorage } from "@/lib/utils";
import { STORAGE_KEYS } from "@/lib/config";

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = getLocalStorage<AppSettings>(
      STORAGE_KEYS.settings,
      DEFAULT_SETTINGS
    );
    setSettings({ ...DEFAULT_SETTINGS, ...saved });
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    setLocalStorage(STORAGE_KEYS.settings, next);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
