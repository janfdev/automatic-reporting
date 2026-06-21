/**
 * Unit tests for fillDailySalesGaps in @/lib/wa-message.
 *
 * wa-message.ts imports `db` from "@/db" at the top level (used only in
 * loadPeriodSummary), so we mock the db module to prevent a Pool
 * connection attempt during import.
 */

jest.mock("@/db", () => ({
  db: {
    query: {
      storeReportSummaries: { findFirst: jest.fn() },
    },
    select: jest.fn(),
  },
}));

import { fillDailySalesGaps } from "@/lib/wa-message";

describe("fillDailySalesGaps – Pengisian Celah Tanggal", () => {
  it("mengisi hari kosong di awal bulan dengan Rp 0", () => {
    const from = new Date(2026, 5, 1); // 1 Juni 2026
    const to   = new Date(2026, 5, 3); // 3 Juni 2026
    const reports = [{ reportDate: new Date(2026, 5, 3), totalSales: 1_000_000 }];

    const result = fillDailySalesGaps(reports, from, to);
    const lines = result.split("\n");

    expect(lines[0]).toBe("01/06/2026 : Rp 0");
    expect(lines[1]).toBe("02/06/2026 : Rp 0");
    expect(lines[2]).toBe("03/06/2026 : Rp 1.000.000");
  });

  it("menampilkan seluruh 30 hari bulan Juni", () => {
    const from = new Date(2026, 5, 1);
    const to   = new Date(2026, 5, 30);
    const reports = [{ reportDate: new Date(2026, 5, 15), totalSales: 500_000 }];

    const result = fillDailySalesGaps(reports, from, to);
    const lines = result.split("\n");

    expect(lines).toHaveLength(30);
    expect(lines[0]).toBe("01/06/2026 : Rp 0");
    expect(lines[14]).toContain("15/06/2026 : Rp 500.000");
    expect(lines[29]).toBe("30/06/2026 : Rp 0");
  });

  it("menampilkan seluruh 31 hari bulan Januari", () => {
    const from = new Date(2026, 0, 1);
    const to   = new Date(2026, 0, 31);
    const reports: Array<{ reportDate: Date; totalSales: number }> = [];

    const lines = fillDailySalesGaps(reports, from, to).split("\n");
    expect(lines).toHaveLength(31);
    expect(lines[30]).toBe("31/01/2026 : Rp 0");
  });

  it("mengakumulasi dua laporan di hari yang sama", () => {
    const from = new Date(2026, 5, 1);
    const to   = new Date(2026, 5, 1);
    const reports = [
      { reportDate: new Date(2026, 5, 1), totalSales: 500_000 },
      { reportDate: new Date(2026, 5, 1), totalSales: 300_000 },
    ];

    const result = fillDailySalesGaps(reports, from, to);
    expect(result).toBe("01/06/2026 : Rp 800.000");
  });

  it("mengembalikan pesan default jika range tidak valid (to < from)", () => {
    const from = new Date(2026, 5, 10);
    const to   = new Date(2026, 5, 5); // to before from
    const result = fillDailySalesGaps([], from, to);
    expect(result).toBe("Belum ada data sales bulan ini");
  });

  it("mengabaikan entry dengan reportDate null", () => {
    const from = new Date(2026, 5, 1);
    const to   = new Date(2026, 5, 1);
    const reports = [{ reportDate: null, totalSales: 999_999 }];

    const result = fillDailySalesGaps(reports, from, to);
    expect(result).toBe("01/06/2026 : Rp 0");
  });

  it("menangani totalSales null sebagai 0", () => {
    const from = new Date(2026, 5, 1);
    const to   = new Date(2026, 5, 1);
    const reports = [{ reportDate: new Date(2026, 5, 1), totalSales: null }];

    const result = fillDailySalesGaps(reports, from, to);
    expect(result).toBe("01/06/2026 : Rp 0");
  });
});
