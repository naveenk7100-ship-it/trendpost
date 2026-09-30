'use client';

import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, XCircle, Clock, Lock, MessageSquare, Eye, ShieldCheck } from 'lucide-react';
import { Delivery } from '@/types';
import { formatToIST } from '@/lib/config';
import { useToast } from '@/context/ToastContext';
import { useUser } from '@/context/UserContext';

export default function DeliveriesPage() {
  const { currentUser } = useUser();
  const { success, error, info } = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDelivery, setPreviewDelivery] = useState<Delivery | null>(null);

  const fetchDeliveries = () => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.top5Delivered) {
          setDeliveries(data.top5Delivered);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleSimulateTelegramCallback = async (action: 'approve' | 'reject' | 'claim', ideaId: string) => {
    info('Callback Triggered', `Simulating Telegram inline callback [${action.toUpperCase()}]...`);
    try {
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: Math.floor(Math.random() * 100000),
          callback_query: {
            id: `cb-sim-${Date.now()}`,
            from: { id: parseInt(currentUser.telegram_chat_id || '123456781', 10), is_bot: false, first_name: currentUser.name },
            message: {
              message_id: 101,
              chat: { id: parseInt(currentUser.telegram_chat_id || '123456781', 10) },
              text: previewDelivery?.telegram_payload_preview || 'Simulated Delivery',
            },
            data: `${action}:${ideaId}`,
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        success('Callback Processed', data.result?.message || `Action ${action} recorded!`);
        fetchDeliveries();
        window.dispatchEvent(new Event('trendpost-updated'));
      } else {
        error('Callback Failed', data.error);
      }
    } catch {
      error('Error', 'Failed to simulate Telegram callback');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Telegram Delivery History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit log of all 07:30 AM IST dispatches and user callback button interactions (Approve, Reject, Claim).
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {deliveries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Send className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <div className="font-semibold text-sm">No delivery events logged yet</div>
            <p className="text-xs text-slate-500">
              Dispatches occur daily at 07:30 AM IST or upon clicking "Run 07:30 Telegram Delivery" on the Overview dashboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Topic / Idea</th>
                  <th className="py-3 px-4">Delivered Time (IST)</th>
                  <th className="py-3 px-4 text-center">Delivery Mode</th>
                  <th className="py-3 px-4 text-center">User Action</th>
                  <th className="py-3 px-4 text-right">Message ID</th>
                  <th className="py-3 px-4 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{del.user?.name || 'Person A'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Chat: {del.telegram_chat_id}</div>
                    </td>
                    <td className="py-4 px-4 max-w-sm">
                      <div className="font-medium text-foreground line-clamp-1">
                        {del.idea?.topic?.title || 'Daily Trend Content Idea'}
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        "{del.idea?.hook || 'Scroll-stopping hook'}"
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                      {formatToIST(del.delivered_at)}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {del.is_development_delivery ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          DEVELOPMENT DELIVERY
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          TELEGRAM API SENT
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {del.action ? (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          del.action === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : del.action === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {del.action}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Pending action</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap font-mono text-xs text-slate-500">
                      {del.telegram_message_id ? `#${del.telegram_message_id}` : '—'}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setPreviewDelivery(del)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulated Telegram Message Preview Modal */}
      {previewDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-foreground">
                  Telegram Delivery Payload Preview
                </h3>
              </div>
              <button
                onClick={() => setPreviewDelivery(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Telegram simulated chat bubble */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-sans text-xs">
              <div className="text-[10px] text-sky-400 font-mono flex items-center justify-between">
                <span>To: {previewDelivery.user?.name || 'Person A'} ({previewDelivery.telegram_chat_id})</span>
                <span>{previewDelivery.is_development_delivery ? '[SIMULATED DISPATCH]' : '[LIVE DISPATCH]'}</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed text-xs">
                {previewDelivery.telegram_payload_preview || 'No raw preview stored'}
              </pre>

              {/* Inline Buttons Simulator */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Simulate Telegram Inline Buttons (Webhook Callback):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulateTelegramCallback('approve', previewDelivery.idea_id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleSimulateTelegramCallback('reject', previewDelivery.idea_id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => handleSimulateTelegramCallback('claim', previewDelivery.idea_id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                  >
                    🔒 Claim Idea
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewDelivery(null)}
                className="py-1.5 px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
