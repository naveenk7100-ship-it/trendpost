'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Save,
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  Cpu
} from 'lucide-react';
import { ApiKeySetting } from '@/types';
import { formatToIST } from '@/lib/config';
import { useToast } from '@/context/ToastContext';

interface ProviderCardProps {
  id: ApiKeySetting['provider'];
  name: string;
  description: string;
  docUrl?: string;
  setting?: ApiKeySetting;
  placeholder: string;
  modelField?: {
    value: string;
    label: string;
    placeholder: string;
    onSaveModel: (newModel: string) => Promise<void>;
  };
  onSave: (provider: ApiKeySetting['provider'], key: string) => Promise<void>;
  onTest: (provider: ApiKeySetting['provider'], key?: string) => Promise<void>;
  isTesting: boolean;
  badge?: string;
}

function ProviderCard({
  id,
  name,
  description,
  docUrl,
  setting,
  placeholder,
  modelField,
  onSave,
  onTest,
  isTesting,
  badge,
}: ProviderCardProps) {
  const [inputKey, setInputKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modelValue, setModelValue] = useState(modelField?.value || '');

  useEffect(() => {
    if (modelField?.value) {
      setModelValue(modelField.value);
    }
  }, [modelField?.value]);

  const isConfigured = Boolean(setting?.masked_key);

  const handleSaveClick = async () => {
    if (!inputKey.trim()) return;
    setIsSaving(true);
    await onSave(id, inputKey.trim());
    setInputKey('');
    setIsEditing(false);
    setIsSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>{name}</span>
              {badge && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {badge}
                </span>
              )}
            </h3>
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-400"
                title="API Documentation"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {isConfigured ? (
            <>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Configured</span>
              </span>
              {setting?.status === 'active' ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  CONNECTED
                </span>
              ) : setting?.status === 'failed' ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300">
                  TEST FAILED
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                  UNTESTED
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-border flex items-center gap-1">
              <XCircle className="w-3 h-3 text-slate-400" />
              <span>Not Configured</span>
            </span>
          )}
        </div>
      </div>

      {/* Model Configuration Field if applicable */}
      {modelField && (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-border rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>{modelField.label}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Default: openrouter/free</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={modelValue}
              onChange={(e) => setModelValue(e.target.value)}
              placeholder={modelField.placeholder}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <button
              onClick={() => modelField.onSaveModel(modelValue)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              Update Model
            </button>
          </div>
        </div>
      )}

      {/* Key Input / Masked Display */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
          <span>API Key Token</span>
        </label>

        {isEditing || !isConfigured ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveClick}
                disabled={isSaving || !inputKey.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Key'}</span>
              </button>
              {isConfigured && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setInputKey('');
                  }}
                  className="px-3 py-2 rounded-xl border border-border text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
            <span className="font-mono text-xs text-slate-300">
              {setting?.masked_key || 'No key set'}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {isConfigured ? 'Update Key' : 'Configure Key'}
            </button>
          </div>
        )}
      </div>

      {/* Footer: Last Tested & Test Connection Button */}
      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
        <span className="text-slate-500 text-[11px]">
          {setting?.last_tested_at
            ? `Last tested: ${formatToIST(setting.last_tested_at)}`
            : 'Not yet verified'}
        </span>

        <button
          onClick={() => onTest(id)}
          disabled={isTesting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition disabled:opacity-50"
        >
          <Play className={`w-3 h-3 text-emerald-400 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { success, error, info } = useToast();
  const [keys, setKeys] = useState<ApiKeySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      const data = await res.json();
      if (data.success && data.data) {
        setKeys(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleSaveKey = async (provider: ApiKeySetting['provider'], key: string) => {
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });
      const data = await res.json();
      if (data.success) {
        success('Key Saved', `Updated configuration for ${provider}`);
        fetchKeys();
      } else {
        error('Save Failed', data.message);
      }
    } catch {
      error('Error', 'Failed to update key');
    }
  };

  const handleSaveModel = async (model: string) => {
    try {
      const openRouterSetting = getKeySetting('openrouter');
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openrouter',
          key: '', // keeps existing masked key
          metadata: { model: model.trim() || 'openrouter/free' },
        }),
      });
      const data = await res.json();
      if (data.success) {
        success('Model Updated', `OpenRouter model set to ${model}`);
        fetchKeys();
      } else {
        error('Update Failed', data.message);
      }
    } catch {
      error('Error', 'Failed to update OpenRouter model');
    }
  };

  const handleTestKey = async (provider: ApiKeySetting['provider']) => {
    setTestingProvider(provider);
    info('Testing Connection', `Verifying credentials with ${provider}...`);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: (getKeySetting('openrouter')?.metadata?.model as string) || 'openrouter/free',
        }),
      });
      const data = await res.json();
      if (data.success) {
        success('Connection Verified', data.message);
      } else {
        error('Connection Failed', data.message);
      }
      fetchKeys();
    } catch {
      error('Test Failed', 'Could not reach server endpoint');
    } finally {
      setTestingProvider(null);
    }
  };

  const getKeySetting = (p: ApiKeySetting['provider']) => keys.find(k => k.provider === p);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/settings" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">API Keys & Provider Health</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Secure vault for AI generation, trend data feeds, and Telegram bot communication.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Secrets Exposed to Browser</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* OpenRouter - Primary AI Engine */}
        <ProviderCard
          id="openrouter"
          name="OpenRouter (Free AI Router)"
          badge="DEFAULT AI"
          description="Primary production AI engine powering original Reel scripts, captions, carousel outlines, and 15 hashtags. Supports zero-cost models via openrouter/free."
          docUrl="https://openrouter.ai/keys"
          setting={getKeySetting('openrouter')}
          placeholder="sk-or-v1-..."
          modelField={{
            value: (getKeySetting('openrouter')?.metadata?.model as string) || 'openrouter/free',
            label: 'Configured OpenRouter Model',
            placeholder: 'openrouter/free',
            onSaveModel: handleSaveModel,
          }}
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'openrouter'}
        />

        {/* Telegram Bot */}
        <ProviderCard
          id="telegram"
          name="Telegram Bot API"
          description="Delivers daily top 5 ideas with inline Approve, Reject, and Claim buttons."
          docUrl="https://core.telegram.org/bots#how-do-i-create-a-bot"
          setting={getKeySetting('telegram')}
          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'telegram'}
        />

        {/* Google Trends */}
        <ProviderCard
          id="google_trends"
          name="Google Trends (India RSS)"
          description="Public official Daily RSS endpoint for India (geo=IN). Zero API key needed."
          setting={getKeySetting('google_trends')}
          placeholder="Public feed geo=IN"
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'google_trends'}
        />

        {/* Claude (Optional / Secondary AI) */}
        <ProviderCard
          id="claude"
          name="Claude AI (Anthropic - Secondary)"
          description="Alternative AI engine. If configured, serves as secondary fallback after OpenRouter."
          docUrl="https://console.anthropic.com/settings/keys"
          setting={getKeySetting('claude')}
          placeholder="sk-ant-api03-..."
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'claude'}
        />

        {/* YouTube */}
        <ProviderCard
          id="youtube"
          name="YouTube Data API v3"
          description="Queries India popular charts to extract trending videos, velocity, and view counts."
          docUrl="https://console.cloud.google.com/apis/credentials"
          setting={getKeySetting('youtube')}
          placeholder="AIzaSy..."
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'youtube'}
        />

        {/* Reddit */}
        <ProviderCard
          id="reddit"
          name="Reddit API (r/all & r/india)"
          description="Fetches hot community threads and discussion velocity."
          docUrl="https://www.reddit.com/prefs/apps"
          setting={getKeySetting('reddit')}
          placeholder="Reddit Client ID or custom User-Agent"
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'reddit'}
        />

        {/* X (Twitter) */}
        <ProviderCard
          id="x"
          name="X (Twitter API v2)"
          description="Queries recent tweets and velocity surges across India."
          docUrl="https://developer.x.com/en/portal/dashboard"
          setting={getKeySetting('x')}
          placeholder="AAAAAAAAAAAAAAAAAAAAA..."
          onSave={handleSaveKey}
          onTest={handleTestKey}
          isTesting={testingProvider === 'x'}
        />
      </div>
    </div>
  );
}
