"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GitCompare, LayoutDashboard, LogIn, LogOut, Mic2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const authedLinks = [
  { href: "/", label: "Home", icon: Sparkles, match: "home" as const },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "dash" as const },
  { href: "/dashboard#upload", label: "Upload", icon: Mic2, match: "upload" as const },
  { href: "/compare", label: "Compare", icon: GitCompare, match: "compare" as const },
];

export function SiteNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/90 bg-card/90 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-[1.02]">
            <span className="text-lg leading-none" aria-hidden>
              📞
            </span>
          </span>
          <span>
            CallIntel <span className="hidden text-base sm:inline">✨</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {userEmail &&
            authedLinks.map(({ href, label, icon: Icon, match }) => {
              const active =
                match === "home"
                  ? pathname === "/"
                  : match === "upload"
                    ? pathname.startsWith("/dashboard") && hash === "#upload"
                    : match === "compare"
                      ? pathname.startsWith("/compare")
                      : pathname.startsWith("/dashboard") && hash !== "#upload";
              return (
                <Link
                  key={href + label}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 opacity-80" aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          {!userEmail && (
            <Link href="/login">
              <Button variant="outline" className="gap-2 rounded-lg px-3 py-2 text-sm">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            </Link>
          )}
          {userEmail && (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
                {userEmail}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
