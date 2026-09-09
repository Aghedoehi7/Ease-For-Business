'use client';

import { useState, useEffect } from 'react';
import { Settings2, Bell, AlertCircle, Moon, Sun, Save } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export default function SettingsPage() {
  const { settings, toggleSetting, loadSettings } = useSettingsStore((state) => ({
    settings: state.settings,
    toggleSetting: state.toggleSetting,
    loadSettings: state.loadSettings,
  }));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = (key: keyof typeof settings) => {
    setSaveStatus('saving');
    toggleSetting(key);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-lg p-8 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 text-orange-700 px-3 py-1 rounded-full font-semibold mb-3">
              <Settings2 size={20} />
              App settings
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
            <p className="text-gray-600 dark:text-slate-300 mt-2">Update your preferences for notifications, themes, and alerts.</p>
          </div>
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-emerald-950/20 text-green-700 px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
              <Save size={18} />
              Settings saved
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Notifications</h2>
                <p className="text-sm text-gray-600 dark:text-slate-300">Control how Ease communicates with you.</p>
              </div>
              <Bell className="text-orange-600" size={24} />
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`w-full text-left rounded-2xl px-5 py-4 border ${settings.emailNotifications ? 'border-orange-600 bg-white dark:bg-slate-900' : 'border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-950'} transition-colors`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Email notifications</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">Receive updates when stock is low and when new reports are ready.</p>
                </div>
                <span className="text-sm font-semibold text-orange-600">{settings.emailNotifications ? 'On' : 'Off'}</span>
              </div>
            </button>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Stock alerts</h2>
                <p className="text-sm text-gray-600 dark:text-slate-300">Get notified when a product falls below your low-stock threshold.</p>
              </div>
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <button
              onClick={() => handleToggle('lowStockAlerts')}
              className={`w-full text-left rounded-2xl px-5 py-4 border ${settings.lowStockAlerts ? 'border-orange-600 bg-white dark:bg-slate-900' : 'border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-950'} transition-colors`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Low stock alerts</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">Enable or disable notifications for products running low.</p>
                </div>
                <span className="text-sm font-semibold text-orange-600">{settings.lowStockAlerts ? 'On' : 'Off'}</span>
              </div>
            </button>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Theme</h2>
                <p className="text-sm text-gray-600 dark:text-slate-300">Switch between light and dark mode in the app.</p>
              </div>
              {settings.darkMode ? <Moon className="text-orange-600" size={24} /> : <Sun className="text-orange-600" size={24} />}
            </div>
            <button
              onClick={() => handleToggle('darkMode')}
              className={`w-full text-left rounded-2xl px-5 py-4 border ${settings.darkMode ? 'border-orange-600 bg-white dark:bg-slate-900' : 'border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-950'} transition-colors`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Dark mode</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">Toggle the visual theme for the dashboard experience.</p>
                </div>
                <span className="text-sm font-semibold text-orange-600">{settings.darkMode ? 'On' : 'Off'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
