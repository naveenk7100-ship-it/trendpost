'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Send,
  CheckCircle,
  Clock,
  Zap,
  Radio,
  ArrowUpRight,
  Flame,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Lock
} from 'lucide-react';
import { NormalizedTopic, ContentIdea, SpikeEvent, Delivery } from '@/types';
import { formatToIST } from '@/lib/config';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/UserContext';

export default function OverviewPage() {
  const { success, error, info } = useToast();
  const { currentUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTopics: 0,
    top10Count: 0,
    totalIdeas: 0,
    pendingApprovals: 0,
    approvedIdeas: 0,
    claimedIdeas: 0,
    totalDeliveries: 0,
    totalSpikes: 0,
  });
  const [top10Topics, setTop10Topics] = useState<NormalizedTopic[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<ContentIdea[]>([]);
  const [recentSpikes, setRecentSpikes] = useState<SpikeEvent[]>([]);
  const [top5Delivered, setTop5Delivered] = useState<Delivery[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [deliveryRunning, setDeliveryRunning] = useState(false);
  const [spikeScanRunning, setSpikeScanRunning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setTop10Topics(data.top10Topics || []);
        setRecentIdeas(data.recentIdeas || []);
        setRecentSpikes(data.recentSpikes || []);
        setTop5Delivered(data.top5Delivered || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('trendpost-updated', handleUpdate);
    return () => window.removeEventListener('trendpost-updated', handleUpdate);
  }, []);

  const handleRunDailyPipeline = async () => {
    setPipelineRunning(true);
    info('Pipeline Triggered', 'Executing 07:00 AM IST Daily Pipeline: Fetching trends & calling OpenRouter AI...');
    try {
      const res = await fetch('/api/pipeline/daily', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Pipeline Completed', `Discovered ${data.data.topicsFound} topics, ranked Top 10, generated content.`);
        fetchDashboardData();
      } else {
        error('Pipeline Failed', data.error);
      }
    } catch (err) {
      error('Error', 'Failed to execute daily pipeline');
    } finally {
      setPipelineRunning(false);
    }
  };

  const handleRunDelivery = async () => {
    setDeliveryRunning(true);
    info('Telegram Dispatch', 'Triggering 07:30 AM IST Delivery of Top 5 ideas with inline buttons...');
    try {
      const res = await fetch('/api/pipeline/deliver', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Delivered to Telegram', `Dispatched ${data.data.totalDelivered} messages to Person A & Person B.`);
        fetchDashboardData();
      } else {
        error('Delivery Failed', data.message || data.error);
      }
    } catch {
      error('Error', 'Failed to execute Telegram delivery');
    } finally {
      setDeliveryRunning(false);
    }
  };

  const handleRunSpikeScan = async () => {
    setSpikeScanRunning(true);
    info('Spike Detection', 'Comparing fresh trends to detect 2-hour velocity spikes...');
    try {
      const res = await fetch('/api/pipeline/detect-spikes', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Spike Scan Finished', `Found ${data.spikesDetected} spikes. Alerts sent: ${data.alertsDispatched}`);
        fetchDashboardData();
      } else {
        error('Spike Scan Failed', data.error);
      }
    } catch {
      error('Error', 'Failed to execute spike scan');
    } finally {
      setSpikeScanRunning(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Trend & Content Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated pipeline fetching Google Trends India, YouTube, Reddit & X at 07:00 IST.
          </p>
        </div>

        {/* Quick Simulation Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunDailyPipeline}
            disabled={pipelineRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            <Zap className={`w-3.5 h-3.5 ${pipelineRunning ? 'animate-spin' : ''}`} />
            <span>{pipelineRunning ? 'Running 07:00 Pipeline...' : 'Run 07:00 Pipeline'}</span>
          </button>

          <button
            onClick={handleRunDelivery}
            disabled={deliveryRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            <Send className={`w-3.5 h-3.5 ${deliveryRunning ? 'animate-spin' : ''}`} />
            <span>{deliveryRunning ? 'Delivering...' : 'Run 07:30 Telegram Delivery'}</span>
          </button>

          <button
            onClick={handleRunSpikeScan}
            disabled={spikeScanRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            <Radio className={`w-3.5 h-3.5 ${spikeScanRunning ? 'animate-spin' : ''}`} />
            <span>{spikeScanRunning ? 'Scanning...' : 'Run 2h Spike Scan'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Today's Top 10</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.top10Count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ranked by virality</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Telegram Sent</span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.totalDeliveries}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Top 5 dispatched</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.pendingApprovals}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting review</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Approved</span>
            <CheckCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.approvedIdeas}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready to publish</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Claims</span>
            <Lock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.claimedIdeas}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Locked exclusively</div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Spike Alerts</span>
            <Radio className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{stats.totalSpikes}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">2-hr velocity spikes</div>
        </div>
      </div>

      {/* Active Spike Alerts Banner if any */}
      {recentSpikes.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-card border border-rose-800/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Live Breakout Spikes (2-Hour Window)
              </span>
            </div>
            <Link href="/live" className="text-xs text-rose-300 hover:text-white flex items-center gap-1">
              <span>View All Spikes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentSpikes.slice(0, 2).map(spike => (
              <div key={spike.id} className="p-3.5 rounded-xl bg-card/60 border border-border text-sm flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground line-clamp-1">{spike.topic?.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{spike.raw_context.spike_reason}</div>
                  <div className="text-[11px] text-indigo-400 mt-1">
                    Angle: <span className="uppercase font-semibold">{spike.raw_context.suggested_angle}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    +{spike.score_change} pts
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{formatToIST(spike.detected_at, 'hh:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Sections: Top 10 Topics & Recent Ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Top 10 Table (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Today's Ranked Top 10</h2>
              <p className="text-xs text-slate-400">Multi-source deduplicated topics scored for Instagram fit</p>
            </div>
            <Link
              href="/topics"
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <span>Explore all</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {top10Topics.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Flame className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
                <div className="font-medium text-sm">No topics recorded yet today</div>
                <p className="text-xs max-w-sm mx-auto">
                  Click "Run 07:00 Pipeline" above or "Get updates now" to trigger live trend extraction from Google Trends, YouTube, Reddit & X.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-border">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Topic</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-center">Virality</th>
                      <th className="py-3 px-4 text-center">Velocity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {top10Topics.slice(0, 10).map((topic, idx) => (
                      <tr key={topic.external_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold line-clamp-1 text-foreground">{topic.title}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{topic.description}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            topic.source === 'multi_source'
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                              : topic.source === 'google_trends'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : topic.source === 'youtube'
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : topic.source === 'reddit'
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                          }`}>
                            {topic.source === 'multi_source' ? `Cross-Platform (${topic.sources_matched?.length || 2})` : topic.source.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Flame className="w-3 h-3 fill-indigo-400" />
                            <span>{topic.virality_score}/100</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-mono text-slate-400 whitespace-nowrap">
                          +{topic.velocity.toLocaleString()}/hr
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            href="/ideas"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                          >
                            <span>Ideas</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Telegram Top 5 Delivery & Recent AI Ideas (Right Column) */}
        <div className="space-y-6">
          {/* Top 5 Delivered Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Top 5 Telegram Dispatch</h2>
              <Link href="/deliveries" className="text-xs text-indigo-400 hover:text-indigo-300">View logs</Link>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              {top5Delivered.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <Send className="w-6 h-6 mx-auto mb-2 text-slate-500 opacity-40" />
                  No messages dispatched yet today. Click "Run 07:30 Telegram Delivery" to test dispatch.
                </div>
              ) : (
                top5Delivered.map((del, i) => (
                  <div key={del.id || i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground line-clamp-1">{del.idea?.topic?.title || 'Daily Dispatch Topic'}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        SENT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">To: {del.user?.name || 'Person A'}</div>
                    <div className="text-[10px] text-slate-500">{formatToIST(del.delivered_at, 'hh:mm a')}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Persona Sync Status Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/30 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Two-User Atomic Claim Active</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Logged in as <strong className="text-foreground">{currentUser.name}</strong>. If you claim an idea, Person B will immediately see it locked with database constraints preventing concurrent claims.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
