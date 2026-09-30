'use client';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  Sparkles,
  Layers,
  Video,
  Hash,
  Share2,
  FileText,
  UserCheck,
  Calendar
} from 'lucide-react';
import { ContentIdea } from '@/types';
import { formatToIST } from '@/lib/config';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/UserContext';

export default function IdeasPage() {
  const { currentUser } = useUser();
  const { success, error, info } = useToast();

  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeModalIdea, setActiveModalIdea] = useState<ContentIdea | null>(null);
  const [modalTab, setModalTab] = useState<'script' | 'captions' | 'carousel' | 'hashtags'>('script');

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success && data.recentIdeas) {
        setIdeas(data.recentIdeas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setGenerating(true);
    info('Generating Content Ideas', 'Scanning ranked trends and calling OpenRouter AI...');
    try {
      const res = await fetch('/api/ideas/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success('Ideas Generated', `Successfully created ${data.ideasCount} original content packages!`);
        fetchIdeas();
      } else {
        error('Generation Error', data.error || 'Failed to generate ideas');
      }
    } catch {
      error('Error', 'Failed to generate content ideas');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
    const handleUpdate = () => fetchIdeas();
    window.addEventListener('trendpost-updated', handleUpdate);
    return () => window.removeEventListener('trendpost-updated', handleUpdate);
  }, []);

  const handleClaim = async (ideaId: string) => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Claim Granted', `You now exclusively own this idea!`);
        fetchIdeas();
      } else {
        error('Claim Denied', data.message || 'Already claimed by another team member.');
        fetchIdeas();
      }
    } catch {
      error('Claim Failed', 'Could not complete transactional claim request');
    }
  };

  const handleRelease = async (ideaId: string) => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Claim Released', 'Idea is now open for claiming.');
        fetchIdeas();
      } else {
        error('Release Error', data.message);
      }
    } catch {
      error('Error', 'Failed to release claim');
    }
  };

  const handleStatusChange = async (ideaId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/ideas/${ideaId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        success(status === 'approved' ? 'Idea Approved' : 'Idea Rejected');
        fetchIdeas();
      }
    } catch {
      error('Error', 'Failed to update status');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard', label);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Content Ideas & Scripts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Original AI-generated Reel scripts, carousels, 15 hashtags & captions with atomic two-user claim locking.
          </p>
        </div>
        <button
          onClick={handleGenerateIdeas}
          disabled={generating}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition self-start sm:self-auto"
        >
          <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Generating Ideas...' : 'Generate Content Ideas'}</span>
        </button>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center text-slate-400 space-y-4">
          <Lightbulb className="w-12 h-12 mx-auto text-slate-500 opacity-40" />
          <div className="font-semibold text-base">No content ideas generated yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Generate production-ready social media packages (Reel scripts, carousels, 15 hashtags & captions) for ranked Indian trends using OpenRouter AI.
          </p>
          <button
            onClick={handleGenerateIdeas}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 transition"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating Ideas...' : 'Generate Content Ideas Now'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => {
            const isClaimed = idea.active_claim != null;
            const isClaimedByMe = isClaimed && idea.active_claim?.user_id === currentUser.id;
            const claimerName = idea.active_claim?.user?.name || (isClaimedByMe ? currentUser.name : 'Other User');

            return (
              <div
                key={idea.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-200"
              >
                {/* Card Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {idea.content_angle}
                    </span>

                    {/* Claim Badge */}
                    {isClaimed ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isClaimedByMe
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>{isClaimedByMe ? 'Claimed by You' : `Claimed: ${claimerName}`}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {/* Topic Title */}
                  <h3 className="font-bold text-foreground text-sm line-clamp-2">
                    {idea.topic?.title || 'Trending Topic'}
                  </h3>

                  {/* Mode / Content Origin Indicator */}
                  <div className="flex items-center gap-1.5">
                    {idea.is_development_content || idea.ai_provider_used === 'development_test' || idea.ai_provider_used === 'development' ? (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 tracking-wider">
                        DEVELOPMENT TEST CONTENT
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                        {idea.ai_provider_used === 'openrouter' ? 'OPENROUTER AI' : 'AI GENERATED'}
                      </span>
                    )}
                  </div>

                  {/* Hook Quote Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs italic text-slate-300 line-clamp-3">
                    "{idea.hook}"
                  </div>

                  {/* Recommended Post Time IST */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Slot: <strong>{formatToIST(idea.recommended_post_time)}</strong></span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-2.5">
                  {/* View Details Button */}
                  <button
                    onClick={() => {
                      setActiveModalIdea(idea);
                      setModalTab('script');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition"
                  >
                    <Video className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View Reel Script & Assets</span>
                  </button>

                  {/* Claim and Approval Controls */}
                  <div className="flex items-center gap-2">
                    {/* Atomic Claim / Release Button */}
                    {isClaimed ? (
                      isClaimedByMe ? (
                        <button
                          onClick={() => handleRelease(idea.id)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-1 transition"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>Release Claim</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Locked by {claimerName}</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleClaim(idea.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1 transition shadow-sm"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Claim Idea</span>
                      </button>
                    )}

                    {/* Quick Approve / Reject Buttons */}
                    <button
                      onClick={() => handleStatusChange(idea.id, 'approved')}
                      title="Approve Idea"
                      className={`p-1.5 rounded-lg border transition ${
                        idea.approval_status === 'approved'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-border text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(idea.id, 'rejected')}
                      title="Reject Idea"
                      className={`p-1.5 rounded-lg border transition ${
                        idea.approval_status === 'rejected'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                          : 'border-border text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Production Details Modal (Reel Script, Captions, Carousel, Hashtags) */}
      {activeModalIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  {activeModalIdea.content_angle} Angle
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5 line-clamp-1">
                  {activeModalIdea.topic?.title || 'Trending Content Package'}
                </h2>
              </div>
              <button
                onClick={() => setActiveModalIdea(null)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <button
                onClick={() => setModalTab('script')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  modalTab === 'script' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Reel Script</span>
              </button>
              <button
                onClick={() => setModalTab('captions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  modalTab === 'captions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>3 Captions</span>
              </button>
              <button
                onClick={() => setModalTab('carousel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  modalTab === 'carousel' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Carousel Outline</span>
              </button>
              <button
                onClick={() => setModalTab('hashtags')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  modalTab === 'hashtags' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>15 Hashtags</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {modalTab === 'script' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block mb-1">
                      First 3 Seconds Hook:
                    </span>
                    <p className="text-foreground text-sm font-medium">"{activeModalIdea.reel_script.hook_3s}"</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                      30-Second Body (Fast Paced):
                    </span>
                    <p className="text-slate-300 leading-relaxed">{activeModalIdea.reel_script.body_30s}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                      Payoff / Climax:
                    </span>
                    <p className="text-foreground">{activeModalIdea.reel_script.payoff}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] block mb-1">
                      Call to Action (CTA):
                    </span>
                    <p className="text-foreground">{activeModalIdea.reel_script.cta}</p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(
                      `HOOK: ${activeModalIdea.reel_script.hook_3s}\n\nBODY: ${activeModalIdea.reel_script.body_30s}\n\nPAYOFF: ${activeModalIdea.reel_script.payoff}\n\nCTA: ${activeModalIdea.reel_script.cta}`,
                      'Full Reel Script'
                    )}
                    className="w-full py-2 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-indigo-500 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Reel Script</span>
                  </button>
                </div>
              )}

              {modalTab === 'captions' && (
                <div className="space-y-3 text-xs">
                  {activeModalIdea.captions.map((cap, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">
                          Option {i + 1}: {i === 0 ? 'Punchy / Short' : i === 1 ? 'Story & Context' : 'Conversational Debate'}
                        </span>
                        <button
                          onClick={() => copyToClipboard(cap, `Caption Option ${i + 1}`)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{cap}</p>
                    </div>
                  ))}
                </div>
              )}

              {modalTab === 'carousel' && (
                <div className="space-y-3 text-xs">
                  {/* Slide 1 */}
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <span className="font-bold text-purple-400 text-[10px]">SLIDE 1 (HOOK):</span>
                    <div className="font-bold text-foreground text-sm mt-0.5">{activeModalIdea.carousel_outline.hook_slide.headline}</div>
                    <div className="text-slate-400 mt-1">{activeModalIdea.carousel_outline.hook_slide.content}</div>
                  </div>

                  {/* Body Slides */}
                  {activeModalIdea.carousel_outline.content_slides.map((s, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
                      <span className="font-bold text-slate-400 text-[10px]">SLIDE {s.slide_number} (BODY):</span>
                      <div className="font-semibold text-foreground mt-0.5">{s.headline}</div>
                      <div className="text-slate-300 mt-1">{s.content}</div>
                    </div>
                  ))}

                  {/* CTA Slide */}
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <span className="font-bold text-indigo-400 text-[10px]">FINAL SLIDE (CTA):</span>
                    <div className="font-bold text-foreground mt-0.5">{activeModalIdea.carousel_outline.cta_slide.headline}</div>
                    <div className="text-slate-400 mt-1">{activeModalIdea.carousel_outline.cta_slide.content}</div>
                  </div>
                </div>
              )}

              {modalTab === 'hashtags' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {activeModalIdea.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-indigo-400 border border-border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => copyToClipboard(activeModalIdea.hashtags.join(' '), '15 Hashtags')}
                    className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-indigo-500 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All 15 Hashtags</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Recommended Slot: <strong>{formatToIST(activeModalIdea.recommended_post_time)}</strong>
              </div>
              <button
                onClick={() => setActiveModalIdea(null)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
