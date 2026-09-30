export type TrendSource = 'google_trends' | 'youtube' | 'reddit' | 'x' | 'multi_source';

export interface RawTrendItem {
  source: TrendSource;
  external_id: string;
  title: string;
  description?: string;
  url?: string;
  source_timestamp: string; // ISO string (UTC)
  raw_metadata: Record<string, unknown>;
  region?: string;
  category?: string;
  volume?: number;
  velocity?: number; // e.g. change in volume or rate per hour
}

export interface NormalizedTopic {
  id?: string;
  source: TrendSource;
  external_id: string;
  title: string;
  normalized_title: string;
  description?: string;
  url?: string;
  category: string;
  volume: number;
  velocity: number;
  source_timestamp: string;
  fetched_at: string;
  freshness_score: number;
  volume_score: number;
  velocity_score: number;
  instagram_fit_score: number;
  cross_platform_score: number;
  virality_score: number;
  is_top_10: boolean;
  run_id?: string;
  raw_metadata: Record<string, unknown>;
  region: string;
  created_at?: string;
  // Extra fields for multi-source tracking
  sources_matched?: TrendSource[];
}

export interface ScoreComponents {
  freshness_score: number;
  volume_score: number;
  velocity_score: number;
  instagram_fit_score: number;
  cross_platform_score: number;
  virality_score: number;
}

export interface ReelScript {
  hook_3s: string;
  body_30s: string;
  payoff: string;
  cta: string;
  estimated_duration_seconds: number;
  visual_cues?: string[];
}

export interface CarouselSlide {
  slide_number: number;
  type: 'hook' | 'content' | 'cta';
  headline: string;
  content: string;
  visual_suggestion?: string;
}

export interface CarouselOutline {
  hook_slide: CarouselSlide;
  content_slides: CarouselSlide[];
  cta_slide: CarouselSlide;
}

export interface RecommendedPostTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  iso_timestamp: string; // UTC ISO
  timezone: string; // e.g. 'Asia/Kolkata'
  reasoning: string;
}

export type ContentAngle =
  | 'educational'
  | 'funny'
  | 'news-style'
  | 'relatable'
  | 'curiosity'
  | 'contrarian'
  | 'behind-the-scenes';

export interface ContentIdea {
  id: string;
  topic_id: string;
  topic?: NormalizedTopic;
  reel_script: ReelScript;
  hook: string;
  captions: [string, string, string]; // exactly 3 options
  hashtags: string[]; // exactly 15 hashtags
  carousel_outline: CarouselOutline;
  recommended_post_time: string; // ISO string
  post_time_timezone: string;
  content_angle: ContentAngle | string;
  generation_status: 'pending' | 'generating' | 'completed' | 'failed' | 'success' | 'fallback';
  delivery_status: 'pending' | 'delivered' | 'failed';
  approval_status: 'pending' | 'approved' | 'rejected';
  is_development_content?: boolean;
  ai_provider_used?: 'openrouter' | 'claude' | 'development_test' | 'development';
  ai_model?: string;
  created_at: string;
  updated_at: string;
  active_claim?: IdeaClaim | null;
}

export interface IdeaClaim {
  id: string;
  idea_id: string;
  user_id: string;
  claimed_at: string;
  released_at?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface Delivery {
  id: string;
  idea_id: string;
  idea?: ContentIdea;
  user_id: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  telegram_message_id?: string;
  telegram_chat_id: string;
  delivery_status: 'sent' | 'failed';
  delivered_at: string;
  action?: 'approved' | 'rejected' | 'claimed' | 'unclaimed' | null;
  action_at?: string | null;
  error_message?: string | null;
  is_development_delivery?: boolean;
  telegram_payload_preview?: string;
  created_at: string;
}

export interface TrendRun {
  id: string;
  type: 'scheduled_daily' | 'manual_refresh' | 'spike_scan';
  started_at: string;
  completed_at?: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  topics_found: number;
  providers_succeeded: string[];
  providers_failed: string[];
  error_summary?: string | null;
  metadata: Record<string, unknown>;
}

export interface SpikeEvent {
  id: string;
  topic_id: string;
  topic?: NormalizedTopic;
  previous_score: number;
  current_score: number;
  score_change: number;
  detected_at: string;
  alerted: boolean;
  severity: 'medium' | 'high' | 'critical';
  raw_context: {
    previous_velocity?: number;
    current_velocity?: number;
    suggested_angle?: string;
    spike_reason?: string;
    [key: string]: unknown;
  };
}

export interface SystemLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  event: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiKeySetting {
  id: string;
  provider: 'openrouter' | 'claude' | 'youtube' | 'reddit' | 'x' | 'telegram' | 'google_trends';
  masked_key: string;
  enabled: boolean;
  status: 'active' | 'failed' | 'untested';
  last_tested_at?: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  telegram_chat_id?: string | null;
  telegram_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  timezone: string;
  trend_scan_time: string; // e.g. "07:00"
  telegram_delivery_time: string; // e.g. "07:30"
  spike_detection_interval_hours: number;
  spike_score_change_threshold: number;
  spike_velocity_threshold: number;
  minimum_significance: number;
  ai_model: string;
  daily_generation_limit: number;
  refresh_cooldown_seconds: number;
}
