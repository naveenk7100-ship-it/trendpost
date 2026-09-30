'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  Flame,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Lock
} from 'lucide-react';
import { ContentIdea } from '@/types';
import { formatToIST } from '@/lib/config';

export default function CalendarPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.recentIdeas) {
          setIdeas(data.recentIdeas);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Group ideas into Morning, Afternoon, Evening, Night slots
  const morningSlots = ideas.filter(i => {
    const hours = new Date(i.recommended_post_time).getHours();
    return hours >= 6 && hours < 12;
  });

  const afternoonSlots = ideas.filter(i => {
    const hours = new Date(i.recommended_post_time).getHours();
    return hours >= 12 && hours < 17;
  });

  const eveningSlots = ideas.filter(i => {
    const hours = new Date(i.recommended_post_time).getHours();
    return hours >= 17 && hours < 21;
  });

  const nightSlots = ideas.filter(i => {
    const hours = new Date(i.recommended_post_time).getHours();
    return hours >= 21 || hours < 6;
  });

  const renderSlotCard = (idea: ContentIdea) => (
    <div key={idea.id} className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-2 hover:border-indigo-500/40 transition">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-indigo-400">
          {formatToIST(idea.recommended_post_time, 'hh:mm a')}
        </span>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
          {idea.content_angle}
        </span>
      </div>
      <h4 className="font-bold text-sm text-foreground line-clamp-1">
        {idea.topic?.title || 'Trending Topic'}
      </h4>
      <p className="text-xs text-slate-400 line-clamp-2">
        "{idea.hook}"
      </p>
      {idea.active_claim && (
        <div className="flex items-center gap-1 text-[11px] text-purple-400 font-medium pt-1">
          <Lock className="w-3 h-3" />
          <span>Claimed by {idea.active_claim.user?.name || 'Team member'}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Content Publishing Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Algorithmically timed publishing slots optimized for Indian audience engagement (Asia/Kolkata IST).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Morning Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">Morning (06:00 - 12:00 IST)</span>
          </div>
          <div className="space-y-3">
            {morningSlots.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
                No scheduled posts
              </div>
            ) : (
              morningSlots.map(renderSlotCard)
            )}
          </div>
        </div>

        {/* Afternoon Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sun className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-sm">Afternoon (12:00 - 17:00 IST)</span>
          </div>
          <div className="space-y-3">
            {afternoonSlots.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
                No scheduled posts
              </div>
            ) : (
              afternoonSlots.map(renderSlotCard)
            )}
          </div>
        </div>

        {/* Evening Peak Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sunset className="w-4 h-4 text-pink-400" />
            <span className="font-bold text-sm text-pink-400">Peak Evening (17:00 - 21:00 IST)</span>
          </div>
          <div className="space-y-3">
            {eveningSlots.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
                No scheduled posts
              </div>
            ) : (
              eveningSlots.map(renderSlotCard)
            )}
          </div>
        </div>

        {/* Night Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-sm">Night (21:00+ IST)</span>
          </div>
          <div className="space-y-3">
            {nightSlots.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-border rounded-xl">
                No scheduled posts
              </div>
            ) : (
              nightSlots.map(renderSlotCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
