import fs from 'fs';
import path from 'path';
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

const SEED_TOPICS: NormalizedTopic[] = [
  {
    id: 'topic-gt-IN-isro-gaganyaan',
    source: 'google_trends',
    sources_matched: ['google_trends'],
    external_id: 'gt-IN-isro-gaganyaan',
    title: 'ISRO Gaganyaan Mission Milestones',
    normalized_title: 'isro gaganyaan mission milestones',
    description: 'Trending across India with 50,000+ searches as ISRO advances key crew module qualification milestones.',
    url: 'https://trends.google.com/trending/rss?geo=IN',
    category: 'Space & Technology',
    volume: 50000,
    velocity: 4200,
    source_timestamp: '2026-09-30T06:00:00.000Z',
    fetched_at: '2026-09-30T07:00:00.000Z',
    raw_metadata: {},
    region: 'IN',
    freshness_score: 98,
    volume_score: 85,
    velocity_score: 82,
    instagram_fit_score: 88,
    cross_platform_score: 75,
    virality_score: 87,
    is_top_10: true,
  },
  {
    id: 'topic-gt-IN-ai-tech-india',
    source: 'multi_source',
    sources_matched: ['google_trends', 'reddit'],
    external_id: 'ms-IN-ai-tech-india',
    title: 'India AI Compute Ecosystem Surge',
    normalized_title: 'india ai compute ecosystem surge',
    description: 'National computing infrastructure expansion and emerging tech startup initiatives.',
    url: 'https://trends.google.com/trending/rss?geo=IN',
    category: 'Tech & Economy',
    volume: 35000,
    velocity: 3100,
    source_timestamp: '2026-09-30T06:15:00.000Z',
    fetched_at: '2026-09-30T07:00:00.000Z',
    raw_metadata: {},
    region: 'IN',
    freshness_score: 95,
    volume_score: 75,
    velocity_score: 76,
    instagram_fit_score: 82,
    cross_platform_score: 85,
    virality_score: 83,
    is_top_10: true,
  },
  {
    id: 'topic-gt-IN-cricket-championship',
    source: 'google_trends',
    sources_matched: ['google_trends'],
    external_id: 'gt-IN-cricket-championship',
    title: 'Indian Cricket Team Selection & Tactical Preview',
    normalized_title: 'indian cricket team selection tactical preview',
    description: 'Massive social media buzz following squad announcements and tactical previews.',
    url: 'https://trends.google.com/trending/rss?geo=IN',
    category: 'Sports & Entertainment',
    volume: 80000,
    velocity: 5500,
    source_timestamp: '2026-09-30T06:30:00.000Z',
    fetched_at: '2026-09-30T07:00:00.000Z',
    raw_metadata: {},
    region: 'IN',
    freshness_score: 96,
    volume_score: 92,
    velocity_score: 90,
    instagram_fit_score: 90,
    cross_platform_score: 70,
    virality_score: 91,
    is_top_10: true,
  },
];

