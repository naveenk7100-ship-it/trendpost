import { 
  User, 
  NormalizedTopic, 
  ContentIdea, 
  Delivery, 
  SpikeEvent, 
  SystemLog, 
  SystemSettings, 
  TrendRun,
  ApiKeySetting 
} from '@/types';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
import { ClaimManager } from '@/lib/claims/claim-manager';
import { logger } from '@/lib/logger';
import { APP_CONFIG, nowUTC } from '@/lib/config';

// Initial pre-seeded users: Person A & Person B
const SEED_USERS: User[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'person.a@trendpost.local',
    name: 'Person A',
    role: 'admin',
    telegram_chat_id: process.env.PERSON_A_TELEGRAM_CHAT_ID || '123456781',
    telegram_enabled: true,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'person.b@trendpost.local',
    name: 'Person B',
    role: 'member',
    telegram_chat_id: process.env.PERSON_B_TELEGRAM_CHAT_ID || '123456782',
    telegram_enabled: true,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
  },
];

// In-memory data store for live operation & zero-config testing
class DataRepository {
  private users: User[] = [...SEED_USERS];
  private topics: NormalizedTopic[] = [];
  private ideas: ContentIdea[] = [];
  private deliveries: Delivery[] = [];
  private spikeEvents: SpikeEvent[] = [];
  private trendRuns: TrendRun[] = [];
  private apiKeys: ApiKeySetting[] = [
    {
      id: 'key-openrouter',
      provider: 'openrouter',
      masked_key: process.env.OPENROUTER_API_KEY ? 'sk-or-••••••••' + process.env.OPENROUTER_API_KEY.slice(-4) : '',
      enabled: Boolean(process.env.OPENROUTER_API_KEY),
      status: process.env.OPENROUTER_API_KEY ? 'active' : 'untested',
      metadata: { model: process.env.OPENROUTER_MODEL || 'openrouter/free' },
      updated_at: nowUTC(),
    },
    {
      id: 'key-1',
      provider: 'claude',
      masked_key: process.env.ANTHROPIC_API_KEY ? 'sk-ant-••••••••' + process.env.ANTHROPIC_API_KEY.slice(-4) : '',
      enabled: Boolean(process.env.ANTHROPIC_API_KEY),
      status: process.env.ANTHROPIC_API_KEY ? 'active' : 'untested',
      metadata: { model: 'claude-3-5-sonnet-latest' },
      updated_at: nowUTC(),
    },
    {
      id: 'key-2',
      provider: 'youtube',
      masked_key: process.env.YOUTUBE_API_KEY ? 'AIza••••••••' + process.env.YOUTUBE_API_KEY.slice(-4) : '',
      enabled: Boolean(process.env.YOUTUBE_API_KEY),
      status: process.env.YOUTUBE_API_KEY ? 'active' : 'untested',
      metadata: { region: 'IN' },
      updated_at: nowUTC(),
    },
    {
      id: 'key-3',
      provider: 'reddit',
      masked_key: process.env.REDDIT_CLIENT_ID ? '••••••••' : 'Public Feed Active',
      enabled: true,
      status: 'active',
      metadata: { subreddits: ['r/all', 'r/india'] },
      updated_at: nowUTC(),
    },
    {
      id: 'key-4',
      provider: 'x',
      masked_key: process.env.X_BEARER_TOKEN ? 'AAAA••••••••' + process.env.X_BEARER_TOKEN.slice(-4) : '',
      enabled: Boolean(process.env.X_BEARER_TOKEN),
      status: process.env.X_BEARER_TOKEN ? 'active' : 'untested',
      metadata: {},
      updated_at: nowUTC(),
    },
    {
      id: 'key-5',
      provider: 'telegram',
      masked_key: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.split(':')[0] + ':••••••••' : '',
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      status: process.env.TELEGRAM_BOT_TOKEN ? 'active' : 'untested',
      metadata: {},
      updated_at: nowUTC(),
    },
  ];

  private settings: SystemSettings = {
    timezone: APP_CONFIG.timezone,
    trend_scan_time: APP_CONFIG.cronDailyScanTime,
    telegram_delivery_time: APP_CONFIG.cronTelegramDeliveryTime,
    spike_detection_interval_hours: APP_CONFIG.spikeDetectionIntervalHours,
    spike_score_change_threshold: APP_CONFIG.spikeScoreChangeThreshold,
    spike_velocity_threshold: APP_CONFIG.spikeVelocityThreshold,
    minimum_significance: APP_CONFIG.minimumSignificance,
    ai_model: APP_CONFIG.defaultAiModel,
    daily_generation_limit: APP_CONFIG.dailyGenerationLimit,
    refresh_cooldown_seconds: APP_CONFIG.refreshCooldownSeconds,
  };

