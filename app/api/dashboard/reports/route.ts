import { NextResponse } from "next/server";
import { desc, eq, and, count, sql, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyReports, store, users } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (storeId) {
      conditions.push(eq(dailyReports.storeId, storeId));
    }
    if (startDateParam) {
      const d = new Date(startDateParam);
      d.setHours(0,0,0,0);
      conditions.push(gte(dailyReports.reportDate, d));
    }
    if (endDateParam) {
      const d = new Date(endDateParam);
      d.setHours(23,59,59,999);
      conditions.push(sql`${dailyReports.reportDate} <= ${d}`);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(dailyReports)
      .where(where);

    const total = Number(totalResult?.total ?? 0);

    const rows = await db
      .select({
        id: dailyReports.id,
        reportDate: dailyReports.reportDate,
        totalSales: dailyReports.totalSales,
        salesGroceries: dailyReports.salesGroceries,
        salesLpg: dailyReports.salesLpg,
        salesPelumas: dailyReports.salesPelumas,
        isStoreHealthy: dailyReports.isStoreHealthy,
        targetSpdSnapshot: dailyReports.targetSpdSnapshot,
        isPushedToWa: dailyReports.isPushedToWa,
        storeId: dailyReports.storeId,
        authorName: users.name,
        storeName: store.name,
        needSupport: dailyReports.needSupport,
        formKendala: dailyReports.formKendala,
        supportStatus: dailyReports.supportStatus,
        kendalaStatus: dailyReports.kendalaStatus,
      })
      .from(dailyReports)
      .leftJoin(users, eq(dailyReports.authorId, users.id))
      .leftJoin(store, eq(dailyReports.storeId, store.id))
      .where(where)
      .orderBy(desc(dailyReports.reportDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      reports: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
