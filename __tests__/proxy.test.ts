import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../proxy";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    public nextUrl: { pathname: string; origin: string; };
    public headers: Headers;
    public url: string;
    public method: string;
    
    constructor(url: string, init?: { headers?: Record<string, string>; method?: string }) {
      this.url = url;
      const parsedUrl = new URL(url);
      this.nextUrl = {
        pathname: parsedUrl.pathname,
        origin: parsedUrl.origin,
      };
      this.headers = new Headers(init?.headers);
      this.method = init?.method || "GET";
    }
  },
  NextResponse: {
    redirect: jest.fn((url: URL | string) => {
      const parsed = typeof url === 'string' ? new URL(url) : url;
      return { status: 307, url: parsed.toString() };
    }),
    next: jest.fn(() => ({ status: 200, type: 'next' })),
    json: jest.fn((body, init) => ({ status: init?.status || 200, body })),
  }
}));

// Mock global fetch
global.fetch = jest.fn();

describe("Proxy Middleware - Session & Expired Cookie Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Skenario 1: Akses /input-data TANPA cookie (Belum Login) -> Redirect ke /login", async () => {
    const req = new NextRequest("http://localhost:3000/input-data");
    
    // Simulasi fetch auth API yang merespon gagal (karena tidak ada cookie)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ session: null, user: null })
    });

    await proxy(req);

    // Pastikan NextResponse.redirect terpanggil
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCallUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    
    // Pastikan URL tujuan redirect adalah halaman /login
    expect(redirectCallUrl.pathname).toBe("/login");
  });

  it("Skenario 2: Akses /input-data DENGAN cookie KADALUARSA (Expired) -> Redirect ke /login", async () => {
    const req = new NextRequest("http://localhost:3000/input-data", {
      headers: { cookie: "prtl.session_token=ini_token_expired_123" }
    });
    
    // Simulasi fetch auth API yang merespon gagal karena cookie kadaluarsa
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" })
    });

    await proxy(req);

    // Pastikan NextResponse.redirect terpanggil
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCallUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    
    // Pastikan URL tujuan redirect adalah halaman /login
    expect(redirectCallUrl.pathname).toBe("/login");
  });

  it("Skenario 3: Akses /input-data DENGAN cookie VALID (Sudah Login) -> Lanjut (NextResponse.next)", async () => {
    const req = new NextRequest("http://localhost:3000/input-data", {
      headers: { cookie: "prtl.session_token=ini_token_valid_456" }
    });
    
    // Simulasi fetch auth API merespon sukses dengan data user
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "1", role: "kasir" },
        session: { id: "sess_1" }
      })
    });

    await proxy(req);

    // Pastikan NextResponse.next terpanggil (Artinya diizinkan masuk)
    expect(NextResponse.next).toHaveBeenCalled();
    // Pastikan TIDAK ADA redirect
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