  // USERS
  async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('users').select('*');
      if (data && data.length > 0) return data;
    }
    return this.users;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  async getUserByTelegramChatId(chatId: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.telegram_chat_id === chatId) || null;
  }

  // TOPICS
  async getTopics(): Promise<NormalizedTopic[]> {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('topics').select('*').order('virality_score', { ascending: false });
      if (data && data.length > 0) return data;
    }
    return this.topics;
  }

  async saveTopics(newTopics: NormalizedTopic[]): Promise<void> {
    this.topics = [...newTopics];
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('topics').insert(newTopics);
      } catch (err) {
        logger.warn({ service: 'db', event: 'DB_INSERT_WARN', message: 'Could not sync topics to Supabase table' });
      }
    }
  }

  // CONTENT IDEAS
  async getContentIdeas(): Promise<ContentIdea[]> {
    // Attach active claims to each idea
    return this.ideas.map(idea => ({
      ...idea,
      active_claim: ClaimManager.getActiveClaim(idea.id),
    }));
  }

  async saveContentIdeas(newIdeas: ContentIdea[]): Promise<void> {
    this.ideas = [...newIdeas, ...this.ideas.filter(existing => !newIdeas.some(n => n.id === existing.id))];
  }

  async updateIdeaApprovalStatus(ideaId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const idea = this.ideas.find(i => i.id === ideaId);
    if (!idea) return false;
    idea.approval_status = status;
    idea.updated_at = nowUTC();
    logger.info({
      service: 'editorial',
      event: status === 'approved' ? 'IDEA_APPROVED' : 'IDEA_REJECTED',
      message: `Idea "${idea.topic?.title || ideaId}" ${status} by editor`,
      metadata: { ideaId, status, topic: idea.topic?.title },
    });
    return true;
  }

  // CLAIMS
  async claimIdea(ideaId: string, userId: string): Promise<{ success: boolean; message: string; claim?: unknown }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    return await ClaimManager.claimIdea(ideaId, user);
  }

  async releaseIdea(ideaId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return await ClaimManager.releaseClaim(ideaId, userId);
  }

  // DELIVERIES
  async getDeliveries(): Promise<Delivery[]> {
    return this.deliveries;
  }

  async saveDeliveries(newDeliveries: Delivery[]): Promise<void> {
    this.deliveries.unshift(...newDeliveries);
  }

  // SPIKE EVENTS
  async getSpikeEvents(): Promise<SpikeEvent[]> {
    return this.spikeEvents;
  }

  async saveSpikeEvents(spikes: SpikeEvent[]): Promise<void> {
    this.spikeEvents.unshift(...spikes);
  }

  // TREND RUNS
  async getTrendRuns(): Promise<TrendRun[]> {
    return this.trendRuns;
  }

  async recordTrendRun(run: TrendRun): Promise<void> {
    this.trendRuns.unshift(run);
  }

  // SETTINGS
  async getSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }

  // API KEYS
  async getApiKeys(): Promise<ApiKeySetting[]> {
    if (!this.apiKeys.some(k => k.provider === 'openrouter')) {
      this.apiKeys.unshift({
        id: 'key-openrouter',
        provider: 'openrouter',
        masked_key: process.env.OPENROUTER_API_KEY ? 'sk-or-••••••••' + process.env.OPENROUTER_API_KEY.slice(-4) : '',
        enabled: Boolean(process.env.OPENROUTER_API_KEY),
        status: process.env.OPENROUTER_API_KEY ? 'active' : 'untested',
        metadata: { model: process.env.OPENROUTER_MODEL || 'openrouter/free' },
        updated_at: nowUTC(),
      });
    }
    return this.apiKeys;
  }

  async updateApiKey(
    provider: ApiKeySetting['provider'],
    key: string,
    enabled = true,
    metadata?: Record<string, unknown>
  ): Promise<ApiKeySetting> {
    let setting = this.apiKeys.find(k => k.provider === provider);
    const masked = key ? key.substring(0, 4) + '••••••••' + key.slice(-4) : '';
    
    if (setting) {
      setting.masked_key = masked || setting.masked_key;
      setting.enabled = enabled;
      if (metadata) {
        setting.metadata = { ...setting.metadata, ...metadata };
      }
      setting.updated_at = nowUTC();
    } else {
      setting = {
        id: `key-${Date.now()}`,
        provider,
        masked_key: masked,
        enabled,
        status: 'untested',
        metadata: metadata || {},
        updated_at: nowUTC(),
      };
      this.apiKeys.push(setting);
    }
    return setting;
  }

  async updateApiKeyStatus(
    provider: ApiKeySetting['provider'],
    status: 'active' | 'failed',
    lastTestedAt = nowUTC()
  ): Promise<void> {
    const setting = this.apiKeys.find(k => k.provider === provider);
    if (setting) {
      setting.status = status;
      setting.last_tested_at = lastTestedAt;
    }
  }
}

const globalForRepo = globalThis as unknown as { __trendpost_repo__?: DataRepository };
export const repository = globalForRepo.__trendpost_repo__ ?? new DataRepository();
globalForRepo.__trendpost_repo__ = repository;
