import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, LineChart, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { verifySessionToken } from "@/lib/session";

const workflow = [
  { step: "01", title: "Upload", desc: "Drop MP3, WAV, M4A, or WebM — stored securely on disk." },
  { step: "02", title: "Transcribe", desc: "Whisper turns speech into timed segments for every insight." },
  { step: "03", title: "Analyze", desc: "GPT scores calls, maps your Q1–Q15 library, and surfaces actions." },
  { step: "04", title: "Explore", desc: "Rollups and per-call workspaces with audio, charts, and evidence." },
];

export default async function HomePage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userEmail = token ? verifySessionToken(token) : null;

  return (
    <div className="space-y-16 pb-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card/70 p-8 shadow-xl shadow-foreground/5 backdrop-blur-sm md:p-12 lg:p-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <LineChart className="h-3.5 w-3.5 text-primary" aria-hidden />
            AI-powered Call Intelligence Platform <span aria-hidden>✨</span>
          </p>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-balance md:text-5xl lg:text-6xl">
            Turn every call into{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              coaching gold
            </span>{" "}
            <span aria-hidden>🎯</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-balance md:text-xl">
            Upload, transcribe, and analyze sales conversations — then explore team-wide metrics and
            rep-level detail in one polished workspace.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {userEmail ? (
              <Link href="/dashboard">
                <Button className="group gap-2 px-6 py-3 text-base shadow-lg shadow-primary/15">
                  Open dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="group gap-2 px-6 py-3 text-base shadow-lg shadow-primary/15">
                  Sign in to continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            )}
            {userEmail && (
              <Link href="/dashboard#upload">
                <Button variant="outline" className="gap-2 border-border px-6 py-3 text-base">
                  <Upload className="h-4 w-4" />
                  Upload a call
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((w) => (
            <div
              key={w.step}
              className="rounded-2xl border border-border/90 bg-background/60 p-4 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {w.step}
              </p>
              <p className="mt-2 font-display text-lg font-semibold">{w.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
