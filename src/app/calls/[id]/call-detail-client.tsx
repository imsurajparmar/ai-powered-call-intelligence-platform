"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEffectiveComparisonMetrics } from "@/lib/comparison-metrics";
import type { CallInsights, NormalizedTranscript } from "@/lib/types";

type Payload = {
  id: string;
  createdAt: string;
  originalFilename: string | null;
  status: string;
  durationSeconds: number | null;
  language: string | null;
  audioUrl: string | null;
  transcript: NormalizedTranscript | null;
  insights: CallInsights | null;
};

export function CallDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetch(`/api/calls/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setData(j as Payload);
      })
      .catch(() => setErr("Failed to load"));
  }, [id]);

  async function deleteCall() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (err) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{err}</p>
        <Link href="/dashboard">
          <Button variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const ins = data.insights;
  const cmp = ins ? getEffectiveComparisonMetrics(ins) : null;
  const radarData = ins
    ? [
        { dim: "Clarity", value: ins.agent_scores.communication_clarity },
        { dim: "Politeness", value: ins.agent_scores.politeness },
        { dim: "Knowledge", value: ins.agent_scores.business_knowledge },
        { dim: "Problems", value: ins.agent_scores.problem_handling },
        { dim: "Listening", value: ins.agent_scores.listening_ability },
      ]
    : [];

  return (
    <div className="space-y-8">
      <ConfirmDialog
        open={showDelete}
        title="Delete this recording?"
        description="Removes audio, transcript, and all insights for this call from the database and disk. This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete permanently"}
        cancelLabel="Cancel"
        variant="danger"
        pending={deleting}
        onCancel={() => setShowDelete(false)}
        onConfirm={() => void deleteCall()}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">
            Call workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.originalFilename ?? data.id} ·{" "}
            <span className="capitalize">{data.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Main dashboard</Button>
          </Link>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete recording
          </Button>
        </div>
      </div>

      {data.audioUrl && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full max-w-xl" src={data.audioUrl}>
              Audio not supported
            </audio>
          </CardContent>
        </Card>
      )}

      {!ins && (
        <Card className="border-border bg-card/40">
          <CardContent className="py-8 text-center text-muted-foreground">
            No insights yet. Transcribe and analyze from the main dashboard, or run seed data.
          </CardContent>
        </Card>
      )}

      {ins && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  Overall sentiment:{" "}
                  <span className="text-foreground">{ins.overall_sentiment}</span> ·
                  Score:{" "}
                  <span className="text-foreground">
                    {ins.overall_call_score.toFixed(1)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{ins.summary}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Talk time</CardTitle>
                <CardDescription>Agent vs customer (by labeled segments)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-8 overflow-hidden rounded-lg bg-muted">
                  <div
                    className="bg-cyan-500"
                    style={{ width: `${ins.talk_time.agent_pct}%` }}
                    title={`Agent ${ins.talk_time.agent_pct}%`}
                  />
                  <div
                    className="bg-fuchsia-600"
                    style={{ width: `${ins.talk_time.customer_pct}%` }}
                    title={`Customer ${ins.talk_time.customer_pct}%`}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Agent {ins.talk_time.agent_pct}% · Customer {ins.talk_time.customer_pct}%
                </p>
              </CardContent>
            </Card>
          </div>

          {cmp && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Comparison-ready metrics</CardTitle>
                <CardDescription>
                  Same scores used on the{" "}
                  <Link href="/compare" className="font-medium text-primary hover:underline">
                    Compare
                  </Link>{" "}
                  report (gratitude, interactivity, order signal, satisfaction, and coaching pillars).
                  {cmp.derived_fallback && (
                    <span className="mt-1 block text-amber-800 dark:text-amber-200">
                      Estimated from existing insights — re-run analysis to refresh model-based scores.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Gratitude", String(cmp.gratitude_score)],
                    ["Interactivity", String(cmp.interactivity_score)],
                    ["Order signal", String(cmp.order_signal_score)],
                    ["Satisfaction", `${Math.round(cmp.satisfaction_ratio)}%`],
                    ["Success feedback", String(cmp.success_feedback_score)],
                    ["Discovery", String(cmp.discovery_quality_score)],
                    ["Talk balance", String(cmp.talk_time_balance_score)],
                    ["Follow-up", String(cmp.follow_up_clarity_score)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="font-semibold tabular-nums text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Order / commitment
                  </p>
                  <p className="mt-1">
                    {cmp.order_confirmation.order_or_commitment_likely ? "Likely" : "Unclear"} ·
                    confidence {(cmp.order_confirmation.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="mt-1 text-muted-foreground">{cmp.order_confirmation.evidence || "—"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {ins.deal_prediction && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Deal prediction</CardTitle>
                <CardDescription>
                  Win probability {ins.deal_prediction.win_probability_pct}% · stage{" "}
                  <span className="capitalize">
                    {ins.deal_prediction.stage.replaceAll("_", " ")}
                  </span>{" "}
                  · confidence {(ins.deal_prediction.confidence * 100).toFixed(0)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">{ins.deal_prediction.rationale}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Positive signals
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {ins.deal_prediction.top_positive_signals.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Top risks</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {ins.deal_prediction.top_risks.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>AI coaching suggestions</CardTitle>
              <CardDescription>Targeted guidance for next calls</CardDescription>
            </CardHeader>
            <CardContent>
              {(ins.ai_coaching_suggestions?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {ins.ai_coaching_suggestions?.map((s, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">
                        {s.title}{" "}
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs uppercase text-muted-foreground">
                          {s.priority}
                        </span>
                      </p>
                      <p className="mt-1 text-muted-foreground">{s.why}</p>
                      <p className="mt-2 rounded border border-border/80 bg-background/70 p-2 text-xs">
                        {s.suggested_script}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not available for this call yet. Re-run analysis to generate coaching suggestions.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Objection detection + response</CardTitle>
              <CardDescription>Detected objections with recommended handling</CardDescription>
            </CardHeader>
            <CardContent>
              {(ins.objection_detection?.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  {ins.objection_detection?.map((o, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">{o.objection}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.category} · severity {o.severity}
                      </p>
                      <p className="mt-2 text-muted-foreground">Evidence: {o.evidence || "—"}</p>
                      <p className="mt-2 rounded border border-border/80 bg-background/70 p-2">
                        Recommended response: {o.recommended_response || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No clear objections detected in this call.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Agent performance</CardTitle>
              <CardDescription>1–10 across five dimensions</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="hsl(172 38% 32%)"
                    fill="hsl(172 38% 32%)"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
            {ins.agent_score_rationales && (
              <CardContent className="border-t border-border pt-4">
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {Object.entries(ins.agent_score_rationales).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-medium text-foreground">{k}:</span> {v}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Questionnaire coverage</CardTitle>
              <CardDescription>
                Sales question library — {ins.questionnaire_coverage_pct?.toFixed(0) ?? "—"}%
                covered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-2">Topic</th>
                      <th className="py-2 pr-2">Asked</th>
                      <th className="py-2">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ins.questionnaire_coverage.map((row) => (
                      <tr key={row.topic} className="border-b border-border/50">
                        <td className="py-2 pr-2 align-top">{row.topic}</td>
                        <td className="py-2 pr-2 align-top">{row.asked ? "Yes" : "No"}</td>
                        <td className="py-2 align-top text-muted-foreground">
                          {row.evidence || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Keywords</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ins.top_keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-muted px-3 py-1 text-xs"
                  >
                    {k}
                    {ins.keywords_counts[k] != null ? ` (${ins.keywords_counts[k]})` : ""}
                  </span>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Action items</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-2 text-sm">
                  {ins.action_items.map((a, i) => (
                    <li key={i}>
                      {a.item}{" "}
                      <span className="text-muted-foreground">
                        ({a.owner}
                        {a.due_hint ? ` · ${a.due_hint}` : ""})
                      </span>
                    </li>
                  ))}
                </ul>
                {ins.action_items.length === 0 && (
                  <p className="text-sm text-muted-foreground">None detected.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Positive observations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {ins.positive_observations.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Coaching opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {ins.negative_observations.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Sentiment timeline</CardTitle>
              <CardDescription>~60s bins from analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ins.sentiment_timeline.map((b, i) => (
                  <span
                    key={i}
                    className="rounded border border-border px-2 py-1 text-xs"
                    title={`${b.t_start}s–${b.t_end}s · ${(b.confidence * 100).toFixed(0)}%`}
                  >
                    {b.t_start}s–{b.t_end}s: {b.sentiment}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {data.transcript && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>
              {data.transcript.segments.length} segments · {data.transcript.duration_seconds}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-4 text-sm">
              {data.transcript.segments.map((s, i) => (
                <p key={i}>
                  <span className="text-muted-foreground">
                    [{s.start.toFixed(1)}–{s.end.toFixed(1)}] {s.speaker}:
                  </span>{" "}
                  {s.text}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
