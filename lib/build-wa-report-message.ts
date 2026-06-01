import { db } from "@/db";
import { dailyReports, store, storeReportSummaries, users } from "@/db/schema";
import {
  formatCurrency,
  getMonthLabel,
  loadPeriodSummary,
  renderTemplate,
  WA_TEMPLATE
} from "@/lib/wa-message";
import { and, eq, gte, lt, sql } from "drizzle-orm";

export class WaReportMessageError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WaReportMessageError";
    this.status = status;
  }
}

function assertWaReportMessageError(
  condition: unknown,
  message: string,
  status = 400
): asserts condition {
  if (!condition) {
    throw new WaReportMessageError(message, status);
  }
}

export async function buildWaReportMessage(params: {
  reportId: string;
  sessionUserId: string;
}) {
  const userRec = await db.query.users.findFirst({
    where: eq(users.id, params.sessionUserId)
  });

  assertWaReportMessageError(
    userRec?.storeId,
    "Akun ini belum memiliki outlet (store) yang ditetapkan.",
    400
  );

  const reportList = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, params.reportId))
    .limit(1);

  const report = reportList[0];

  assertWaReportMessageError(report, "Report not found", 404);

  if (userRec.role !== "admin" && report.storeId !== userRec.storeId) {
    throw new WaReportMessageError("Forbidden", 403);
  }

  const storeList = await db
    .select()
    .from(store)
    .where(eq(store.id, report.storeId))
    .limit(1);
  const storeData = storeList[0];

  const reportDate = report.reportDate
    ? new Date(report.reportDate)
    : new Date();
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

  const monthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, "0")}`;
  const yearKey = `${reportDate.getFullYear()}`;

  const mtdSummary = await loadPeriodSummary({
    storeId: report.storeId,
    periodType: "mtd",
    periodKey: monthKey,
    periodLabel: `MTD ${getMonthLabel(reportDate)}`,
    periodStart: startOfMonth,
    periodEnd: startOfNextMonth
  });

  const ytdSummary = await loadPeriodSummary({
    storeId: report.storeId,
    periodType: "ytd",
    periodKey: yearKey,
    periodLabel: `YTD ${reportDate.getFullYear()}`,
    periodStart: startOfYear,
    periodEnd: startOfNextYear
  });

  const monthlyReports = await db
    .select({
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.storeId, report.storeId),
        gte(dailyReports.reportDate, startOfMonth),
        lt(dailyReports.reportDate, startOfNextMonth)
      )
    )
    .orderBy(dailyReports.reportDate);

  const salesDetailsList = monthlyReports
    .map((r) => {
      const d = new Date(r.reportDate);
      const fmtDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      return `${fmtDate} : ${formatCurrency(r.totalSales || 0)}`;
    })
    .join("\n");

  const monthlySummaries = await db
    .select()
    .from(storeReportSummaries)
    .where(
      and(
        eq(storeReportSummaries.storeId, report.storeId),
        eq(storeReportSummaries.periodType, "mtd")
      )
    )
    .orderBy(sql`${storeReportSummaries.periodKey} DESC`)
    .limit(6);

  const monthlySpdList = monthlySummaries
    .reverse()
    .map((s) => {
      const spd = s.reportCount > 0 ? s.totalSales / s.reportCount : 0;
      return `* ${s.periodLabel} : ${formatCurrency(Math.round(spd))}`;
    })
    .join("\n");

  const yearlySummaries = await db
    .select()
    .from(storeReportSummaries)
    .where(
      and(
        eq(storeReportSummaries.storeId, report.storeId),
        eq(storeReportSummaries.periodType, "ytd")
      )
    )
    .orderBy(sql`${storeReportSummaries.periodKey} DESC`)
    .limit(3);

  const yearlySpdList = yearlySummaries
    .reverse()
    .map((s) => {
      const spd = s.reportCount > 0 ? s.totalSales / s.reportCount : 0;
      return `* ${s.periodLabel} : ${formatCurrency(Math.round(spd))}`;
    })
    .join("\n");

  const mtdSpd =
    mtdSummary.reportCount > 0
      ? mtdSummary.totalSales / mtdSummary.reportCount
      : 0;

  const dateString = reportDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const itemOos = Array.isArray(report.itemOos) ? report.itemOos : [];
  const oosString =
    itemOos.length > 0
      ? itemOos
          .map((item: Record<string, string>) => `- ${item.name}`)
          .join("\n")
      : "Tidak ada item OOS";

  const totalSales = report.totalSales || 0;
  const targetSpd = storeData?.targetSpd || 0;
  const pencapaian =
    targetSpd > 0 ? ((totalSales / targetSpd) * 100).toFixed(0) : 0;

  const healthStatus =
    report.isStoreHealthy === "store tidak sehat"
      ? "Tidak Sehat 🔴"
      : "Sehat 🟢";

  const mapping: Record<string, string | number> = {
    DATE: dateString,
    STORE_NAME: storeData?.name || "-",
    OPERATIONAL_YEAR: storeData?.operationalYear || "-",
    SE_NAME: userRec?.name || "-",
    SA_COUNT: storeData?.saCount || "-",
    OP_HOURS: storeData?.operationalHours || "-",
    PRICE_CLUSTER: storeData?.priceCluster || "-",
    HEALTH_STATUS: healthStatus,
    SALES_DETAILS_LIST: salesDetailsList || "Belum ada data sales bulan ini",
    DETAIL_GROCERIES: formatCurrency(report.salesGroceries || 0),
    DETAIL_LPG: formatCurrency(report.salesLpg || 0),
    DETAIL_PELUMAS: formatCurrency(report.salesPelumas || 0),
    MTD_LABEL: mtdSummary.periodLabel,
    MTD_TOTAL_SALES: formatCurrency(Number(mtdSummary.totalSales ?? 0)),
    MTD_SPD: formatCurrency(Math.round(mtdSpd)),
    MONTHLY_SPD_LIST: monthlySpdList || "-",
    YEARLY_SPD_LIST: yearlySpdList || "-",
    TOTAL_SALES: formatCurrency(totalSales),
    TARGET_SPD: formatCurrency(targetSpd),
    PENCAPAIAN: pencapaian,
    FULFILLMENT_PB: `${report.fulfillmentPb || 0}%`,
    AVG_FULFILLMENT_DC: `${report.avgFulfillmentDc || 0}%`,
    OOS_ITEMS: oosString,
    STOCK_LPG_3KG: report.stockLpg3kg || 0,
    STOCK_LPG_5_5KG: report.stockLpg5kg || 0,
    STOCK_LPG_12KG: report.stockLpg12kg || 0,
    YTD_LABEL: ytdSummary.periodLabel,
    WASTE: (report.waste || 0).toLocaleString("id-ID"),
    LOSSES: (report.losses || 0).toLocaleString("id-ID"),
    KENDALA: report.formKendala || "-",
    NEED_SUPPORT: report.needSupport || "-"
  };

  const message = renderTemplate(WA_TEMPLATE, mapping);

  return {
    message,
    report,
    storeData,
    reportDate,
    mtdSummary,
    ytdSummary
  };
}
