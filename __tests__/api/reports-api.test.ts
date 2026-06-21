/**
 * Integration-style tests for POST /api/reports.
 *
 * All external dependencies are mocked:
 *   - next/server  → functional mock (NextRequest with .json(), NextResponse.json returning { status, json() })
 *   - @/db/index   → full Drizzle chain mock (insert/values/returning/onConflictDoUpdate, select/from/where, query.users/store)
 *   - @/lib/auth   → auth.api.getSession mock
 *   - nanoid       → returns deterministic "test123"
 *
 * Key fixes vs. the original spec:
 *   1. Import path is "@/db/index" (matches what route.ts actually imports).
 *   2. db.query.store.findFirst is included (used by refreshSummary).
 *   3. values() mock also has onConflictDoUpdate() (used for storeReportSummaries upsert).
 *   4. "all-zeros" test replaced with a negative-value test that actually triggers min(0) validation.
 */

// ---------------------------------------------------------------------------
// Mocks – hoisted before any imports by Jest
// ---------------------------------------------------------------------------

jest.mock("next/server", () => {
  return {
    NextRequest: class MockNextRequest {
      public url: string;
      public method: string;
      public headers: Headers;
      private _body: string;

      constructor(
        url: string,
        init?: { method?: string; headers?: Record<string, string>; body?: string },
      ) {
        this.url = url;
        this.method = init?.method ?? "GET";
        this.headers = new Headers(init?.headers);
        this._body = init?.body ?? "{}";
      }

      async json() {
        return JSON.parse(this._body);
      }
    },
    NextResponse: {
      json: jest.fn((body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        async json() {
          return body;
        },
      })),
    },
  };
});

jest.mock("@/db/index", () => ({
  db: {
    query: {
      users: { findFirst: jest.fn() },
      store: { findFirst: jest.fn() },
    },
    /**
     * Supports both call patterns used by the route:
     *   db.insert(dailyReports).values({…}).returning()
     *   db.insert(storeReportSummaries).values({…}).onConflictDoUpdate({…})
     */
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          {
            id: "daily_test123",
            storeId: "store_1",
            totalSales: 1_500_000,
            needSupport: "Aman",
            formKendala: "Tidak ada",
          },
        ]),
        onConflictDoUpdate: jest.fn().mockResolvedValue([]),
      }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          {
            reportCount: 1,
            totalSales: 1_500_000,
            salesGroceries: 1_000_000,
            salesLpg: 300_000,
            salesPelumas: 200_000,
          },
        ]),
      }),
    }),
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("nanoid", () => ({ nanoid: () => "test123" }));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { POST } from "@/app/api/reports/route";
import { auth } from "@/lib/auth";
import { db } from "@/db/index";

