import { PrismaClient } from "@prisma/client";
import { QUESTIONNAIRE_TOPICS } from "../src/lib/questionnaire";

const prisma = new PrismaClient();

const demoTranscript = (callId: string) =>
  JSON.stringify({
    call_id: callId,
    language: "en-US",
    duration_seconds: 420,
    segments: [
      {
        start: 0,
        end: 18,
        speaker: "agent",
        text: "Thanks for joining today — I wanted to walk through your kitchen goals and see if a full remodel or cabinet replacement fits best.",
      },
      {
        start: 18,
        end: 42,
        speaker: "customer",
        text: "We're leaning toward replacing cabinets only, but the layout might change slightly. Budget is roughly fifteen to twenty thousand.",
      },
      {
        start: 42,
        end: 72,
        speaker: "agent",
        text: "Great. Do you prefer Shaker style, and are you comparing quotes from other companies? I can help review competitor materials and timelines.",
      },
      {
        start: 72,
        end: 105,
        speaker: "customer",
        text: "Shaker in white. We have one other quote with particle board boxes — I'm worried about warranty and installation timing.",
      },
      {
        start: 105,
        end: 140,
        speaker: "agent",
        text: "I'll send an updated quote with plywood construction and soft-close drawers. Let's schedule a design consultation this week to finalize.",
      },
    ],
  });

function coverageTemplate() {
  return QUESTIONNAIRE_TOPICS.map((topic, i) => ({
    topic,
    asked: i % 2 === 0 || i < 8,
    evidence: i % 2 === 0 ? "Discussed during call regarding scope and preferences." : "",
  }));
}

const demoComparisonMetrics = (variant: "strong" | "weaker") =>
  variant === "strong"
    ? {
        gratitude_score: 8,
        interactivity_score: 8,
        order_signal_score: 7,
        satisfaction_ratio: 78,
        success_feedback_score: 8,
        discovery_quality_score: 8,
        talk_time_balance_score: 8,
        follow_up_clarity_score: 8,
        order_confirmation: {
          order_or_commitment_likely: true,
          evidence: "Agent committed to updated quote and scheduled design consultation.",
          confidence: 0.72,
        },
        brief_notes: {
          discovery: "Covered scope, materials, competitor comparison, and next steps.",
        },
      }
    : {
        gratitude_score: 6,
        interactivity_score: 6,
        order_signal_score: 4,
        satisfaction_ratio: 52,
        success_feedback_score: 5,
        discovery_quality_score: 6,
        talk_time_balance_score: 6,
        follow_up_clarity_score: 5,
        order_confirmation: {
          order_or_commitment_likely: false,
          evidence: "No firm order or deposit; customer still comparing.",
          confidence: 0.38,
        },
        brief_notes: {
          discovery: "Thinner discovery vs. stronger call; less clarity on next steps.",
        },
      };

const demoInsights = (callId: string) =>
  JSON.stringify({
    call_id: callId,
    summary:
      "Discovery-focused kitchen cabinet call: customer wants Shaker white cabinets, partial layout change, and mid-range budget. Agent addressed competitor materials and proposed upgraded construction with follow-up quote and design consult.",
    overall_sentiment: "Positive",
    sentiment_timeline: [
      { t_start: 0, t_end: 120, sentiment: "Neutral", confidence: 0.7 },
      { t_start: 120, t_end: 240, sentiment: "Positive", confidence: 0.78 },
      { t_start: 240, t_end: 420, sentiment: "Positive", confidence: 0.72 },
    ],
    talk_time: { agent_pct: 55, customer_pct: 45 },
    overall_call_score: 7.8,
    agent_scores: {
      communication_clarity: 8,
      politeness: 8,
      business_knowledge: 8,
      problem_handling: 7,
      listening_ability: 7,
    },
    agent_score_rationales: {
      communication_clarity: "Explained options clearly and tied them to customer concerns.",
      politeness: "Warm, collaborative tone throughout.",
      business_knowledge: "Accurate on materials, warranty, and competitor comparison framing.",
      problem_handling: "Addressed timeline and material worries with a concrete plan.",
      listening_ability: "Reflected budget and style preferences before proposing next steps.",
    },
    questionnaire_coverage: coverageTemplate(),
    questionnaire_coverage_pct: 56,
    top_keywords: ["Budget", "Cabinet Style", "Warranty", "Installation", "Competitor"],
    action_items: [
      {
        item: "Send updated quote with plywood boxes and soft-close drawers",
        owner: "agent",
        due_hint: "within 2 days",
      },
      {
        item: "Review competitor quote together",
        owner: "agent",
        due_hint: "before consultation",
      },
    ],
    positive_observations: [
      "Structured discovery across scope, style, and budget.",
      "Proactively offered help comparing competitor materials.",
    ],
    negative_observations: [
      "Could confirm exact installation window earlier in the call.",
      "Missed explicit ask about rental vs primary home.",
    ],
    keywords_counts: {
      Budget: 3,
      Warranty: 2,
      Installation: 2,
      Competitor: 2,
    },
    comparison_metrics: demoComparisonMetrics("strong"),
  });

async function main() {
  const id1 = "00000000-0000-4000-8000-000000000001";
  const id2 = "00000000-0000-4000-8000-000000000002";

  await prisma.call.upsert({
    where: { id: id1 },
    create: {
      id: id1,
      originalFilename: "demo-call-kitchen-1.webm",
      audioPath: "",
      durationSeconds: 420,
      language: "en-US",
      status: "analyzed",
      transcript: demoTranscript(id1),
      insights: demoInsights(id1),
    },
    update: {
      transcript: demoTranscript(id1),
      insights: demoInsights(id1),
      status: "analyzed",
      durationSeconds: 420,
    },
  });

  const t2 = JSON.parse(demoTranscript(id2)) as {
    duration_seconds: number;
    segments: { start: number; end: number; speaker: string; text: string }[];
  };
  t2.call_id = id2;
  t2.duration_seconds = 300;
  t2.segments = t2.segments.map((s) => ({
    ...s,
    text: s.text.replace("fifteen to twenty", "twelve to eighteen"),
  }));

  const ins2 = JSON.parse(demoInsights(id2));
  ins2.call_id = id2;
  ins2.overall_sentiment = "Neutral";
  ins2.overall_call_score = 6.9;
  ins2.summary =
    "Shorter follow-up: customer still comparing quotes; agent reinforced value props but discovery was thinner.";
  ins2.comparison_metrics = demoComparisonMetrics("weaker");

  await prisma.call.upsert({
    where: { id: id2 },
    create: {
      id: id2,
      originalFilename: "demo-call-kitchen-2.webm",
      audioPath: "",
      durationSeconds: 300,
      language: "en-US",
      status: "analyzed",
      transcript: JSON.stringify(t2),
      insights: JSON.stringify(ins2),
    },
    update: {
      transcript: JSON.stringify(t2),
      insights: JSON.stringify(ins2),
      status: "analyzed",
      durationSeconds: 300,
    },
  });

  console.log("Seeded demo calls:", id1, id2);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
