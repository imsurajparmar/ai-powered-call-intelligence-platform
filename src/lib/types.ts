export type Speaker = "agent" | "customer" | "unknown";

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: Speaker;
  text: string;
}

export interface NormalizedTranscript {
  call_id: string;
  language: string;
  duration_seconds: number;
  segments: TranscriptSegment[];
  raw_provider_payload?: Record<string, unknown>;
}

export interface SentimentBin {
  t_start: number;
  t_end: number;
  sentiment: "Positive" | "Neutral" | "Negative";
  confidence: number;
}

export interface QuestionnaireCoverageItem {
  topic: string;
  asked: boolean;
  evidence: string;
}

export interface ActionItem {
  item: string;
  owner: "agent" | "customer" | "unknown";
  due_hint: string | null;
}

export interface DealPrediction {
  win_probability_pct: number;
  stage:
    | "early_discovery"
    | "solution_fit"
    | "proposal"
    | "negotiation"
    | "commitment"
    | "closed_won"
    | "closed_lost"
    | "unknown";
  confidence: number;
  rationale: string;
  top_risks: string[];
  top_positive_signals: string[];
}

export interface CoachingSuggestion {
  title: string;
  why: string;
  suggested_script: string;
  priority: "high" | "medium" | "low";
}

export interface ObjectionDetectionItem {
  objection: string;
  category: "price" | "timeline" | "trust" | "competitor" | "feature_gap" | "other";
  severity: "high" | "medium" | "low";
  evidence: string;
  recommended_response: string;
}

/** Structured scores for side-by-side call comparison (aligned with coaching pillars). */
export interface ComparisonMetrics {
  /** Customer thanks / appreciation signals (1–10). */
  gratitude_score: number;
  /** Back-and-forth engagement; not dominated by one side (1–10). */
  interactivity_score: number;
  /** Strength of order, deposit, contract, or firm next-step commitment (1–10). */
  order_signal_score: number;
  /** Estimated satisfaction / positive engagement (0–100). */
  satisfaction_ratio: number;
  /** Explicit praise, success language, or positive feedback from the customer (1–10). */
  success_feedback_score: number;
  /** Discovery / needs questions quality vs silence or rushing (1–10). */
  discovery_quality_score: number;
  /** Healthy agent vs customer airtime (not one-sided); (1–10). */
  talk_time_balance_score: number;
  /** Clarity of commitments, next steps, and follow-ups (1–10). */
  follow_up_clarity_score: number;
  order_confirmation: {
    order_or_commitment_likely: boolean;
    evidence: string;
    confidence: number;
  };
  brief_notes: {
    gratitude?: string;
    interactivity?: string;
    satisfaction?: string;
    order?: string;
    success_feedback?: string;
    discovery?: string;
    follow_up?: string;
    talk_balance?: string;
  };
  /** Set when scores were inferred from legacy insights (no GPT comparison block). */
  derived_fallback?: boolean;
}

export interface CallInsights {
  call_id: string;
  summary: string;
  overall_sentiment: "Positive" | "Neutral" | "Negative";
  sentiment_timeline: SentimentBin[];
  talk_time: {
    agent_pct: number;
    customer_pct: number;
  };
  overall_call_score: number;
  agent_scores: {
    communication_clarity: number;
    politeness: number;
    business_knowledge: number;
    problem_handling: number;
    listening_ability: number;
  };
  agent_score_rationales?: Record<string, string>;
  questionnaire_coverage: QuestionnaireCoverageItem[];
  questionnaire_coverage_pct?: number;
  top_keywords: string[];
  action_items: ActionItem[];
  positive_observations: string[];
  negative_observations: string[];
  keywords_counts: Record<string, number>;
  /** Populated by analysis for compare reports; older rows may omit and use derived fallbacks. */
  comparison_metrics?: ComparisonMetrics;
  deal_prediction?: DealPrediction;
  ai_coaching_suggestions?: CoachingSuggestion[];
  objection_detection?: ObjectionDetectionItem[];
}

export interface RollupMetrics {
  total_calls: number;
  avg_call_score: number;
  top_keywords: { term: string; count: number }[];
  sentiment_split: { positive: number; neutral: number; negative: number };
  avg_call_duration_sec: number;
  action_items_total: number;
}
