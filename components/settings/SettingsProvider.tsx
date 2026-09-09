'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, loadSettings } = useSettingsStore((state) => ({
    settings: state.settings,
    loadSettings: state.loadSettings,
  }));

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  return <>{children}</>;
}
