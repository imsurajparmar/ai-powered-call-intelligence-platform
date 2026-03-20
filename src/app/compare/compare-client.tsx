"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, GitCompare, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ComparisonMetrics } from "@/lib/types";

const CHART_COLORS = [
  "hsl(172 38% 38%)",
  "hsl(262 45% 45%)",
  "hsl(32 90% 42%)",
  "hsl(200 70% 42%)",
];

const PROBLEM_PILLARS = [
  {
    title: "Discovery quality",
    q: "Did the representative ask the right discovery questions to understand the customer's needs?",
  },
  {
    title: "Talk time balance",
    q: "How much did the customer vs. the agent speak? Was the rep listening or dominating?",
  },
  {
    title: "Customer sentiment",
    q: "Was the customer satisfied, frustrated, or disengaged throughout the conversation?",
  },
  {
    title: "Follow-up clarity",
    q: "What commitments, next steps, or action items were discussed and agreed upon?",
  },
] as const;

type CallListRow = {
  id: string;
  createdAt: string;
  originalFilename: string | null;
  status: string;
  overall_call_score: number | null;
  overall_sentiment: string | null;
};

type CompareRow = {
  id: string;
  label: string;
  status: string;
  ready: boolean;
  reason: string | null;
  comparison: ComparisonMetrics | null;
  overall_call_score: number | null;
  overall_sentiment: string | null;
  summary: string | null;
  derived_fallback?: boolean;
};

function normForChart(m: ComparisonMetrics, key: keyof ComparisonMetrics): number {
  if (key === "satisfaction_ratio") {
    return Math.round((m.satisfaction_ratio / 10) * 10) / 10;
  }
  const v = m[key];
  return typeof v === "number" ? v : 0;
}

const METRIC_CHART_KEYS: { key: keyof ComparisonMetrics; label: string }[] = [
  { key: "gratitude_score", label: "Gratitude" },
  { key: "interactivity_score", label: "Interactivity" },
  { key: "order_signal_score", label: "Order signal" },
  { key: "success_feedback_score", label: "Success feedback" },
  { key: "discovery_quality_score", label: "Discovery" },
  { key: "talk_time_balance_score", label: "Talk balance" },
  { key: "follow_up_clarity_score", label: "Follow-up" },
  { key: "satisfaction_ratio", label: "Satisfaction (÷10)" },
];

function formatMetric(key: keyof ComparisonMetrics, m: ComparisonMetrics): string {
  if (key === "satisfaction_ratio") return `${Math.round(m.satisfaction_ratio)}%`;
  const v = m[key];
  if (typeof v === "number") return String(v);
  return "—";
}

