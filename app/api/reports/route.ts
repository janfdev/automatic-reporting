import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { dailyReports, store, storeReportSummaries, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

const reportPayloadSchema = z.object({
  salesGroceries: z.coerce.number().min(0).default(0),
  salesLpg: z.coerce.number().min(0).default(0),
  salesPelumas: z.coerce.number().min(0).default(0),
  fulfillmentPb: z.coerce.number().min(0).default(0),
  avgFulfillmentDc: z.coerce.number().min(0).default(0),
  itemOos: z
    .array(
      z.object({
        name: z.string().trim().max(120)
      })
    )
    .default([]),
  stockLpg3kg: z.coerce.number().min(0).default(0),
  stockLpg5kg: z.coerce.number().min(0).default(0),
  stockLpg12kg: z.coerce.number().min(0).default(0),
  waste: z.coerce.number().min(0).default(0),
  losses: z.coerce.number().min(0).default(0),
  needSupport: z.string().max(2000).optional().default(""),
  formKendala: z.string().max(2000).optional().default(""),
  isStoreHealthy: z.string().default("store sehat"),
  isPushedToWa: z.boolean().optional().default(false)
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reportPayloadSchema.safeParse(body);
    if (!parsed.success) {
      console.log(
        "VALIDATION ERROR:",
        JSON.stringify(parsed.error.flatten(), null, 2)
      );

      return NextResponse.json(
        {
          error: "Payload laporan tidak valid.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    // Fetch user from db to get their storeId
    const authorId = session.user.id;
    const userRec = await db.query.users.findFirst({
      where: eq(users.id, authorId)
    });

    if (!userRec || !userRec.storeId) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki outlet (store) yang ditetapkan." },
        { status: 400 }
      );
    }

    const storeId = userRec.storeId;

    const {
      salesGroceries,
      salesLpg,
      salesPelumas,
      fulfillmentPb,
      avgFulfillmentDc,
      itemOos,
      stockLpg3kg,
      stockLpg5kg,
      stockLpg12kg,
      waste,
      losses,
      needSupport,
      formKendala,
      isStoreHealthy,
      isPushedToWa
    } = parsed.data;

    const sanitizedItemOos = itemOos.filter(
      (item) => item.name.trim().length > 0
    );

    // Hitung total otomatis dari server
    const totalSales =
      Number(salesGroceries) + Number(salesLpg) + Number(salesPelumas);

    const newId = "daily" + nanoid(10);
    const reportDate = new Date();
    const newReport = await db
      .insert(dailyReports)
      .values({
        id: newId,
        storeId,
        authorId: authorId,
        salesGroceries: Number(salesGroceries),
        salesLpg: Number(salesLpg),
        salesPelumas: Number(salesPelumas),
        totalSales,
        fulfillmentPb: fulfillmentPb.toString(),
        avgFulfillmentDc: avgFulfillmentDc.toString(),
        itemOos: sanitizedItemOos,
        stockLpg3kg: Number(stockLpg3kg),
        stockLpg5kg: Number(stockLpg5kg),
        stockLpg12kg: Number(stockLpg12kg),
        waste: Number(waste),
        losses: Number(losses),
        needSupport,
        formKendala,
        isStoreHealthy,
        isPushedToWa
      })
      .returning();

    const currentStore = await db.query.store.findFirst({
      where: eq(store.id, storeId)
    });

    const refreshSummary = async (
      periodType: "mtd" | "ytd",
      periodKey: string,
      periodLabel: string,
      periodStart: Date,
      periodEnd: Date
    ) => {
      const [totals] = await db
        .select({
          reportCount: sql<number>`count(*)`,
          totalSales: sql<number>`coalesce(sum(${dailyReports.totalSales}), 0)`,
          salesGroceries: sql<number>`coalesce(sum(${dailyReports.salesGroceries}), 0)`,
          salesLpg: sql<number>`coalesce(sum(${dailyReports.salesLpg}), 0)`,
          salesPelumas: sql<number>`coalesce(sum(${dailyReports.salesPelumas}), 0)`
        })
        .from(dailyReports)
        .where(
          and(
            eq(dailyReports.storeId, storeId),
            gte(dailyReports.reportDate, periodStart),
            lt(dailyReports.reportDate, periodEnd)
          )
        );

      await db
        .insert(storeReportSummaries)
        .values({
          id: `${storeId}-${periodType}-${periodKey}`,
          storeId,
          periodType,
          periodKey,
          periodLabel,
          periodStart,
          periodEnd,
          reportCount: Number(totals?.reportCount ?? 0),
          totalSales: Number(totals?.totalSales ?? 0),
          salesGroceries: Number(totals?.salesGroceries ?? 0),
          salesLpg: Number(totals?.salesLpg ?? 0),
          salesPelumas: Number(totals?.salesPelumas ?? 0),
          targetSpdSnapshot: currentStore?.targetSpd ?? 0,
          lastReportDate: reportDate,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [
            storeReportSummaries.storeId,
            storeReportSummaries.periodType,
            storeReportSummaries.periodKey
          ],
          set: {
            periodLabel,
            periodStart,
            periodEnd,
            reportCount: Number(totals?.reportCount ?? 0),
            totalSales: Number(totals?.totalSales ?? 0),
            salesGroceries: Number(totals?.salesGroceries ?? 0),
            salesLpg: Number(totals?.salesLpg ?? 0),
            salesPelumas: Number(totals?.salesPelumas ?? 0),
            targetSpdSnapshot: currentStore?.targetSpd ?? 0,
            lastReportDate: reportDate,
            updatedAt: new Date()
          }
        });
    };

    const monthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = `${reportDate.getFullYear()}`;
    const startOfMonth = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth(),
      1
    );
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfNextMonth = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth() + 1,
      1
    );
    startOfNextMonth.setHours(0, 0, 0, 0);
    const startOfYear = new Date(reportDate.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const startOfNextYear = new Date(reportDate.getFullYear() + 1, 0, 1);
    startOfNextYear.setHours(0, 0, 0, 0);

    const monthLabel = reportDate.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });

    await refreshSummary(
      "mtd",
      monthKey,
      `MTD ${monthLabel}`,
      startOfMonth,
      startOfNextMonth
    );
    await refreshSummary(
      "ytd",
      yearKey,
      `YTD ${reportDate.getFullYear()}`,
      startOfYear,
      startOfNextYear
    );

    return NextResponse.json({ success: true, data: newReport[0] });
  } catch (e) {
    console.error("API /api/reports Error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menyimpan data." },
      { status: 500 }
    );
  }
}
