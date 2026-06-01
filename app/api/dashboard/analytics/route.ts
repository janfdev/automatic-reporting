import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { dailyReports, users, store } from "@/db/schema";
import { auth } from "@/lib/auth";

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  const startOfMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfYear = new Date(startToday.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  // Date range for chart and summary (defaults: last 14 days)
  const rangeStart = startDateParam
    ? (() => { const d = new Date(startDateParam); d.setHours(0,0,0,0); return d; })()
    : (() => { const d = new Date(startToday); d.setDate(d.getDate() - 13); return d; })();

  const rangeEnd = endDateParam
    ? (() => { const d = new Date(endDateParam); d.setHours(23,59,59,999); return d; })()
    : new Date();

  const storeFilter = storeId && storeId !== "all" ? eq(dailyReports.storeId, storeId) : undefined;

  const [totals] = await db
    .select({
      totalSalesToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.totalSales} else 0 end), 0)`.as("total_sales_today"),
      totalReportsToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then 1 else 0 end), 0)`.as("total_reports_today"),
      totalMessagesSent:
        sql<number>`coalesce(sum(case when ${dailyReports.isPushedToWa} = true then 1 else 0 end), 0)`.as("total_messages_sent"),
      totalSalesMTD:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startOfMonth} then ${dailyReports.totalSales} else 0 end), 0)`.as("total_sales_mtd"),
      totalSalesYTD:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startOfYear} then ${dailyReports.totalSales} else 0 end), 0)`.as("total_sales_ytd"),
      totalSalesYesterday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startYesterday} and ${dailyReports.reportDate} < ${startToday} then ${dailyReports.totalSales} else 0 end), 0)`.as("total_sales_yesterday"),
      totalSalesGroceriesToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.salesGroceries} else 0 end), 0)`.as("total_sales_groceries_today"),
      totalSalesLpgToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.salesLpg} else 0 end), 0)`.as("total_sales_lpg_today"),
      totalSalesPelumasToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.salesPelumas} else 0 end), 0)`.as("total_sales_pelumas_today"),
      totalWasteToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.waste} else 0 end), 0)`.as("total_waste_today"),
      totalLossesToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.losses} else 0 end), 0)`.as("total_losses_today"),
      totalStoreSehat:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} and ${dailyReports.isStoreHealthy} = 'store sehat' then 1 else 0 end), 0)`.as("total_store_sehat"),
      totalStoreTidakSehat:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} and ${dailyReports.isStoreHealthy} != 'store sehat' then 1 else 0 end), 0)`.as("total_store_tidak_sehat"),
      totalSalesRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.totalSales} else 0 end), 0)`.as("total_sales_range"),
      totalWasteRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.waste} else 0 end), 0)`.as("total_waste_range"),
      totalLossesRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.losses} else 0 end), 0)`.as("total_losses_range"),
      totalGroceriesRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.salesGroceries} else 0 end), 0)`.as("total_groceries_range"),
      totalLpgRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.salesLpg} else 0 end), 0)`.as("total_lpg_range"),
      totalPelumasRange:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${rangeStart} and ${dailyReports.reportDate} <= ${rangeEnd} then ${dailyReports.salesPelumas} else 0 end), 0)`.as("total_pelumas_range"),
    })
    .from(dailyReports)
    .where(storeFilter);

  const rows = await db
    .select({
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales,
      salesGroceries: dailyReports.salesGroceries,
      salesLpg: dailyReports.salesLpg,
      salesPelumas: dailyReports.salesPelumas,
      waste: dailyReports.waste,
      losses: dailyReports.losses,
      isPushedToWa: dailyReports.isPushedToWa
    })
    .from(dailyReports)
    .where(and(gte(dailyReports.reportDate, rangeStart), storeFilter))
    .orderBy(desc(dailyReports.reportDate));

  const diffMs = rangeEnd.getTime() - rangeStart.getTime();
  const diffDays = Math.min(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 31);

  const mapByDate = new Map<
    string,
    { date: string; totalSales: number; salesGroceries: number; salesLpg: number; salesPelumas: number; waste: number; losses: number; reports: number; waSent: number }
  >();

  const rangeStartCopy = new Date(rangeStart);
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(rangeStartCopy);
    d.setDate(rangeStartCopy.getDate() + i);
    const key = formatDateKey(d);
    mapByDate.set(key, { date: key, totalSales: 0, salesGroceries: 0, salesLpg: 0, salesPelumas: 0, waste: 0, losses: 0, reports: 0, waSent: 0 });
  }

  for (const row of rows) {
    if (!row.reportDate) continue;
    const dateKey = formatDateKey(new Date(row.reportDate));
    const agg = mapByDate.get(dateKey);
    if (!agg) continue;
    agg.totalSales += Number(row.totalSales ?? 0);
    agg.salesGroceries += Number(row.salesGroceries ?? 0);
    agg.salesLpg += Number(row.salesLpg ?? 0);
    agg.salesPelumas += Number(row.salesPelumas ?? 0);
    agg.waste += Number(row.waste ?? 0);
    agg.losses += Number(row.losses ?? 0);
    agg.reports += 1;
    agg.waSent += row.isPushedToWa ? 1 : 0;
  }
  
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [storeCount] = await db.select({ count: sql<number>`count(*)` }).from(store);

  const chart = Array.from(mapByDate.values());

  const totalSalesRange = Number(totals?.totalSalesRange ?? 0);
  const totalGroceriesRange = Number(totals?.totalGroceriesRange ?? 0);
  const totalLpgRange = Number(totals?.totalLpgRange ?? 0);
  const totalPelumasRange = Number(totals?.totalPelumasRange ?? 0);

  const latestReportCondition = storeId && storeId !== "all" 
    ? and(eq(dailyReports.authorId, session.user.id), gte(dailyReports.reportDate, rangeStart), eq(dailyReports.storeId, storeId))
    : and(eq(dailyReports.authorId, session.user.id), gte(dailyReports.reportDate, rangeStart));

  const [latestReport] = await db
    .select({
      id: dailyReports.id,
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales,
      isPushedToWa: dailyReports.isPushedToWa
    })
    .from(dailyReports)
    .where(latestReportCondition)
    .orderBy(desc(dailyReports.reportDate))
    .limit(1);

  const kendalaRows = await db
    .select({
      kendala: dailyReports.formKendala,
      count: sql<number>`count(*)::integer`
    })
    .from(dailyReports)
    .where(and(gte(dailyReports.reportDate, rangeStart), storeFilter))
    .groupBy(dailyReports.formKendala);

  const totalReportsInRange = kendalaRows.reduce((acc, row) => acc + (row.count || 0), 0);
  
  const storeConditions = kendalaRows.map(row => {
    const count = row.count || 0;
    const title = row.kendala && row.kendala.trim() !== "" ? row.kendala : "Normal / Tidak Ada Kendala";
    return {
      title,
      count,
      percent: totalReportsInRange > 0 ? (count / totalReportsInRange) * 100 : 0
    };
  });
  
  const aggregatedConditions = storeConditions.reduce((acc, curr) => {
    const existing = acc.find(item => item.title === curr.title);
    if (existing) {
      existing.count += curr.count;
      existing.percent = totalReportsInRange > 0 ? (existing.count / totalReportsInRange) * 100 : 0;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as { title: string, count: number, percent: number }[]);

  return NextResponse.json({
    summary: {
      totalSalesToday: Number(totals?.totalSalesToday ?? 0),
      totalSalesYesterday: Number(totals?.totalSalesYesterday ?? 0),
      totalReportsToday: Number(totals?.totalReportsToday ?? 0),
      totalMessagesSent: Number(totals?.totalMessagesSent ?? 0),
      totalSalesMTD: Number(totals?.totalSalesMTD ?? 0),
      totalSalesYTD: Number(totals?.totalSalesYTD ?? 0),
      totalSalesGroceriesToday: Number(totals?.totalSalesGroceriesToday ?? 0),
      totalSalesLpgToday: Number(totals?.totalSalesLpgToday ?? 0),
      totalSalesPelumasToday: Number(totals?.totalSalesPelumasToday ?? 0),
      totalWasteToday: Number(totals?.totalWasteToday ?? 0),
      totalLossesToday: Number(totals?.totalLossesToday ?? 0),
      totalUsers: Number(userCount?.count ?? 0),
      totalStores: Number(storeCount?.count ?? 0),
      totalStoreSehat: Number(totals?.totalStoreSehat ?? 0),
      totalStoreTidakSehat: Number(totals?.totalStoreTidakSehat ?? 0),
      totalSalesRange,
      totalWasteRange: Number(totals?.totalWasteRange ?? 0),
      totalLossesRange: Number(totals?.totalLossesRange ?? 0),
      compositionRange: {
        groceries: totalSalesRange > 0 ? Math.round((totalGroceriesRange / totalSalesRange) * 1000) / 10 : 0,
        lpg: totalSalesRange > 0 ? Math.round((totalLpgRange / totalSalesRange) * 1000) / 10 : 0,
        pelumas: totalSalesRange > 0 ? Math.round((totalPelumasRange / totalSalesRange) * 1000) / 10 : 0,
        nonFuel: totalSalesRange > 0
          ? Math.round(((totalSalesRange - totalGroceriesRange - totalLpgRange - totalPelumasRange) / totalSalesRange) * 1000) / 10
          : 0,
        rawGroceries: totalGroceriesRange,
        rawLpg: totalLpgRange,
        rawPelumas: totalPelumasRange,
        rawNonFuel: Math.max(0, totalSalesRange - totalGroceriesRange - totalLpgRange - totalPelumasRange),
      },
      storeConditions: aggregatedConditions,
      latestOwnReport: latestReport ?? null
    },
    chart
  });
}
