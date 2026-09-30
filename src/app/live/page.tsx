'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  RefreshCw,
  Flame,
  ArrowUpRight,
  Clock,
  Send,
  AlertTriangle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { SpikeEvent, TrendRun } from '@/types';
import { formatToIST } from '@/lib/config';
import { useToast } from '@/context/ToastContext';

export default function LivePage() {
  const { success, error, info } = useToast();
  const [spikes, setSpikes] = useState<SpikeEvent[]>([]);
  const [runs, setRuns] = useState<TrendRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setSpikes(data.recentSpikes || []);
        setRuns(data.recentRuns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSpikeScan = async () => {
    setIsScanning(true);
    info('Scan Initiated', 'Checking for 2-hour trend velocity breakout events...');
    try {
      const res = await fetch('/api/pipeline/detect-spikes', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Spike Scan Completed', `Discovered ${data.spikesDetected} breakout spikes. Dispatched ${data.alertsDispatched} Telegram alerts.`);
        fetchData();
      } else {
        error('Scan Error', data.error);
      }
    } catch {
      error('Scan Failed', 'Could not complete spike scan');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Live Intelligence & Spike Radar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of multi-source extraction runs and automated 2-hour velocity spike alerts.
          </p>
        </div>

        <button
          onClick={handleTriggerSpikeScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition disabled:opacity-50"
        >
          <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-ping' : ''}`} />
          <span>{isScanning ? 'Scanning Velocity Breaks...' : 'Run 2h Spike Scan Now'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spike Events Feed */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <h2 className="text-base font-bold">Detected Trend Spikes (2-Hour Breakouts)</h2>
          </div>

          <div className="space-y-3">
            {spikes.length === 0 ? (
              <div className="p-12 text-center text-slate-500 border border-dashed border-border rounded-2xl bg-card">
                <Radio className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <div className="font-semibold text-sm">No spikes detected in current window</div>
                <p className="text-xs text-slate-500 mt-1">
                  Thresholds configured: +20 pts score jump or rapid velocity surge.
                </p>
              </div>
            ) : (
              spikes.map((spike) => (
                <div key={spike.id} className="p-4 rounded-2xl bg-card border border-rose-800/30 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {spike.severity} Severity
                      </span>
                      <h3 className="font-bold text-sm text-foreground mt-1">{spike.topic?.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        +{spike.score_change} pts
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{formatToIST(spike.detected_at, 'hh:mm a')}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{spike.raw_context.spike_reason}</p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border">
                    <span className="text-slate-400">
                      Score: <strong>{spike.previous_score}</strong> → <strong className="text-rose-400">{spike.current_score}/100</strong>
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      Angle: {spike.raw_context.suggested_angle?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trend Extraction Pipeline Runs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold">Trend Pipeline Execution Log</h2>
          </div>

          <div className="space-y-3">
            {runs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 border border-dashed border-border rounded-2xl bg-card">
                <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <div className="font-semibold text-sm">No pipeline runs recorded yet</div>
              </div>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-indigo-400">
                      {run.type.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      run.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : run.status === 'running'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {run.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Started: {formatToIST(run.started_at)}</span>
                    <span>Found: <strong>{run.topics_found}</strong> topics</span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-border">
                    <span>Providers:</span>
                    <div className="flex gap-1">
                      {run.providers_succeeded?.map((p, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