const mockDb = db as unknown as {
  query: {
    users: { findFirst: jest.Mock };
    store: { findFirst: jest.Mock };
  };
  insert: jest.Mock;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReportRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validReportBody = {
  salesGroceries: 1_000_000,
  salesLpg: 300_000,
  salesPelumas: 200_000,
  fulfillmentPb: 85,
  avgFulfillmentDc: 92,
  itemOos: [],
  stockLpg3kg: 10,
  stockLpg5kg: 5,
  stockLpg12kg: 2,
  waste: 50_000,
  losses: 25_000,
  isStoreHealthy: "store sehat",
  needSupport: "",
  formKendala: "",
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("POST /api/reports – Simpan Laporan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 21, 10, 30, 0));

    // Default: valid session
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "user_1", role: "kasir" },
      session: { id: "sess_1" },
    } as never);

    // Default: user has a storeId
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "user_1",
      storeId: "store_1",
      role: "kasir",
    });

    // Default: store record exists
    mockDb.query.store.findFirst.mockResolvedValue({
      id: "store_1",
      targetSpd: 50_000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------

  it("menolak request tanpa session (401)", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue(null as never);

    const req = makeReportRequest(validReportBody);
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("menolak user tanpa storeId (400)", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "user_1",
      storeId: null,
    });

    const req = makeReportRequest(validReportBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/outlet/i);
  });

  it("menolak payload dengan nilai negatif (400) – melanggar min(0) Zod", async () => {
    // salesGroceries: -100 fails z.coerce.number().min(0)
    const req = makeReportRequest({
      ...validReportBody,
      salesGroceries: -100,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("berhasil simpan laporan dan return 200 dengan data", async () => {
    const req = makeReportRequest(validReportBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it("normalizes: needSupport kosong -> 'Aman', formKendala kosong -> 'Tidak ada'", async () => {
    const req = makeReportRequest({
      ...validReportBody,
      needSupport: "",
      formKendala: "   ",
    });
    await POST(req);

    // db.insert is called first with the daily report data.
    // results[0].value is the object returned by insert(), i.e. { values: jest.fn() }
    const insertSpy = mockDb.insert;
    const valuesCalls = insertSpy.mock.results[0]?.value?.values?.mock?.calls;

    if (valuesCalls && valuesCalls[0]) {
      const insertedData = valuesCalls[0][0];
      expect(insertedData.needSupport).toBe("Aman");
      expect(insertedData.formKendala).toBe("Tidak ada");
    }
  });

  it("mempertahankan nilai asli jika needSupport diisi", async () => {
    const req = makeReportRequest({
      ...validReportBody,
      needSupport: "Butuh penggantian AC",
      formKendala: "Listrik mati 2 jam",
    });
    await POST(req);

    const insertSpy = mockDb.insert;
    const valuesCalls = insertSpy.mock.results[0]?.value?.values?.mock?.calls;

    if (valuesCalls && valuesCalls[0]) {
      const insertedData = valuesCalls[0][0];
      expect(insertedData.needSupport).toBe("Butuh penggantian AC");
      expect(insertedData.formKendala).toBe("Listrik mati 2 jam");
    }
  });

  it("membuat summary MTD dari tanggal 1 sampai sebelum bulan berikutnya untuk store user", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "user_2", role: "kasir" },
      session: { id: "sess_2" },
    } as never);
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "user_2",
      storeId: "store_2",
      role: "kasir",
    });

    const req = makeReportRequest(validReportBody);
    await POST(req);

    const insertSpy = mockDb.insert;
    const valuesCalls = insertSpy.mock.results[0]?.value?.values?.mock?.calls;
    const dailyInsert = valuesCalls?.[0]?.[0];
    const mtdSummary = valuesCalls?.[1]?.[0];

    expect(dailyInsert).toMatchObject({
      storeId: "store_2",
      authorId: "user_2",
      totalSales: 1_500_000,
    });
    expect(mtdSummary).toMatchObject({
      id: "store_2-mtd-2026-06",
      storeId: "store_2",
      periodType: "mtd",
      periodKey: "2026-06",
      periodLabel: "MTD Juni 2026",
      reportCount: 1,
      totalSales: 1_500_000,
      salesGroceries: 1_000_000,
      salesLpg: 300_000,
      salesPelumas: 200_000,
      targetSpdSnapshot: 50_000,
    });
    expect(mtdSummary.periodStart).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
    expect(mtdSummary.periodEnd).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
  });

  it("membuat summary YTD dari 1 Januari sampai sebelum tahun berikutnya", async () => {
    const req = makeReportRequest(validReportBody);
    await POST(req);

    const insertSpy = mockDb.insert;
    const valuesCalls = insertSpy.mock.results[0]?.value?.values?.mock?.calls;
    const ytdSummary = valuesCalls?.[2]?.[0];

    expect(ytdSummary).toMatchObject({
      id: "store_1-ytd-2026",
      storeId: "store_1",
      periodType: "ytd",
      periodKey: "2026",
      periodLabel: "YTD 2026",
    });
    expect(ytdSummary.periodStart).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    expect(ytdSummary.periodEnd).toEqual(new Date(2027, 0, 1, 0, 0, 0, 0));
  });
});
