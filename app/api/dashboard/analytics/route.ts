import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { auth } from "@/lib/auth";

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastNDates(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    result.push(formatDateKey(d));
  }

  return result;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date(startToday);
  fourteenDaysAgo.setDate(startToday.getDate() - 13);

  const [totals] = await db
    .select({
      totalSalesToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then ${dailyReports.totalSales} else 0 end), 0)`.as(
          "total_sales_today"
        ),
      totalReportsToday:
        sql<number>`coalesce(sum(case when ${dailyReports.reportDate} >= ${startToday} then 1 else 0 end), 0)`.as(
          "total_reports_today"
        ),
      totalMessagesSent:
        sql<number>`coalesce(sum(case when ${dailyReports.isPushedToWa} = true then 1 else 0 end), 0)`.as(
          "total_messages_sent"
        )
    })
    .from(dailyReports);

  const rows = await db
    .select({
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales,
      isPushedToWa: dailyReports.isPushedToWa
    })
    .from(dailyReports)
    .where(gte(dailyReports.reportDate, fourteenDaysAgo))
    .orderBy(desc(dailyReports.reportDate));

  const mapByDate = new Map<
    string,
    { date: string; totalSales: number; reports: number; waSent: number }
  >();

  for (const day of getLastNDates(14)) {
    mapByDate.set(day, { date: day, totalSales: 0, reports: 0, waSent: 0 });
  }

  for (const row of rows) {
    if (!row.reportDate) continue;
    const dateKey = formatDateKey(new Date(row.reportDate));
    const agg = mapByDate.get(dateKey);
    if (!agg) continue;
    agg.totalSales += Number(row.totalSales ?? 0);
    agg.reports += 1;
    agg.waSent += row.isPushedToWa ? 1 : 0;
  }

  const chart = Array.from(mapByDate.values());

  const [latestReport] = await db
    .select({
      id: dailyReports.id,
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales,
      isPushedToWa: dailyReports.isPushedToWa
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.authorId, session.user.id),
        gte(dailyReports.reportDate, fourteenDaysAgo)
      )
    )
    .orderBy(desc(dailyReports.reportDate))
    .limit(1);

  return NextResponse.json({
    summary: {
      totalSalesToday: Number(totals?.totalSalesToday ?? 0),
      totalReportsToday: Number(totals?.totalReportsToday ?? 0),
      totalMessagesSent: Number(totals?.totalMessagesSent ?? 0),
      latestOwnReport: latestReport ?? null
    },
    chart
  });
}
