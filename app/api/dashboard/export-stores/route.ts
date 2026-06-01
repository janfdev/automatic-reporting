import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, ne, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { dailyReports, users, store } from "@/db/schema";
import { auth } from "@/lib/auth";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  // Build date range
  const startDate = startDateParam
    ? (() => { const d = new Date(startDateParam); d.setHours(0,0,0,0); return d; })()
    : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();

  const endDate = endDateParam
    ? (() => { const d = new Date(endDateParam); d.setHours(23,59,59,999); return d; })()
    : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

  // Build where clauses
  const conditions = [
    gte(dailyReports.reportDate, startDate),
    lte(dailyReports.reportDate, endDate),
  ];
  if (storeId && storeId !== "all") {
    conditions.push(eq(dailyReports.storeId, storeId));
  }

  const rows = await db
    .select({
      reportDate: dailyReports.reportDate,
      storeName: store.name,
      authorName: users.name,
      totalSales: dailyReports.totalSales,
      salesGroceries: dailyReports.salesGroceries,
      salesLpg: dailyReports.salesLpg,
      salesPelumas: dailyReports.salesPelumas,
      waste: dailyReports.waste,
      losses: dailyReports.losses,
      isStoreHealthy: dailyReports.isStoreHealthy,
      needSupport: dailyReports.needSupport,
      formKendala: dailyReports.formKendala,
      supportStatus: dailyReports.supportStatus,
      kendalaStatus: dailyReports.kendalaStatus,
      isPushedToWa: dailyReports.isPushedToWa,
      fulfillmentPb: dailyReports.fulfillmentPb,
      avgFulfillmentDc: dailyReports.avgFulfillmentDc,
      stockLpg3kg: dailyReports.stockLpg3kg,
      stockLpg5kg: dailyReports.stockLpg5kg,
      stockLpg12kg: dailyReports.stockLpg12kg,
    })
    .from(dailyReports)
    .leftJoin(users, eq(dailyReports.authorId, users.id))
    .leftJoin(store, eq(dailyReports.storeId, store.id))
    .where(and(...conditions))
    .orderBy(desc(dailyReports.reportDate));

  const headers = [
    "Tanggal",
    "Cabang",
    "Kasir",
    "Total Sales (Rp)",
    "Groceries (Rp)",
    "LPG (Rp)",
    "Pelumas (Rp)",
    "Waste",
    "Losses",
    "Kondisi Store",
    "Fulfillment PB (%)",
    "Avg Fulfillment DC (%)",
    "Stok LPG 3kg",
    "Stok LPG 5kg",
    "Stok LPG 12kg",
    "Need Support",
    "Status Support",
    "Kendala",
    "Status Kendala",
    "Terkirim WA",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.reportDate ? new Date(row.reportDate).toLocaleDateString("id-ID") : "",
        row.storeName ?? "",
        row.authorName ?? "",
        row.totalSales ?? 0,
        row.salesGroceries ?? 0,
        row.salesLpg ?? 0,
        row.salesPelumas ?? 0,
        row.waste ?? 0,
        row.losses ?? 0,
        row.isStoreHealthy ?? "",
        row.fulfillmentPb ?? "",
        row.avgFulfillmentDc ?? "",
        row.stockLpg3kg ?? 0,
        row.stockLpg5kg ?? 0,
        row.stockLpg12kg ?? 0,
        row.needSupport ?? "",
        row.supportStatus ?? "",
        row.formKendala ?? "",
        row.kendalaStatus ?? "",
        row.isPushedToWa ? "Ya" : "Tidak",
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const fileName = `laporan-harian-${startDate.toISOString().slice(0,10)}-sd-${endDate.toISOString().slice(0,10)}.csv`;
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
