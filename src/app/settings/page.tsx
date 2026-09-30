'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, Save, Clock, Radio, Zap, Shield, KeyRound, CheckCircle2 } from 'lucide-react';
import { SystemSettings } from '@/types';
import { useToast } from '@/context/ToastContext';

export default function SystemSettingsPage() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    timezone: 'Asia/Kolkata',
    trend_scan_time: '07:00',
    telegram_delivery_time: '07:30',
    spike_detection_interval_hours: 2,
    spike_score_change_threshold: 20,
    spike_velocity_threshold: 40,
    minimum_significance: 60,
    ai_model: 'openrouter/free',
    daily_generation_limit: 10,
    refresh_cooldown_seconds: 300,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/system')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(data.data);
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        success('Settings Saved', 'System scheduling and thresholds updated successfully.');
      } else {
        error('Save Failed', data.error);
      }
    } catch {
      error('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Settings & Cron Schedules</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure pipeline schedules, spike detection sensitivity, and operational parameters.
          </p>
        </div>

        <Link
          href="/settings/api-keys"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition self-start sm:self-auto"
        >
          <KeyRound className="w-4 h-4" />
          <span>Manage API Keys</span>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Timing & Schedules Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base">Automated Schedules & Timezone</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Operational Timezone
              </label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border text-xs text-foreground cursor-not-allowed font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard IST (Asia/Kolkata, UTC+05:30).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Daily Trend Scan Time (IST)
              </label>
              <input
                type="text"
                value={settings.trend_scan_time}
                onChange={(e) => setSettings({ ...settings, trend_scan_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 07:00 AM IST</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Telegram Top 5 Dispatch Time (IST)
              </label>
              <input
                type="text"
                value={settings.telegram_delivery_time}
                onChange={(e) => setSettings({ ...settings, telegram_delivery_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 07:30 AM IST</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                "Get Updates Now" Cooldown (Seconds)
              </label>
              <input
                type="number"
                value={settings.refresh_cooldown_seconds}
                onChange={(e) => setSettings({ ...settings, refresh_cooldown_seconds: parseInt(e.target.value, 10) || 300 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: 300s (5 minutes)</span>
            </div>
          </div>
        </div>

        {/* Spike Detection Thresholds Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Radio className="w-5 h-5 text-rose-400" />
            <h2 className="font-bold text-base">Two-Hour Spike Detection Parameters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Scan Interval (Hours)
              </label>
              <input
                type="number"
                value={settings.spike_detection_interval_hours}
                onChange={(e) => setSettings({ ...settings, spike_detection_interval_hours: parseInt(e.target.value, 10) || 2 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Every 2 hours</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Score Surge Threshold (+Pts)
              </label>
              <input
                type="number"
                value={settings.spike_score_change_threshold}
                onChange={(e) => setSettings({ ...settings, spike_score_change_threshold: parseInt(e.target.value, 10) || 20 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Trigger alert if +20 pts</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Minimum Significance (0-100)
              </label>
              <input
                type="number"
                value={settings.minimum_significance}
                onChange={(e) => setSettings({ ...settings, minimum_significance: parseInt(e.target.value, 10) || 60 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Ignore low-volume noise</span>
            </div>
          </div>
        </div>

        {/* AI Model Configuration Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base">AI Model & Generation Quota</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                OpenRouter Model Engine
              </label>
              <select
                value={settings.ai_model}
                onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="openrouter/free">openrouter/free (Recommended Free Router)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free</option>
                <option value="google/gemini-2.0-flash-exp:free">google/gemini-2.0-flash-exp:free</option>
                <option value="mistralai/mistral-7b-instruct:free">mistralai/mistral-7b-instruct:free</option>
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet (via OpenRouter)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Daily Top Topics Generation Limit
              </label>
              <input
                type="number"
                value={settings.daily_generation_limit}
                onChange={(e) => setSettings({ ...settings, daily_generation_limit: parseInt(e.target.value, 10) || 10 })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-foreground focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Top 10 ranked topics</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