export function CompareClient() {
  const [list, setList] = useState<CallListRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareRows, setCompareRows] = useState<CompareRow[] | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const j = await fetch("/api/calls").then((r) => r.json());
      setList((j.calls ?? []) as CallListRow[]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const analyzed = useMemo(
    () => list.filter((c) => c.status === "analyzed"),
    [list],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else if (n.size < 4) n.add(id);
      return n;
    });
  }

  async function runCompare() {
    const ids = [...selected];
    if (ids.length < 2) {
      setErr("Select at least two analyzed calls.");
      return;
    }
    setErr(null);
    setLoadingCompare(true);
    try {
      const q = new URLSearchParams({ ids: ids.join(",") });
      const res = await fetch(`/api/calls/compare?${q}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Compare failed");
      setCompareRows(j.calls as CompareRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Compare failed");
      setCompareRows(null);
    } finally {
      setLoadingCompare(false);
    }
  }

  const chartData = useMemo(() => {
    if (!compareRows?.every((r) => r.ready && r.comparison)) return [];
    const ready = compareRows.filter((r) => r.ready && r.comparison) as (CompareRow & {
      comparison: ComparisonMetrics;
    })[];
    return METRIC_CHART_KEYS.map(({ key, label }) => {
      const row: Record<string, string | number> = { name: label };
      ready.forEach((c, i) => {
        row[`c${i}`] = normForChart(c.comparison, key);
      });
      return row;
    });
  }, [compareRows]);

  const winners = useMemo(() => {
    if (!compareRows?.every((r) => r.ready && r.comparison)) return null;
    const ready = compareRows.filter((r) => r.ready && r.comparison) as (CompareRow & {
      comparison: ComparisonMetrics;
    })[];
    const metrics: { key: keyof ComparisonMetrics; label: string }[] = [
      { key: "gratitude_score", label: "Gratitude" },
      { key: "interactivity_score", label: "Interactivity" },
      { key: "order_signal_score", label: "Order / commitment signal" },
      { key: "satisfaction_ratio", label: "Satisfaction ratio" },
      { key: "success_feedback_score", label: "Success feedback" },
      { key: "discovery_quality_score", label: "Discovery quality" },
      { key: "talk_time_balance_score", label: "Talk-time balance" },
      { key: "follow_up_clarity_score", label: "Follow-up clarity" },
    ];
    return metrics.map(({ key, label }) => {
      let bestIdx = 0;
      let bestVal = -Infinity;
      ready.forEach((r, i) => {
        const v = r.comparison[key];
        const num = typeof v === "number" ? v : 0;
        if (num > bestVal) {
          bestVal = num;
          bestIdx = i;
        }
      });
      return { key, label, winnerIndex: bestIdx, winnerLabel: ready[bestIdx]?.label };
    });
  }, [compareRows]);

  const readyCompare = compareRows?.filter((r) => r.ready && r.comparison) ?? [];

  return (
    <div className="space-y-10 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <GitCompare className="h-4 w-4" aria-hidden />
            Compare &amp; benchmark
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Call comparison report
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick two to four analyzed recordings and see which conversation scores higher on gratitude,
            interactivity, order signal, satisfaction, and coaching pillars — without changing upload or
            analysis flows.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      {/* <section className="grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
            aria-hidden
          />
          <div className="relative p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold">The problem we&apos;re solving</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sales teams run hundreds of calls — yet few orgs see how conversations actually perform.
              CallIntel scores each call on the same dimensions leaders care about:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Recording &amp; analysis</strong> — keep using
                  upload → transcribe → analyze on the dashboard.
                </span>
              </li>
              <li className="flex gap-2">
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Comparison</strong> — stack-rank calls on
                  gratitude, interactivity, order signal, satisfaction, and follow-through.
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROBLEM_PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-card/80 p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.q}</p>
            </div>
          ))}
        </div>
      </section> */}

      <Card className="border-border bg-card/60 shadow-lg shadow-black/10">
        <CardHeader>
          <CardTitle>Select calls</CardTitle>
          <CardDescription>
            Only <span className="text-foreground">analyzed</span> calls (up to four). Re-run analysis
            on older calls to refresh comparison scores from the model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingList ? (
            <p className="text-sm text-muted-foreground">Loading calls…</p>
          ) : analyzed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analyzed calls yet.{" "}
              <Link href="/dashboard#upload" className="font-medium text-primary hover:underline">
                Upload and analyze
              </Link>{" "}
              first.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {analyzed.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={on}
                        onChange={() => toggle(c.id)}
                        disabled={!on && selected.size >= 4}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium text-foreground">
                          {c.originalFilename ?? c.id.slice(0, 8) + "…"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()} · score{" "}
                          {c.overall_call_score != null ? c.overall_call_score.toFixed(1) : "—"} ·{" "}
                          {c.overall_sentiment ?? "—"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button
            type="button"
            className="gap-2"
            disabled={selected.size < 2 || loadingCompare}
            onClick={() => void runCompare()}
          >
            {loadingCompare ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing…
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4" />
                Build comparison
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {compareRows && (
        <>
          {compareRows.some((r) => !r.ready) && (
            <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-base">Some calls skipped</CardTitle>
                <CardDescription>
                  Comparison only includes fully analyzed calls. Finish transcribe + analyze for any row
                  missing insights.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {readyCompare.length >= 2 && chartData.length > 0 && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Benchmark chart</CardTitle>
                <CardDescription>
                  All series use a 0–10 scale on the chart; satisfaction is shown as ratio ÷ 10 for
                  shape comparison. See the table for exact %.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {readyCompare.map((c, i) => (
                      <Bar
                        key={c.id}
                        dataKey={`c${i}`}
                        name={c.label.length > 24 ? c.label.slice(0, 22) + "…" : c.label}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {winners && readyCompare.length >= 2 && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Side-by-side metrics</CardTitle>
                <CardDescription>
                  Highest value wins each row (ties favor the first listed call). Order row uses model
                  scores plus explicit commitment evidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3">Metric</th>
                      {readyCompare.map((c) => (
                        <th key={c.id} className="py-2 pr-3 font-medium">
                          {c.label}
                        </th>
                      ))}
                      <th className="py-2">Edge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_CHART_KEYS.map(({ key, label }) => (
                      <tr key={String(key)} className="border-b border-border/60">
                        <td className="py-2 pr-3 text-muted-foreground">{label}</td>
                        {readyCompare.map((c, i) => {
                          const cm = c.comparison!;
                          const w = winners.find((x) => x.key === key)?.winnerIndex === i;
                          return (
                            <td
                              key={c.id}
                              className={`py-2 pr-3 tabular-nums ${w ? "font-semibold text-primary" : ""}`}
                            >
                              {formatMetric(key, cm)}
                            </td>
                          );
                        })}
                        <td className="py-2 text-xs text-muted-foreground">
                          {winners.find((x) => x.key === key)?.winnerLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {readyCompare.map((c) =>
            c.comparison ? (
              <Card key={c.id} className="border-border bg-card/40">
                <CardHeader>
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <CardDescription>
                    Score {c.overall_call_score?.toFixed(1) ?? "—"} · {c.overall_sentiment ?? "—"}
                    {c.derived_fallback && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">
                        Estimated metrics (re-analyze for full model scores)
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{c.summary}</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Order / commitment
                    </p>
                    <p className="mt-1">
                      {c.comparison.order_confirmation.order_or_commitment_likely ? "Likely" : "Unclear"}{" "}
                      · confidence{" "}
                      {(c.comparison.order_confirmation.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {c.comparison.order_confirmation.evidence || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null,
          )}
        </>
      )}
    </div>
  );
}
