'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flame,
  LayoutDashboard,
  Compass,
  Lightbulb,
  Calendar,
  Radio,
  Send,
  Terminal,
  Settings,
  KeyRound,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  Users,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import { formatToIST } from '@/lib/config';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: "Today's Topics", href: '/topics', icon: Compass },
  { name: 'Content Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Live & Spikes', href: '/live', icon: Radio },
  { name: 'Deliveries', href: '/deliveries', icon: Send },
  { name: 'System Logs', href: '/logs', icon: Terminal },
  { name: 'System Settings', href: '/settings', icon: Settings },
  { name: 'API Keys', href: '/settings/api-keys', icon: KeyRound },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, users, switchUser } = useUser();
  const { success, error, info } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [istTime, setIstTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isFreeMode, setIsFreeMode] = useState<boolean>(true);
  const [aiMode, setAiMode] = useState<'openrouter_connected' | 'openrouter_error' | 'development_active'>('development_active');
  const [aiModel, setAiModel] = useState<string>('openrouter/free');

  // Check system mode
  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (typeof data.isFreeMode === 'boolean') setIsFreeMode(data.isFreeMode);
          if (data.aiMode) setAiMode(data.aiMode);
          if (data.aiModel) setAiModel(data.aiModel);
        }
      })
      .catch(() => {});
  }, []);

  // Update IST clock every second
  useEffect(() => {
    const updateTime = () => setIstTime(formatToIST(new Date(), 'hh:mm:ss a'));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const handleGetUpdatesNow = async () => {
    if (isRefreshing || cooldownRemaining > 0) return;
    setIsRefreshing(true);
    info('Starting Live Scan', 'Querying Google Trends, YouTube, Reddit & X...');

    try {
      const res = await fetch('/api/pipeline/refresh', { method: 'POST' });
      const data = await res.json();

      if (res.status === 429) {
        setCooldownRemaining(data.remainingSeconds || 60);
        error('Cooldown Active', data.error);
        return;
      }

      if (data.success) {
        success('Update Complete', data.message);
        setCooldownRemaining(300); // 5 min cooldown
        // Trigger page re-validation/refresh
        window.dispatchEvent(new Event('trendpost-updated'));
      } else {
        error('Scan Incomplete', data.error || 'Check logs for details');
      }
    } catch (err) {
      error('Network Error', err instanceof Error ? err.message : 'Could not reach server');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-border bg-sidebar flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-extrabold text-xl">
              TrendPost
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              SaaS
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 mb-2">
            Main Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Active Persona Badge */}
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/40">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Active Persona (2-User Sync)</span>
          </div>
          <div className="flex gap-2">
            {users.map(u => {
              const isSelected = currentUser.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-semibold'
                      : 'border-border text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {u.name}
                  {u.role === 'admin' && ' (Admin)'}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-border text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Timezone / Live IST clock */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-border">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{istTime || 'Loading IST...'}</span>
            </div>
          </div>

          {/* Action Header Items */}
          <div className="flex items-center gap-3">
            {/* Get Updates Now Button */}
            <button
              onClick={handleGetUpdatesNow}
              disabled={isRefreshing || cooldownRemaining > 0}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all ${
                cooldownRemaining > 0
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : isRefreshing
                  ? 'bg-indigo-700 text-white cursor-wait animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing
                  ? 'Scanning Trends...'
                  : cooldownRemaining > 0
                  ? `Cooldown (${cooldownRemaining}s)`
                  : 'Get updates now'}
              </span>
            </button>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border bg-card text-slate-400 hover:text-slate-100 transition shadow-sm"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                {currentUser.name.charAt(currentUser.name.length - 1)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{currentUser.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* AI & System Mode Status Notice Banner */}
        <div className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs backdrop-blur-md border-b ${
          aiMode === 'openrouter_connected'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : aiMode === 'openrouter_error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-extrabold uppercase px-2 py-0.5 rounded-full text-[10px] tracking-wider border ${
              aiMode === 'openrouter_connected'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : aiMode === 'openrouter_error'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {aiMode === 'openrouter_connected'
                ? 'OPENROUTER AI — CONNECTED'
                : aiMode === 'openrouter_error'
                ? 'OPENROUTER — CONNECTION ERROR'
                : 'DEVELOPMENT AI — ACTIVE'}
            </span>
            <span className="text-[11px] text-slate-300">
              {aiMode === 'openrouter_connected'
                ? `Live generation powered by OpenRouter (${aiModel}). Free router quota active.`
                : aiMode === 'openrouter_error'
                ? 'OpenRouter key check failed. FALLBACK: DEVELOPMENT AI is generating test content.'
                : 'Zero API keys required. Development AI Generator is producing schema-validated content packages.'}
            </span>
          </div>
          <Link
            href="/settings/api-keys"
            className={`text-[11px] font-bold underline flex items-center gap-1 shrink-0 ${
              aiMode === 'openrouter_connected'
                ? 'text-emerald-400 hover:text-emerald-300'
                : aiMode === 'openrouter_error'
                ? 'text-rose-400 hover:text-rose-300'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <span>{aiMode === 'openrouter_connected' ? 'Configure Model / Key &rarr;' : 'Add OpenRouter Key &rarr;'}</span>
          </Link>
        </div>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
