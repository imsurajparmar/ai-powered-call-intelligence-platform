import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-config";
import { verifySessionTokenEdge } from "@/lib/verify-session-edge";

async function sessionEmail(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionTokenEdge(token);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const email = await sessionEmail(request);

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (email) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const protectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/calls") ||
    pathname.startsWith("/compare");
  const protectedApi =
    pathname.startsWith("/api/") && !pathname.startsWith("/api/auth");

  if (protectedApi && !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (protectedPage && !email) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/calls/:path*",
    "/compare",
    "/compare/:path*",
    "/login",
    "/api/:path*",
  ],
};
