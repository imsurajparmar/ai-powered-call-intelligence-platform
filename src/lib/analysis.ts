import { getModel, getOpenAI } from "@/lib/openai-client";
import { parseJsonObject } from "@/lib/json-parse";
import { KEYWORD_TAXONOMY, QUESTIONNAIRE_TOPICS } from "@/lib/questionnaire";
import type {
  CallInsights,
  CoachingSuggestion,
  ComparisonMetrics,
  DealPrediction,
  NormalizedTranscript,
  ObjectionDetectionItem,
  TranscriptSegment,
} from "@/lib/types";

const SYSTEM_PROMPT = `You are CallIntel, an expert AI for analyzing sales call transcripts.
Your goals:
- Be accurate, concise, and practical for sales coaching.
- Use only information in the transcript and provided metadata.
- If unsure, state assumptions minimally.
- Always return STRICTLY VALID JSON that conforms to the provided schema.
- Do not include any commentary outside of JSON. No markdown. No explanations.
- Keep code blocks and formatting out of the JSON.`;

async function chatJson<T>(userPrompt: string): Promise<T> {
  const openai = getOpenAI();
  const model = getModel();
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return parseJsonObject<T>(content);
}

function talkTimeFromSegments(segments: TranscriptSegment[]): {
  agent_pct: number;
  customer_pct: number;
} | null {
  let agent = 0;
  let customer = 0;
  for (const s of segments) {
    const len = Math.max(0, s.end - s.start);
    if (s.speaker === "agent") agent += len;
    else if (s.speaker === "customer") customer += len;
  }
  const total = agent + customer;
  if (total <= 0) return null;
  return {
    agent_pct: Math.round((agent / total) * 1000) / 10,
    customer_pct: Math.round((customer / total) * 1000) / 10,
  };
}

function computeOverallCallScore(input: {
  agent_scores: CallInsights["agent_scores"];
  overall_sentiment: CallInsights["overall_sentiment"];
  questionnaire_coverage_pct: number;
  talk_time: CallInsights["talk_time"];
}): number {
  const dims = input.agent_scores;
  const avgAgent =
    (dims.communication_clarity +
      dims.politeness +
      dims.business_knowledge +
      dims.problem_handling +
      dims.listening_ability) /
    5;
  const sentimentComponent =
    input.overall_sentiment === "Positive"
      ? 10
      : input.overall_sentiment === "Neutral"
        ? 6
        : 3;
  const q = Math.min(100, Math.max(0, input.questionnaire_coverage_pct));
  const ap = input.talk_time.agent_pct;
  const talkBalance = Math.max(0, 10 - Math.abs(ap - 50) / 5);
  const overall =
    0.55 * avgAgent +
    0.15 * sentimentComponent +
    0.2 * (q / 10) +
    0.1 * talkBalance;
  return Math.round(overall * 10) / 10;
}

function clampInt(n: number, lo: number, hi: number): number {
  const x = Math.round(Number.isFinite(n) ? n : lo);
  return Math.min(hi, Math.max(lo, x));
}

function normalizeComparisonMetrics(
  raw: Partial<ComparisonMetrics> & {
    gratitude_score?: number;
    interactivity_score?: number;
    order_signal_score?: number;
    satisfaction_ratio?: number;
    success_feedback_score?: number;
    discovery_quality_score?: number;
    talk_time_balance_score?: number;
    follow_up_clarity_score?: number;
    order_confirmation?: ComparisonMetrics["order_confirmation"];
    brief_notes?: ComparisonMetrics["brief_notes"];
  },
): ComparisonMetrics {
  const oc = raw.order_confirmation;
  return {
    gratitude_score: clampInt(raw.gratitude_score ?? 5, 1, 10),
    interactivity_score: clampInt(raw.interactivity_score ?? 5, 1, 10),
    order_signal_score: clampInt(raw.order_signal_score ?? 5, 1, 10),
    satisfaction_ratio: clampInt(raw.satisfaction_ratio ?? 50, 0, 100),
    success_feedback_score: clampInt(raw.success_feedback_score ?? 5, 1, 10),
    discovery_quality_score: clampInt(raw.discovery_quality_score ?? 5, 1, 10),
    talk_time_balance_score: clampInt(raw.talk_time_balance_score ?? 5, 1, 10),
    follow_up_clarity_score: clampInt(raw.follow_up_clarity_score ?? 5, 1, 10),
    order_confirmation: {
      order_or_commitment_likely: Boolean(oc?.order_or_commitment_likely),
      evidence: typeof oc?.evidence === "string" ? oc.evidence : "",
      confidence: Math.min(1, Math.max(0, Number(oc?.confidence) || 0)),
    },
    brief_notes:
      raw.brief_notes && typeof raw.brief_notes === "object"
        ? raw.brief_notes
        : {},
  };
}

