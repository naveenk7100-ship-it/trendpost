'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Search,
  Filter,
  Flame,
  ArrowUpDown,
  ExternalLink,
  Sparkles,
  Info,
  Clock,
  Zap,
  ChevronRight
} from 'lucide-react';
import { NormalizedTopic, TrendSource } from '@/types';
import { formatToIST } from '@/lib/config';

export default function TopicsPage() {
  const [topics, setTopics] = useState<NormalizedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'virality' | 'velocity' | 'freshness' | 'instagram'>('virality');
  const [inspectTopic, setInspectTopic] = useState<NormalizedTopic | null>(null);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success && data.top10Topics) {
        setTopics(data.top10Topics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const filteredTopics = topics
    .filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesSource = selectedSource === 'all' ? true : t.source === selectedSource;
      return matchesSearch && matchesSource;
    })
    .sort((a, b) => {
      if (sortBy === 'velocity') return b.velocity - a.velocity;
      if (sortBy === 'freshness') return b.freshness_score - a.freshness_score;
      if (sortBy === 'instagram') return b.instagram_fit_score - a.instagram_fit_score;
      return b.virality_score - a.virality_score;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Today's Topics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Normalized across Google Trends India, YouTube, Reddit & X with transparent multi-factor scoring.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trending topics, keywords, categories..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Source Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'multi_source', label: 'Cross-Platform' },
            { id: 'google_trends', label: 'Google Trends' },
            { id: 'youtube', label: 'YouTube' },
            { id: 'reddit', label: 'Reddit' },
            { id: 'x', label: 'X (Twitter)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSource(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedSource === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-900/60 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="virality">Sort by Virality Score</option>
            <option value="velocity">Sort by Velocity</option>
            <option value="freshness">Sort by Freshness</option>
            <option value="instagram">Sort by Instagram Fit</option>
          </select>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {filteredTopics.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Compass className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
            <div className="font-semibold text-sm">No topics match your query</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Run the daily pipeline from the dashboard or clear search filters to view trending topics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-center">Virality Score</th>
                  <th className="py-3 px-4 text-center">Velocity</th>
                  <th className="py-3 px-4 text-center">Freshness</th>
                  <th className="py-3 px-4 text-center">Instagram Fit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTopics.map((topic) => (
                  <tr key={topic.external_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 max-w-sm">
                      <div className="font-semibold text-foreground line-clamp-1">{topic.title}</div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{topic.description}</div>
                      {topic.category && (
                        <span className="inline-block mt-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {topic.category}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
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
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setInspectTopic(topic)}
                        className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
                        title="Click to view transparent score breakdown"
                      >
                        <Flame className="w-3.5 h-3.5 fill-indigo-400" />
                        <span>{topic.virality_score}/100</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-slate-300 whitespace-nowrap">
                      +{topic.velocity.toLocaleString()}/hr
                    </td>
                    <td className="py-4 px-4 text-center text-xs whitespace-nowrap">
                      <span className="font-semibold text-slate-300">{topic.freshness_score}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </td>
                    <td className="py-4 px-4 text-center text-xs whitespace-nowrap">
                      <span className="font-semibold text-slate-300">{topic.instagram_fit_score}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {topic.url && (
                          <a
                            href={topic.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-border text-slate-400 hover:text-white transition"
                            title="View source"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          href="/ideas"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                        >
                          <span>Generate</span>
                          <Sparkles className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transparent Score Breakdown Modal */}
      {inspectTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  Transparent Score Breakdown
                </span>
                <h3 className="text-base font-bold text-foreground line-clamp-2 mt-0.5">
                  {inspectTopic.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectTopic(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Trend Velocity (25%)</span>
                  <span className="font-bold">{inspectTopic.velocity_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${inspectTopic.velocity_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Freshness Decay (20%)</span>
                  <span className="font-bold">{inspectTopic.freshness_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inspectTopic.freshness_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Instagram / Visual Fit (20%)</span>
                  <span className="font-bold">{inspectTopic.instagram_fit_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${inspectTopic.instagram_fit_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Volume Reach (20%)</span>
                  <span className="font-bold">{inspectTopic.volume_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${inspectTopic.volume_score}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Cross-Platform Presence (15%)</span>
                  <span className="font-bold">{inspectTopic.cross_platform_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${inspectTopic.cross_platform_score}%` }}></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Composite Virality Score:</span>
              <div className="text-base font-extrabold text-indigo-400">
                {inspectTopic.virality_score} / 100
              </div>
            </div>

            <button
              onClick={() => setInspectTopic(null)}
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
