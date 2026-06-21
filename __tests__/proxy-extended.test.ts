/**
 * Extended proxy middleware tests – admin role scenarios and rate limiting.
 *
 * Each Jest test file runs in its own module registry, so the module-level
 * `loginAttempts` Map in proxy.ts is a fresh instance here, independent of
 * proxy.test.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../proxy";

jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    public nextUrl: { pathname: string; origin: string };
    public headers: Headers;
    public url: string;
    public method: string;

    constructor(url: string, init?: { headers?: Record<string, string>; method?: string }) {
      this.url = url;
      const parsedUrl = new URL(url);
      this.nextUrl = { pathname: parsedUrl.pathname, origin: parsedUrl.origin };
      this.headers = new Headers(init?.headers);
      this.method = init?.method || "GET";
    }
  },
  NextResponse: {
    redirect: jest.fn((url: URL | string) => {
      const parsed = typeof url === "string" ? new URL(url) : url;
      return { status: 307, url: parsed.toString() };
    }),
    next: jest.fn(() => ({ status: 200, type: "next" })),
    json: jest.fn((body, init) => ({ status: init?.status || 200, body })),
  },
}));

global.fetch = jest.fn();

describe("Proxy Middleware – Proteksi Role", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Skenario: Role kasir mencoba akses /admin -> Redirect ke /input-data", async () => {
    const req = new NextRequest("http://localhost:3000/admin/dashboard", {
      headers: { cookie: "prtl.session_token=kasir_token" },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "2", role: "kasir" }, session: { id: "sess_2" } }),
    });

    await proxy(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/input-data");
  });

  it("Skenario: Role admin mengakses /admin -> Lanjut (next)", async () => {
    const req = new NextRequest("http://localhost:3000/admin/dashboard", {
      headers: { cookie: "prtl.session_token=admin_token" },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "1", role: "admin" }, session: { id: "sess_1" } }),
    });

    await proxy(req);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("Skenario: Akses /input-data tanpa login -> Redirect ke /login dengan param ?next", async () => {
    const req = new NextRequest("http://localhost:3000/input-data");

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ session: null }),
    });

    await proxy(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectUrl.pathname).toBe("/login");
    expect(redirectUrl.searchParams.get("next")).toBe("/input-data");
  });

  it("Skenario: Rate limit login -> JSON 429 setelah MAX_ATTEMPTS percobaan", async () => {
    // MAX_ATTEMPTS = 16; the 17th POST to /api/auth/sign-in from the same IP
    // should be rejected with 429.
    const makeLoginRequest = async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.99.1" },
      });
      // Calls 1–16 reach the session fetch; mock it so they go through.
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: null }),
      });
      return proxy(req);
    };

    // First 16 attempts should pass through
    for (let i = 0; i < 16; i++) await makeLoginRequest();

    // 17th attempt should be rate limited (no fetch mock needed – returns early)
    const req = new NextRequest("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "x-forwarded-for": "192.168.99.1" },
    });
    await proxy(req);

    // NextResponse.json must have been called with status 429
    const jsonCalls = (NextResponse.json as jest.Mock).mock.calls;
    const rateLimitCall = jsonCalls.find((call) => call[1]?.status === 429);
    expect(rateLimitCall).toBeDefined();
  });
});
