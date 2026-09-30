'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Filter, RefreshCw, AlertCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { SystemLog } from '@/types';
import { formatToIST } from '@/lib/config';

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [inspectMetadata, setInspectMetadata] = useState<Record<string, unknown> | null>(null);

  const fetchLogs = async () => {
    try {
      let url = '/api/logs?limit=200';
      if (levelFilter !== 'all') url += `&level=${levelFilter}`;
      if (serviceFilter !== 'all') url += `&service=${serviceFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [levelFilter, serviceFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Structured System Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time observability stream capturing pipeline events, provider latencies, Claude generations, and error telemetry.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-slate-800 text-foreground transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-400">Level:</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900/60 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="error">Error Only</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Service:</span>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900/60 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Services</option>
            <option value="pipeline">pipeline</option>
            <option value="google_trends">google_trends</option>
            <option value="youtube">youtube</option>
            <option value="reddit">reddit</option>
            <option value="x">x</option>
            <option value="claude">claude</option>
            <option value="telegram">telegram</option>
            <option value="spike_detector">spike_detector</option>
            <option value="claim">claim</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Terminal className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <div className="font-semibold text-sm">No log entries matched your filter</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Timestamp (IST)</th>
                  <th className="py-2.5 px-4">Level</th>
                  <th className="py-2.5 px-4">Service</th>
                  <th className="py-2.5 px-4">Event</th>
                  <th className="py-2.5 px-4">Message</th>
                  <th className="py-2.5 px-4 text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">
                      {formatToIST(entry.created_at, 'dd/MM HH:mm:ss')}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        entry.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400'
                          : entry.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-sky-500/20 text-sky-400'
                      }`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-indigo-400 font-bold">
                      {entry.service}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-400">
                      {entry.event}
                    </td>
                    <td className="py-2.5 px-4 max-w-md text-foreground">
                      <div className="line-clamp-2">{entry.message}</div>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                        <button
                          onClick={() => setInspectMetadata(entry.metadata)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                        >
                          View JSON
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Metadata Inspector Modal */}
      {inspectMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Structured Log Metadata</h3>
              <button
                onClick={() => setInspectMetadata(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-xs overflow-x-auto max-h-80 font-mono">
              {JSON.stringify(inspectMetadata, null, 2)}
            </pre>
            <button
              onClick={() => setInspectMetadata(null)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
