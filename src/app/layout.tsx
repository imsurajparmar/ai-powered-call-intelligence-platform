import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { verifySessionToken } from "@/lib/session";
import "./globals.css";
import "./theme.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "CallIntel — AI-powered Call Intelligence",
  description: "Transcribe, analyze, and coach sales calls",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userEmail = token ? verifySessionToken(token) : null;

  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body
        className={`${sans.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <AppShell userEmail={userEmail}>{children}</AppShell>
      </body>
    </html>
  );
}
