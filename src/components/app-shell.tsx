"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-[1]" aria-hidden>
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/8 blur-[100px] motion-safe:animate-pulse sm:h-96 sm:w-96" />
        <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[min(100%,56rem)] -translate-x-1/2 bg-primary/6 blur-[72px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      <SiteNav userEmail={userEmail} />
      <main className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">{children}</main>
    </>
  );
}