function normalizeDealPrediction(raw: Partial<DealPrediction>): DealPrediction {
  const stage = raw.stage ?? "unknown";
  const validStage: DealPrediction["stage"][] = [
    "early_discovery",
    "solution_fit",
    "proposal",
    "negotiation",
    "commitment",
    "closed_won",
    "closed_lost",
    "unknown",
  ];
  return {
    win_probability_pct: clampInt(raw.win_probability_pct ?? 50, 0, 100),
    stage: validStage.includes(stage) ? stage : "unknown",
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    top_risks: Array.isArray(raw.top_risks) ? raw.top_risks.slice(0, 5).map(String) : [],
    top_positive_signals: Array.isArray(raw.top_positive_signals)
      ? raw.top_positive_signals.slice(0, 5).map(String)
      : [],
  };
}

function normalizeCoachingSuggestions(raw: unknown): CoachingSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((x) => {
    const row = (x ?? {}) as Partial<CoachingSuggestion>;
    const priority: CoachingSuggestion["priority"] =
      row.priority === "high" || row.priority === "medium" || row.priority === "low"
        ? row.priority
        : "medium";
    return {
      title: typeof row.title === "string" ? row.title : "Coaching suggestion",
      why: typeof row.why === "string" ? row.why : "",
      suggested_script:
        typeof row.suggested_script === "string" ? row.suggested_script : "",
      priority,
    };
  });
}

function normalizeObjectionDetection(raw: unknown): ObjectionDetectionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 10).map((x) => {
    const row = (x ?? {}) as Partial<ObjectionDetectionItem>;
    const category: ObjectionDetectionItem["category"] =
      row.category === "price" ||
      row.category === "timeline" ||
      row.category === "trust" ||
      row.category === "competitor" ||
      row.category === "feature_gap" ||
      row.category === "other"
        ? row.category
        : "other";
    const severity: ObjectionDetectionItem["severity"] =
      row.severity === "high" || row.severity === "medium" || row.severity === "low"
        ? row.severity
        : "medium";
    return {
      objection: typeof row.objection === "string" ? row.objection : "Objection detected",
      category,
      severity,
      evidence: typeof row.evidence === "string" ? row.evidence : "",
      recommended_response:
        typeof row.recommended_response === "string" ? row.recommended_response : "",
    };
  });
}

