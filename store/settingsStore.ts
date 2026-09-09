'use client';

import { create } from 'zustand';

export interface SettingsState {
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  darkMode: boolean;
}

const SETTINGS_KEY = 'easeSettings';

const defaultSettings: SettingsState = {
  emailNotifications: true,
  lowStockAlerts: true,
  darkMode: false,
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function loadStoredSettings(): SettingsState {
  if (!isBrowser()) {
    return defaultSettings;
  }

  const stored = window.localStorage.getItem(SETTINGS_KEY);
  if (!stored) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<SettingsState>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: SettingsState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface SettingsStore {
  settings: SettingsState;
  loadSettings: () => void;
  toggleSetting: (key: keyof SettingsState) => void;
  setSettings: (settings: SettingsState) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  loadSettings: () => {
    const loadedSettings = loadStoredSettings();
    set({ settings: loadedSettings });
  },
  setSettings: (settings) => {
    saveSettings(settings);
    set({ settings });
  },
  toggleSetting: (key) =>
    set((state) => {
      const updated = { ...state.settings, [key]: !state.settings[key] } as SettingsState;
      saveSettings(updated);
      return { settings: updated };
    }),
}));
