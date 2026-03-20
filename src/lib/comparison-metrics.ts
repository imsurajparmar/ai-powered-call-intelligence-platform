import type { CallInsights, ComparisonMetrics } from "@/lib/types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Approximate comparison metrics when `comparison_metrics` was not stored (pre-upgrade analyses).
 * New analyses run the full GPT comparison block instead.
 */
export function deriveComparisonMetrics(ins: CallInsights): ComparisonMetrics {
  const cust = ins.talk_time.customer_pct;
  const balance = clamp(10 - Math.abs(50 - cust) / 5, 1, 10);
  const sat =
    ins.overall_sentiment === "Positive"
      ? 82
      : ins.overall_sentiment === "Neutral"
        ? 48
        : 22;
  const qDisc = clamp((ins.questionnaire_coverage_pct ?? 0) / 10, 1, 10);
  const nActions = ins.action_items?.length ?? 0;
  const follow = clamp(nActions * 2, 1, 10);
  const gratitude = round1(
    (ins.agent_scores.politeness + ins.agent_scores.listening_ability) / 2,
  );
  const successFb = clamp(
    4 + (ins.positive_observations?.length ?? 0) * 1.5,
    1,
    10,
  );
  const orderHint = /\b(order|deposit|contract|sign|purchase|close|commit|invoice)\b/i.test(
    ins.summary,
  );
  const orderSignal = orderHint ? 6.5 : 3.5;

  return {
    gratitude_score: Math.round(gratitude),
    interactivity_score: Math.round(balance),
    order_signal_score: Math.round(orderSignal),
    satisfaction_ratio: Math.round(sat),
    success_feedback_score: Math.round(successFb),
    discovery_quality_score: Math.round(qDisc),
    talk_time_balance_score: Math.round(balance),
    follow_up_clarity_score: Math.round(follow),
    order_confirmation: {
      order_or_commitment_likely: orderHint,
      evidence: orderHint
        ? "Keyword signal in summary (re-analyze for full AI assessment)."
        : "No strong order/commitment signal in summary (re-analyze for detail).",
      confidence: orderHint ? 0.45 : 0.2,
    },
    brief_notes: {
      gratitude: "Estimated from politeness + listening scores.",
      interactivity: "Estimated from agent vs customer talk-time balance.",
      satisfaction: "Estimated from overall sentiment.",
      order: "Heuristic on summary text; re-run analysis for model-based scores.",
      discovery: "Estimated from questionnaire coverage %.",
      follow_up: "Estimated from number of action items detected.",
      talk_balance: "Closer to 50/50 talk share scores higher (discovery-style calls).",
    },
    derived_fallback: true,
  };
}

export function getEffectiveComparisonMetrics(ins: CallInsights): ComparisonMetrics {
  if (ins.comparison_metrics) return ins.comparison_metrics;
  return deriveComparisonMetrics(ins);
}
