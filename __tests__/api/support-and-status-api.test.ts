jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      async json() {
        return body;
      },
    })),
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

import { GET as getSupport } from "@/app/api/dashboard/support/route";
import { POST as updateReportStatus } from "@/app/api/dashboard/reports/status/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

function makeRequest(url: string, body?: Record<string, unknown>) {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Dashboard support/kendala API", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "admin_1", role: "admin" },
      session: { id: "sess_admin" },
    });

    let selectCall = 0;
    (db.select as jest.Mock).mockImplementation(() => {
      selectCall += 1;

      if (selectCall === 1) {
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ total: 1 }]),
          }),
        };
      }

      return {
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue([
                      {
                        id: "daily_1",
                        needSupport: "Butuh teknisi",
                        formKendala: "AC mati",
                        supportStatus: "open",
                        kendalaStatus: "open",
                        storeName: "Store A",
                        authorName: "Kasir A",
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
  });

  it("menolak akses support/kendala tanpa role admin", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "user_1", role: "kasir" },
    });

    const res = await getSupport(makeRequest("http://localhost:3000/api/dashboard/support"));

    expect(res.status).toBe(401);
  });

  it("mengembalikan daftar kendala dengan pagination untuk admin", async () => {
    const res = await getSupport(
      makeRequest("http://localhost:3000/api/dashboard/support?type=kendala&page=1&limit=10"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reports).toHaveLength(1);
    expect(json.reports[0]).toMatchObject({
      id: "daily_1",
      formKendala: "AC mati",
      kendalaStatus: "open",
    });
    expect(json.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});

describe("Dashboard report status API", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "admin_1", role: "admin" },
      session: { id: "sess_admin" },
    });

    (db.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  it("menolak update status tanpa role admin atau super_admin", async () => {
    (auth.api.getSession as jest.Mock).mockResolvedValue({
      user: { id: "user_1", role: "kasir" },
    });

    const res = await updateReportStatus(
      makeRequest("http://localhost:3000/api/dashboard/reports/status", {
        reportId: "daily_1",
        field: "kendalaStatus",
        status: "resolved",
      }),
    );

    expect(res.status).toBe(401);
  });

  it("menolak field status yang tidak diizinkan", async () => {
    const res = await updateReportStatus(
      makeRequest("http://localhost:3000/api/dashboard/reports/status", {
        reportId: "daily_1",
        field: "totalSales",
        status: "resolved",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("menolak nilai status di luar open, in_progress, resolved", async () => {
    const res = await updateReportStatus(
      makeRequest("http://localhost:3000/api/dashboard/reports/status", {
        reportId: "daily_1",
        field: "kendalaStatus",
        status: "closed",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("mengubah kendalaStatus menjadi resolved untuk admin", async () => {
    const res = await updateReportStatus(
      makeRequest("http://localhost:3000/api/dashboard/reports/status", {
        reportId: "daily_1",
        field: "kendalaStatus",
        status: "resolved",
      }),
    );
    const json = await res.json();

    const updateResult = (db.update as jest.Mock).mock.results[0].value;
    expect(updateResult.set).toHaveBeenCalledWith({ kendalaStatus: "resolved" });
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