export async function runAnalysis(
  callId: string,
  transcript: NormalizedTranscript,
): Promise<CallInsights> {
  const segmentsJson = JSON.stringify(transcript.segments);
  const language = transcript.language || "en-US";
  const binSeconds = 60;

  const p1 = chatJson<{
    summary: string;
    overall_sentiment: CallInsights["overall_sentiment"];
    sentiment_timeline: CallInsights["sentiment_timeline"];
  }>(`You are given a sales call transcript with timestamps and optional speaker labels.

INPUT:
- transcript_segments: ${segmentsJson}
- call_language: ${language}
- bin_seconds: ${binSeconds}
- sentiment_labels: ["Positive","Neutral","Negative"]

TASKS:
1) Call Summary (3–5 sentences): purpose, main topics, outcome.
2) Overall Sentiment: one of sentiment_labels.
3) Sentiment Timeline: Segment the call into bins of length bin_seconds and classify each bin with a sentiment and confidence [0,1]. Base it on utterances whose midpoints fall within the bin.

OUTPUT JSON SCHEMA:
{
  "summary": "string",
  "overall_sentiment": "Positive|Neutral|Negative",
  "sentiment_timeline": [
    { "t_start": 0, "t_end": 60, "sentiment": "Neutral", "confidence": 0.73 }
  ]
}

CONSTRAINTS:
- Use only the transcript content.
- If bins are empty, skip them.
- Return JSON only.`);

  const p3 = chatJson<{
    agent_scores: CallInsights["agent_scores"];
    rationales: Record<string, string>;
  }>(`You are scoring the sales representative across five dimensions using the transcript. Use behavioral evidence from the dialogue.

INPUT:
- transcript_segments: ${segmentsJson}
- scoring_rubric:
  {
    "communication_clarity": "Clarity and concision of explanations.",
    "politeness": "Respectful, empathetic tone.",
    "business_knowledge": "Product/industry knowledge accuracy.",
    "problem_handling": "Handling objections and issues.",
    "listening_ability": "Gives space, acknowledges, reflective responses."
  }

TASK:
- Provide integer scores 1–10 for each dimension.
- Provide a brief 1–2 sentence rationale per dimension, referencing observed behavior.

OUTPUT JSON SCHEMA:
{
  "agent_scores": {
    "communication_clarity": 0,
    "politeness": 0,
    "business_knowledge": 0,
    "problem_handling": 0,
    "listening_ability": 0
  },
  "rationales": {
    "communication_clarity": "string",
    "politeness": "string",
    "business_knowledge": "string",
    "problem_handling": "string",
    "listening_ability": "string"
  }
}

SCORING ANCHORS:
- 9–10: Consistently excellent; rare minor lapses.
- 7–8: Solid; a few clear improvement areas.
- 5–6: Mixed; some strengths but noticeable issues.
- 3–4: Weak; frequent problems harm the conversation.
- 1–2: Very poor; fails to meet expectations.

CONSTRAINTS:
- Use only transcript evidence. Return JSON only.`);

  const topicsList = JSON.stringify([...QUESTIONNAIRE_TOPICS]);
  const p4 = chatJson<{
    questionnaire_coverage: CallInsights["questionnaire_coverage"];
    coverage_pct: number;
  }>(`Determine which discovery questions were asked or substantively addressed during the call.

INPUT:
- transcript_segments: ${segmentsJson}
- questionnaire_topics: ${topicsList}

TASK:
For each topic, mark asked = true/false and include the best short evidence quote or paraphrase if asked.

OUTPUT JSON SCHEMA:
{
  "questionnaire_coverage": [
    { "topic": "string", "asked": true, "evidence": "…" }
  ],
  "coverage_pct": 0.0
}

CONSTRAINTS:
- Be conservative; mark false if ambiguous.
- coverage_pct = (count of asked=true) / total topics * 100.
- Return JSON only.`);

  const maxTerms = 10;
  const taxonomy = JSON.stringify([...KEYWORD_TAXONOMY]);
  const p5 = chatJson<{
    top_keywords: string[];
    keywords_counts: Record<string, number>;
  }>(`Extract prominent keywords/topics from the transcript.

INPUT:
- transcript_segments: ${segmentsJson}
- max_terms: ${maxTerms}
- optional_taxonomy: ${taxonomy}

TASK:
1) Return top keywords from the transcript, prioritizing items in optional_taxonomy if present.
2) Include counts (mentions) estimated by phrase occurrence.
3) Keep terms concise (1–3 words).

OUTPUT JSON SCHEMA:
{
  "top_keywords": ["string"],
  "keywords_counts": { "Budget": 4, "Warranty": 2 }
}

CONSTRAINTS:
- If taxonomy terms are not present, include discovered terms.
- Return JSON only.`);

  const p6 = chatJson<{ action_items: CallInsights["action_items"] }>(
    `Identify follow-up action items and commitments from the conversation.

INPUT:
- transcript_segments: ${segmentsJson}

TASK:
Extract concrete action items with owner and any due_hint if mentioned.

OUTPUT JSON SCHEMA:
{
  "action_items": [
    { "item": "string", "owner": "agent|customer|unknown", "due_hint": "string|null" }
  ]
}

CONSTRAINTS:
- Only include actionable, specific items.
- Return JSON only.`,
  );

  const p7 = chatJson<{
    positive_observations: string[];
    negative_observations: string[];
  }>(`Provide concise behavioral observations for coaching.

INPUT:
- transcript_segments: ${segmentsJson}

TASK:
Produce a short list of positive and negative observations (phrased as neutral, factual statements).

OUTPUT JSON SCHEMA:
{
  "positive_observations": ["string"],
  "negative_observations": ["string"]
}

CONSTRAINTS:
- 2–4 items each.
- Return JSON only.`);

  const p8 = chatJson<Partial<ComparisonMetrics> & { order_confirmation?: ComparisonMetrics["order_confirmation"] }>(
    `You analyze sales call transcripts for coaching and benchmarking across calls.

INPUT:
- transcript_segments: ${segmentsJson}

SCORES (use transcript evidence only):
1) gratitude_score (1–10): customer thanks, appreciation, warmth toward the rep.
2) interactivity_score (1–10): dialogue engagement; neither party dominates inappropriately.
3) order_signal_score (1–10): strength of order, deposit, contract, purchase intent, or firm commitment.
4) satisfaction_ratio (0–100): overall perceived customer satisfaction during the call.
5) success_feedback_score (1–10): explicit praise, positive outcomes, strong agreement from the customer.
6) discovery_quality_score (1–10): rep explores needs / situation vs rushing the pitch.
7) talk_time_balance_score (1–10): healthy back-and-forth for a discovery/sales call (not a one-sided monologue).
8) follow_up_clarity_score (1–10): clear next steps, owners, timelines, deliverables.

Also set order_confirmation: { "order_or_commitment_likely": boolean, "evidence": "short quote or paraphrase", "confidence": 0.0–1.0 }.

Optional brief_notes keys: gratitude, interactivity, satisfaction, order, success_feedback, discovery, follow_up, talk_balance — each a short string if helpful.

OUTPUT JSON SCHEMA:
{
  "gratitude_score": 0,
  "interactivity_score": 0,
  "order_signal_score": 0,
  "satisfaction_ratio": 0,
  "success_feedback_score": 0,
  "discovery_quality_score": 0,
  "talk_time_balance_score": 0,
  "follow_up_clarity_score": 0,
  "order_confirmation": { "order_or_commitment_likely": false, "evidence": "", "confidence": 0.0 },
  "brief_notes": {}
}

CONSTRAINTS:
- Integer scores in ranges above. Return JSON only.`,
  );

  const p9 = chatJson<{
    deal_prediction: Partial<DealPrediction>;
    ai_coaching_suggestions: CoachingSuggestion[];
    objection_detection: ObjectionDetectionItem[];
  }>(`Analyze this sales call for close likelihood, coaching opportunities, and objections.

INPUT:
- transcript_segments: ${segmentsJson}

TASKS:
1) Deal Prediction:
   - win_probability_pct (0-100)
   - stage: one of ["early_discovery","solution_fit","proposal","negotiation","commitment","closed_won","closed_lost","unknown"]
   - confidence (0-1)
   - rationale (1-3 sentences)
   - top_risks (max 5)
   - top_positive_signals (max 5)

2) AI Coaching Suggestions:
   - 3-5 concise items with:
     - title
     - why
     - suggested_script (what the rep can say next time)
     - priority: high|medium|low

3) Objection Detection + Response:
   - detect explicit or implicit objections and return:
     - objection
     - category: price|timeline|trust|competitor|feature_gap|other
     - severity: high|medium|low
     - evidence (brief quote/paraphrase)
     - recommended_response (concise response strategy/script)

OUTPUT JSON SCHEMA:
{
  "deal_prediction": {
    "win_probability_pct": 0,
    "stage": "unknown",
    "confidence": 0.0,
    "rationale": "string",
    "top_risks": ["string"],
    "top_positive_signals": ["string"]
  },
  "ai_coaching_suggestions": [
    { "title": "string", "why": "string", "suggested_script": "string", "priority": "high|medium|low" }
  ],
  "objection_detection": [
    {
      "objection": "string",
      "category": "price|timeline|trust|competitor|feature_gap|other",
      "severity": "high|medium|low",
      "evidence": "string",
      "recommended_response": "string"
    }
  ]
}

CONSTRAINTS:
- Use only transcript evidence.
- If no objections are found, return an empty objection_detection array.
- Return JSON only.`);

  const [r1, r3, r4, r5, r6, r7, r8, r9] = await Promise.all([
    p1,
    p3,
    p4,
    p5,
    p6,
    p7,
    p8,
    p9,
  ]);

  let talk_time = talkTimeFromSegments(transcript.segments);
  if (!talk_time) {
    const p2 = await chatJson<{
      talk_time: {
        agent_seconds: number;
        customer_seconds: number;
        agent_pct: number;
        customer_pct: number;
      };
    }>(`You are given transcript segments with start,end,speaker,text.

INPUT:
- transcript_segments: ${segmentsJson}
- speakers_of_interest: ["agent","customer"]

TASK:
Estimate total speech duration per role. If speakers are unknown, infer agent vs customer from dialogue roles (sales rep vs buyer) and approximate seconds per side, then compute agent_pct and customer_pct summing to ~100.

OUTPUT JSON SCHEMA:
{
  "talk_time": {
    "agent_seconds": 0,
    "customer_seconds": 0,
    "agent_pct": 0.0,
    "customer_pct": 0.0
  }
}

CONSTRAINTS:
- Percentages must sum to ~100.
- Return JSON only.`);
    talk_time = {
      agent_pct: p2.talk_time.agent_pct,
      customer_pct: p2.talk_time.customer_pct,
    };
  }

  const coveragePct =
    typeof r4.coverage_pct === "number"
      ? r4.coverage_pct
      : (r4.questionnaire_coverage.filter((x) => x.asked).length /
          QUESTIONNAIRE_TOPICS.length) *
        100;

  const overall_call_score = computeOverallCallScore({
    agent_scores: r3.agent_scores,
    overall_sentiment: r1.overall_sentiment,
    questionnaire_coverage_pct: coveragePct,
    talk_time,
  });

  const comparison_metrics = normalizeComparisonMetrics(r8);
  const deal_prediction = normalizeDealPrediction(r9.deal_prediction ?? {});
  const ai_coaching_suggestions = normalizeCoachingSuggestions(r9.ai_coaching_suggestions);
  const objection_detection = normalizeObjectionDetection(r9.objection_detection);

  return {
    call_id: callId,
    summary: r1.summary,
    overall_sentiment: r1.overall_sentiment,
    sentiment_timeline: r1.sentiment_timeline ?? [],
    talk_time,
    overall_call_score,
    agent_scores: r3.agent_scores,
    agent_score_rationales: r3.rationales,
    questionnaire_coverage: r4.questionnaire_coverage,
    questionnaire_coverage_pct: Math.round(coveragePct * 10) / 10,
    top_keywords: r5.top_keywords ?? [],
    action_items: r6.action_items ?? [],
    positive_observations: r7.positive_observations ?? [],
    negative_observations: r7.negative_observations ?? [],
    keywords_counts: r5.keywords_counts ?? {},
    comparison_metrics,
    deal_prediction,
    ai_coaching_suggestions,
    objection_detection,
  };
}
