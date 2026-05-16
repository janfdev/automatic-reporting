import { NextRequest, NextResponse } from "next/server";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 16;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  // --- 1. Rate Limiting untuk Login ---
  if (pathname === "/api/auth/sign-in" && request.method === "POST") {
    const now = Date.now();
    const stats = loginAttempts.get(ip);

    if (stats) {
      if (now - stats.lastAttempt < WINDOW_MS) {
        if (stats.count >= MAX_ATTEMPTS) {
          return NextResponse.json(
            {
              error: "Terlalu banyak percobaan login. Silakan tunggu 15 menit."
            },
            { status: 429 }
          );
        }
        stats.count++;
      } else {
        stats.count = 1;
        stats.lastAttempt = now;
      }
    } else {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
    }
  }

  // --- 2. Proteksi Session & Rute ---
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionResponse = await fetch(
    new URL("/api/auth/get-session", request.url),
    {
      method: "GET",
      headers: {
        cookie: cookieHeader
      }
    }
  );

  const sessionPayload = sessionResponse.ok
    ? await sessionResponse.json()
    : null;
  const sessionUser = sessionPayload?.user;

  // Jika mencoba akses rute terproteksi tanpa login
  const isProtectedRoute = ["/admin"].some((p) => pathname.startsWith(p));
  if (isProtectedRoute && !sessionUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Proteksi Role Admin
  if (pathname.startsWith("/admin") && sessionUser?.role !== "admin") {
    return NextResponse.redirect(new URL("/input-data", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/send-wa/:path*", "/api/auth/sign-in"]
};
