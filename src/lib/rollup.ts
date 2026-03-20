import type { CallInsights, RollupMetrics } from "@/lib/types";

export function computeRollup(
  items: {
    duration_seconds: number;
    insights: CallInsights;
  }[],
): RollupMetrics {
  if (items.length === 0) {
    return {
      total_calls: 0,
      avg_call_score: 0,
      top_keywords: [],
      sentiment_split: { positive: 0, neutral: 0, negative: 0 },
      avg_call_duration_sec: 0,
      action_items_total: 0,
    };
  }

  let scoreSum = 0;
  let durSum = 0;
  let actionTotal = 0;
  const sentiment_split = { positive: 0, neutral: 0, negative: 0 };
  const kwMap = new Map<string, number>();

  for (const row of items) {
    const ins = row.insights;
    scoreSum += ins.overall_call_score ?? 0;
    durSum += row.duration_seconds || 0;
    actionTotal += ins.action_items?.length ?? 0;
    const s = ins.overall_sentiment?.toLowerCase();
    if (s === "positive") sentiment_split.positive += 1;
    else if (s === "negative") sentiment_split.negative += 1;
    else sentiment_split.neutral += 1;

    for (const k of ins.top_keywords ?? []) {
      const key = k.trim();
      if (!key) continue;
      kwMap.set(key, (kwMap.get(key) ?? 0) + 1);
    }
    const counts = ins.keywords_counts ?? {};
    for (const [k, v] of Object.entries(counts)) {
      if (typeof v === "number" && v > 0) {
        kwMap.set(k, (kwMap.get(k) ?? 0) + v);
      }
    }
  }

  const top_keywords = [...kwMap.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    total_calls: items.length,
    avg_call_score: Math.round((scoreSum / items.length) * 10) / 10,
    top_keywords,
    sentiment_split,
    avg_call_duration_sec: Math.round(durSum / items.length),
    action_items_total: actionTotal,
  };
}
