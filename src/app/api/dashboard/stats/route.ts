import { NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { getEnvStatus, isFreeDevelopmentMode } from '@/lib/config';

export async function GET() {
  try {
    const [topics, ideas, deliveries, spikes, runs, settings, users] = await Promise.all([
      repository.getTopics(),
      repository.getContentIdeas(),
      repository.getDeliveries(),
      repository.getSpikeEvents(),
      repository.getTrendRuns(),
      repository.getSettings(),
      repository.getUsers(),
    ]);

    const top10Topics = topics.filter(t => t.is_top_10);
    const pendingIdeas = ideas.filter(i => i.approval_status === 'pending');
    const approvedIdeas = ideas.filter(i => i.approval_status === 'approved');
    const claimedIdeas = ideas.filter(i => i.active_claim != null);
    const deliveredCount = deliveries.filter(d => d.delivery_status === 'sent').length;

    const envStatus = getEnvStatus();
    const isFreeMode = isFreeDevelopmentMode();

    const apiKeys = await repository.getApiKeys();
    const openRouterSetting = apiKeys.find(k => k.provider === 'openrouter');
    const isConfigured = Boolean(openRouterSetting?.masked_key || envStatus.openrouterConfigured);
    const activeModel = (openRouterSetting?.metadata?.model as string) || envStatus.openrouterModel || 'openrouter/free';

    let aiMode: 'openrouter_connected' | 'openrouter_error' | 'development_active' = 'development_active';
    if (isConfigured) {
      if (openRouterSetting?.status === 'active') {
        aiMode = 'openrouter_connected';
      } else if (openRouterSetting?.status === 'failed') {
        aiMode = 'openrouter_error';
      } else {
        // configured but untested
        aiMode = 'openrouter_connected';
      }
    }

    return NextResponse.json({
      success: true,
      isFreeMode,
      envStatus,
      aiMode,
      aiModel: activeModel,
      stats: {
        totalTopics: topics.length,
        top10Count: top10Topics.length,
        totalIdeas: ideas.length,
        pendingApprovals: pendingIdeas.length,
        approvedIdeas: approvedIdeas.length,
        claimedIdeas: claimedIdeas.length,
        totalDeliveries: deliveredCount,
        totalSpikes: spikes.length,
      },
      top10Topics: top10Topics.slice(0, 10),
      top5Delivered: deliveries.slice(0, 5),
      recentIdeas: ideas.slice(0, 10),
      recentSpikes: spikes.slice(0, 5),
      recentRuns: runs.slice(0, 5),
      settings,
      users,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
