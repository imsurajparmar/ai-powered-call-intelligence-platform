import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · CallIntel",
  description: "AI-powered Call Intelligence Platform",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#f8f6f0] via-[#f3efe6] to-[#ebe4d8] px-4 py-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,90,88,0.12),transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-4xl shadow-xl shadow-primary/25 ring-4 ring-primary/10">
            <span aria-hidden>📞</span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">
            CallIntel <span className="inline-block animate-pulse">✨</span>
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary/90">
            AI-powered Call Intelligence Platform
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
            Transcribe · analyze · coach — all in one place.{" "}
            <span aria-hidden>🎯🤖📊</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border/80 bg-card/95 p-8 shadow-2xl shadow-foreground/5 backdrop-blur-sm">
          <h1 className="text-center font-display text-xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Sign in to open your command center
          </p>
          <Suspense fallback={<p className="mt-8 text-center text-sm text-muted-foreground">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Secure session · Encrypted cookie
        </p>
      </div>
    </div>
  );
}