const SEED_IDEAS: ContentIdea[] = [
  {
    id: 'idea-seed-gaganyaan-01',
    topic_id: 'topic-gt-IN-isro-gaganyaan',
    topic: SEED_TOPICS[0],
    reel_script: {
      hook_3s: 'Stop scrolling! India is one step closer to putting humans into space.',
      body_30s: 'ISRO just completed a crucial environmental qualification test for Gaganyaan. With indigenous life support systems locked in, the astronaut crew is gearing up for uncrewed trials.',
      payoff: 'This places India among only 4 nations in history with indigenous human spaceflight capabilities.',
      cta: 'Double tap if you are proud of Indian space engineering! Drop your thoughts below.',
      estimated_duration_seconds: 30,
      visual_cues: [
        'Bold text: "HUMANS IN SPACE"',
        'ISRO mission countdown timer graphic',
        'Split-screen astronaut module simulator',
      ],
    },
    hook: 'Why ISRO\'s newest Gaganyaan breakthrough has the world watching India today',
    captions: [
      'Gaganyaan enters final testing phase. Are you ready to see Indian vyomanauts in orbit? 🚀',
      'Massive achievement for Indian space exploration as Gaganyaan passes major qualification tests.',
      'From SLV-3 to Gaganyaan: India\'s space journey reaches its most ambitious frontier yet.',
    ],
    hashtags: [
      '#isro', '#gaganyaan', '#indiaspace', '#spaceflight', '#scienceindia',
      '#techupdates', '#trendingindia', '#viraltrend', '#reelsindia', '#innovations',
      '#bharat', '#engineering', '#futuretech', '#dailyinsights', '#spaceexploration',
    ],
    carousel_outline: {
      hook_slide: {
        slide_number: 1,
        type: 'hook',
        headline: 'Inside India\'s Gaganyaan Mission',
        content: 'How ISRO is preparing to send Indian astronauts into low Earth orbit.',
        visual_suggestion: 'High-contrast graphic of crew module against Earth',
      },
      content_slides: [
        {
          slide_number: 2,
          type: 'content',
          headline: '1. Human-Rated Propulsion',
          content: 'LVM3 rocket modified with advanced safety escape systems tested at high altitudes.',
          visual_suggestion: 'Rocket cutaway blueprint diagram',
        },
        {
          slide_number: 3,
          type: 'content',
          headline: '2. Indigenous Life Support',
          content: 'Complete cabin pressure, thermal control and oxygen recycling verified in ground chambers.',
          visual_suggestion: 'Crew module cabin telemetry interface',
        },
      ],
      cta_slide: {
        slide_number: 4,
        type: 'cta',
        headline: 'Follow For High-Signal Trend Breakdowns',
        content: 'Save this post and share with fellow tech and space enthusiasts.',
        visual_suggestion: 'Save button icon and share prompt',
      },
    },
    recommended_post_time: '2026-09-30T13:00:00.000Z',
    post_time_timezone: 'Asia/Kolkata',
    content_angle: 'educational',
    generation_status: 'success',
    delivery_status: 'pending',
    approval_status: 'pending',
    is_development_content: false,
    ai_provider_used: 'openrouter',
    ai_model: 'openrouter/free',
    created_at: '2026-09-30T07:05:00.000Z',
    updated_at: '2026-09-30T07:05:00.000Z',
  },
  {
    id: 'idea-seed-ai-compute-02',
    topic_id: 'topic-gt-IN-ai-tech-india',
    topic: SEED_TOPICS[1],
    reel_script: {
      hook_3s: 'India\'s AI compute revolution just hit overdrive—here is what you need to know.',
      body_30s: 'Over 10,000 GPUs are being deployed under the IndiaAI mission to empower local startups and researchers. Cloud credits, sovereign LLM development, and high-performance computing are now accessible.',
      payoff: 'This eliminates dependency on foreign compute and accelerates homegrown Indian AI models.',
      cta: 'Which Indian AI startup are you most excited about? Comment below!',
      estimated_duration_seconds: 30,
      visual_cues: [
        'Server rack GPU neon glow overlay',
        'Data infographic: "10,000+ GPUs"',
        'Text popup: "SOVEREIGN AI"',
      ],
    },
    hook: 'How the IndiaAI compute mission is reshaping tech innovation across the subcontinent',
    captions: [
      'Massive compute expansion for Indian developers: 10,000+ GPUs unlocked. 💻⚡',
      'The era of sovereign Indian AI is here. Here is what the compute mission means for creators.',
      'Why AI compute infrastructure is India\'s most critical digital asset this decade.',
    ],
    hashtags: [
      '#indiaai', '#artificialintelligence', '#techindia', '#startupsindia', '#technews',
      '#compute', '#digitalindia', '#innovation', '#aiinfrastructure', '#futureofwork',
      '#developercommunity', '#gpucomputing', '#indiatrending', '#smarttech', '#explorepage',
    ],
    carousel_outline: {
      hook_slide: {
        slide_number: 1,
        type: 'hook',
        headline: 'India\'s Sovereign AI Wave',
        content: 'Why accessible compute is the foundation of the next tech boom.',
        visual_suggestion: 'Geometric digital map of Indian tech hubs',
      },
      content_slides: [
        {
          slide_number: 2,
          type: 'content',
          headline: 'Decentralized GPU Access',
          content: 'Subsidized compute access for university researchers and early-stage founders.',
          visual_suggestion: 'Bar graph showing compute cost reduction',
        },
        {
          slide_number: 3,
          type: 'content',
          headline: 'Multi-Lingual Foundation Models',
          content: 'Training models natively across 22 scheduled Indian languages with localized cultural nuance.',
          visual_suggestion: 'Linguistic AI speech waveform visualization',
        },
      ],
      cta_slide: {
        slide_number: 4,
        type: 'cta',
        headline: 'Stay Ahead Of Viral Indian Trends',
        content: 'Follow TrendPost for daily high-signal analytics and creator blueprints.',
        visual_suggestion: 'Bookmark icon and bell notification reminder',
      },
    },
    recommended_post_time: '2026-09-30T14:30:00.000Z',
    post_time_timezone: 'Asia/Kolkata',
    content_angle: 'curiosity',
    generation_status: 'success',
    delivery_status: 'pending',
    approval_status: 'pending',
    is_development_content: false,
    ai_provider_used: 'openrouter',
    ai_model: 'openrouter/free',
    created_at: '2026-09-30T07:10:00.000Z',
    updated_at: '2026-09-30T07:10:00.000Z',
  },
  {
    id: 'idea-seed-cricket-03',
    topic_id: 'topic-gt-IN-cricket-championship',
    topic: SEED_TOPICS[2],
    reel_script: {
      hook_3s: 'Team India\'s tactical lineup just dropped, and fans are passionately debating one key selection.',
      body_30s: 'With squad balance prioritizing deep batting and versatile seam-bowling all-rounders, the management has signaled a modern, high-tempo game plan for upcoming fixtures.',
      payoff: 'Aggressive intent in the powerplay will define the squad\'s tournament strategy.',
      cta: 'Who makes your dream starting eleven? Share your lineup in the comments!',
      estimated_duration_seconds: 30,
      visual_cues: [
        'Stadium lights flare animation',
        'Batting strike-rate comparison stat card',
        'Team jersey lineup animation',
      ],
    },
    hook: 'The tactical gamble inside Team India\'s newest selection announcement',
    captions: [
      'Bold tactical picks for Team India! What do you think of the new squad balance? 🏏',
      'Analyzing the team strategy: Powerplay aggression and bowling depth unpacked.',
      'Cricket fever returns: Team India\'s roadmap to tournament victory.',
    ],
    hashtags: [
      '#cricket', '#teamindia', '#bcci', '#cricketfans', '#sportsindia',
      '#trending', '#viralsports', '#crickettips', '#reelsindia', '#indiavspak',
      '#matchday', '#rohitsharma', '#cricketanalysis', '#indiancricket', '#sportsnews',
    ],
    carousel_outline: {
      hook_slide: {
        slide_number: 1,
        type: 'hook',
        headline: 'Team India Tactical Breakdown',
        content: 'Analyzing the strategy behind the latest tournament squad.',
        visual_suggestion: 'Cricket pitch diagram with field placements',
      },
      content_slides: [
        {
          slide_number: 2,
          type: 'content',
          headline: '1. Powerplay Approach',
          content: 'Prioritizing explosive run-rates during the first six overs to maximize field restrictions.',
          visual_suggestion: 'Run-rate trajectory chart',
        },
        {
          slide_number: 3,
          type: 'content',
          headline: '2. Bowling Versatility',
          content: 'Dual wrist-spin and pace combinations designed for dry subcontinental pitches.',
          visual_suggestion: 'Bowling heat-map visualization',
        },
      ],
      cta_slide: {
        slide_number: 4,
        type: 'cta',
        headline: 'Join The Discussion',
        content: 'Save this post and share your predictions with your friends.',
        visual_suggestion: 'Interactive comment icon and poll prompt',
      },
    },
    recommended_post_time: '2026-09-30T16:00:00.000Z',
    post_time_timezone: 'Asia/Kolkata',
    content_angle: 'news-style',
    generation_status: 'success',
    delivery_status: 'pending',
    approval_status: 'pending',
    is_development_content: false,
    ai_provider_used: 'openrouter',
    ai_model: 'openrouter/free',
    created_at: '2026-09-30T07:15:00.000Z',
    updated_at: '2026-09-30T07:15:00.000Z',
  },
];

