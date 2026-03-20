"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, GitCompare, Hash, ListTodo, Star, Trash2, TrendingUp } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RollupMetrics } from "@/lib/types";

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#94a3b8",
  negative: "#ef4444",
};

type CallRow = {
  id: string;
  createdAt: string;
  originalFilename: string | null;
  status: string;
  durationSeconds: number | null;
  overall_call_score: number | null;
  overall_sentiment: string | null;
};

export function DashboardClient() {
  const [rollup, setRollup] = useState<RollupMetrics | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        fetch("/api/rollup").then((x) => x.json()),
        fetch("/api/calls").then((x) => x.json()),
      ]);
      setRollup(r as RollupMetrics);
      setCalls((c.calls ?? []) as CallRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calls/${deleteId}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      setDeleteId(null);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadStatus(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file?.size) {
      setUploadStatus("Choose an audio file first.");
      return;
    }
    setBusy(true);
    try {
      const up = new FormData();
      up.append("file", file);
      up.append("filename", file.name);
      const ures = await fetch("/api/upload", { method: "POST", body: up });
      const ujson = await ures.json();
      if (!ures.ok) throw new Error(ujson.error || "Upload failed");
      const callId = ujson.call_id as string;
      setUploadStatus(`Uploaded ${file.name}. Transcribing…`);
      const tres = await fetch(`/api/transcribe?call_id=${callId}`, {
        method: "POST",
      });
      const tjson = await tres.json();
      if (!tres.ok) throw new Error(tjson.error || "Transcribe failed");
      setUploadStatus("Analyzing with GPT (may take 1–2 minutes)…");
      const ares = await fetch(`/api/analyze?call_id=${callId}`, {
        method: "POST",
      });
      const aj = await ares.json();
      if (!ares.ok) throw new Error(aj.error || "Analyze failed");
      setUploadStatus("Done. Open the call below.");
      await refresh();
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setBusy(false);
    }
  }

  const pieData = rollup
    ? [
        { name: "Positive", value: rollup.sentiment_split.positive },
        { name: "Neutral", value: rollup.sentiment_split.neutral },
        { name: "Negative", value: rollup.sentiment_split.negative },
      ].filter((d) => d.value > 0)
    : [];

  const kwData =
    rollup?.top_keywords.map((k) => ({ name: k.term, count: k.count })) ?? [];

  return (
    <div className="space-y-10">
      <ConfirmDialog
        open={!!deleteId}
        title="Delete this recording?"
        description="This removes the call, transcript, insights, and audio file from the server. This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete permanently"}
        cancelLabel="Keep"
        variant="danger"
        pending={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Rollups across analyzed calls, quick upload, and one-click access to every conversation.
            Remove recordings you no longer need—data and file are deleted together.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to home
        </Link>
      </div>

      <section id="upload" className="scroll-mt-24">
        <Card className="border-border bg-card/60 shadow-xl shadow-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Upload call</CardTitle>
            <CardDescription>
              MP3, WAV, M4A, or WebM. Uses your{" "}
              {/* <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> for
              Whisper + analysis. */}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpload} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Audio file</label>
                <input
                  name="file"
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  className="mt-1 block w-full cursor-pointer rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Working…" : "Upload & analyze"}
              </Button>
            </form>
            {uploadStatus && (
              <p className="mt-3 text-sm text-muted-foreground">{uploadStatus}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {loading || !rollup ? (
        <p className="text-muted-foreground">Loading metrics…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Hash}
              title="Total calls"
              value={String(rollup.total_calls)}
            />
            <MetricCard
              icon={Star}
              title="Avg call score"
              value={rollup.total_calls ? rollup.avg_call_score.toFixed(1) : "—"}
            />
            <MetricCard
              icon={Clock}
              title="Avg duration"
              value={
                rollup.total_calls
                  ? `${Math.floor(rollup.avg_call_duration_sec / 60)}m ${rollup.avg_call_duration_sec % 60}s`
                  : "—"
              }
            />
            <MetricCard
              icon={ListTodo}
              title="Action items"
              value={String(rollup.action_items_total)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Sentiment split</CardTitle>
                <CardDescription>Analyzed calls only</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No analyzed calls yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              entry.name === "Positive"
                                ? SENTIMENT_COLORS.positive
                                : entry.name === "Negative"
                                  ? SENTIMENT_COLORS.negative
                                  : SENTIMENT_COLORS.neutral
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Top keywords</CardTitle>
                <CardDescription>Weighted by per-call mentions</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {kwData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keywords yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kwData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="hsl(172 38% 32%)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                All calls
              </CardTitle>
              <CardDescription>
                Open a row for the full call workspace, or delete a recording.{" "}
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <GitCompare className="h-3.5 w-3.5" aria-hidden />
                  Compare calls
                </Link>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 pr-4">When</th>
                  <th className="py-3 pr-4">File</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Score</th>
                  <th className="py-3 pr-4">Sentiment</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/15"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/calls/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {new Date(c.createdAt).toLocaleString()}
                      </Link>
                    </td>
                    <td className="max-w-[160px] truncate py-3 pr-4 text-muted-foreground">
                      {c.originalFilename ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs capitalize">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {c.overall_call_score != null ? c.overall_call_score.toFixed(1) : "—"}
                    </td>
                    <td className="py-3 pr-4">{c.overall_sentiment ?? "—"}</td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(c.id)}
                        aria-label={`Delete ${c.originalFilename ?? c.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {calls.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No calls yet. Upload audio or run{" "}
                <code className="rounded bg-muted px-1">npm run db:seed</code>.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-black/15">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          <CardDescription>{title}</CardDescription>
        </div>
        <CardTitle className="font-display text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