interface PersistedState {
  users?: User[];
  topics?: NormalizedTopic[];
  ideas?: ContentIdea[];
  deliveries?: Delivery[];
  spikeEvents?: SpikeEvent[];
  trendRuns?: TrendRun[];
  settings?: SystemSettings;
  apiKeys?: ApiKeySetting[];
}

function getStoreFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'trendpost-db.json');
  }
  const dataDir = path.join(process.cwd(), '.data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'trendpost-db.json');
  } catch {
    return path.join('/tmp', 'trendpost-db.json');
  }
}

// Zero-config, Vercel-compatible file & memory persistent store
class DataRepository {
  private users: User[] = [...SEED_USERS];
  private topics: NormalizedTopic[] = [...SEED_TOPICS];
  private ideas: ContentIdea[] = [...SEED_IDEAS];
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

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const filePath = getStoreFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed: PersistedState = JSON.parse(raw);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) this.users = parsed.users;
        if (Array.isArray(parsed.topics) && parsed.topics.length > 0) this.topics = parsed.topics;
        if (Array.isArray(parsed.ideas) && parsed.ideas.length > 0) this.ideas = parsed.ideas;
        if (Array.isArray(parsed.deliveries)) this.deliveries = parsed.deliveries;
        if (Array.isArray(parsed.spikeEvents)) this.spikeEvents = parsed.spikeEvents;
        if (Array.isArray(parsed.trendRuns)) this.trendRuns = parsed.trendRuns;
        if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };
      }
    } catch {
      // In-memory fallback is always operational
    }
  }

  private persist(): void {
    try {
      const filePath = getStoreFilePath();
      const state: PersistedState = {
        users: this.users,
        topics: this.topics,
        ideas: this.ideas,
        deliveries: this.deliveries,
        spikeEvents: this.spikeEvents,
        trendRuns: this.trendRuns,
        settings: this.settings,
      };
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch {
      // Silently fall back to in-memory state
    }
  }

  // USERS
  async getUsers(): Promise<User[]> {
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
    return this.topics;
  }

  async saveTopics(newTopics: NormalizedTopic[]): Promise<void> {
    this.topics = [...newTopics];
    this.persist();
  }

  // CONTENT IDEAS
  async getContentIdeas(): Promise<ContentIdea[]> {
    return this.ideas.map(idea => ({
      ...idea,
      active_claim: ClaimManager.getActiveClaim(idea.id),
    }));
  }

  async saveContentIdeas(newIdeas: ContentIdea[]): Promise<void> {
    this.ideas = [...newIdeas, ...this.ideas.filter(existing => !newIdeas.some(n => n.id === existing.id))];
    this.persist();
  }

  async updateIdeaApprovalStatus(ideaId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const idea = this.ideas.find(i => i.id === ideaId);
    if (!idea) return false;
    idea.approval_status = status;
    idea.updated_at = nowUTC();
    this.persist();
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
    const result = await ClaimManager.claimIdea(ideaId, user);
    if (result.success) {
      this.persist();
    }
    return result;
  }

  async releaseIdea(ideaId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const result = await ClaimManager.releaseClaim(ideaId, userId);
    if (result.success) {
      this.persist();
    }
    return result;
  }

  // DELIVERIES
  async getDeliveries(): Promise<Delivery[]> {
    return this.deliveries;
  }

  async saveDeliveries(newDeliveries: Delivery[]): Promise<void> {
    this.deliveries.unshift(...newDeliveries);
    this.persist();
  }

  // SPIKE EVENTS
  async getSpikeEvents(): Promise<SpikeEvent[]> {
    return this.spikeEvents;
  }

  async saveSpikeEvents(spikes: SpikeEvent[]): Promise<void> {
    this.spikeEvents.unshift(...spikes);
    this.persist();
  }

  // TREND RUNS
  async getTrendRuns(): Promise<TrendRun[]> {
    return this.trendRuns;
  }

  async recordTrendRun(run: TrendRun): Promise<void> {
    this.trendRuns.unshift(run);
    this.persist();
  }

  // SETTINGS
  async getSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    this.settings = { ...this.settings, ...newSettings };
    this.persist();
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
    this.persist();
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
      this.persist();
    }
  }
}

const globalForRepo = globalThis as unknown as { __trendpost_repo__?: DataRepository };
export const repository = globalForRepo.__trendpost_repo__ ?? new DataRepository();
globalForRepo.__trendpost_repo__ = repository;
