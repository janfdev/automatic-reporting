import { db } from "@/db";
import {
  dailyReports,
  store,
  storeReportSummaries,
  waGroups,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  formatCurrency,
  WA_TEMPLATE,
  renderTemplate,
  loadPeriodSummary,
  getMonthLabel,
  fillDailySalesGaps,
} from "@/lib/wa-message";

const sendWaGroupSchema = z.object({
  reportId: z.string(),
  groupId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const requestBody = await req.json();
  const parsed = sendWaGroupSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Payload tidak valid" },
      { status: 400 },
    );
  }

  const { reportId, groupId } = parsed.data;

  const group = await db
    .select()
    .from(waGroups)
    .where(eq(waGroups.groupId, groupId))
    .limit(1);

  if (group.length === 0) {
    return Response.json(
      { success: false, error: "Group tidak ditemukan" },
      { status: 404 },
    );
  }

  const userRec = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!userRec?.storeId) {
    return Response.json(
      {
        success: false,
        error: "Akun ini belum memiliki outlet (store) yang ditetapkan.",
      },
      { status: 400 },
    );
  }

  const reportList = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, reportId))
    .limit(1);

  const report = reportList[0];
  if (!report) {
    return new Response("Report not found", { status: 404 });
  }

  if (userRec.role !== "admin" && report.storeId !== userRec.storeId) {
    return Response.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
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
    1,
  );
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfNextMonth = new Date(
    reportDate.getFullYear(),
    reportDate.getMonth() + 1,
    1,
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
    periodEnd: startOfNextMonth,
  });

  const ytdSummary = await loadPeriodSummary({
    storeId: report.storeId,
    periodType: "ytd",
    periodKey: yearKey,
    periodLabel: `YTD ${reportDate.getFullYear()}`,
    periodStart: startOfYear,
    periodEnd: startOfNextYear,
  });

  const monthlyReports = await db
    .select({
      reportDate: dailyReports.reportDate,
      totalSales: dailyReports.totalSales,
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.storeId, report.storeId),
        gte(dailyReports.reportDate, startOfMonth),
        lt(dailyReports.reportDate, startOfNextMonth),
      ),
    )
    .orderBy(dailyReports.reportDate);

  // Tampilkan seluruh hari dalam bulan (hari kosong = Rp 0)
  const endOfMonth = new Date(startOfNextMonth.getTime() - 1);
  const salesDetailsList = fillDailySalesGaps(
    monthlyReports,
    startOfMonth,
    endOfMonth,
  );

  const monthlySummaries = await db
    .select()
    .from(storeReportSummaries)
    .where(
      and(
        eq(storeReportSummaries.storeId, report.storeId),
        eq(storeReportSummaries.periodType, "mtd"),
      ),
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
        eq(storeReportSummaries.periodType, "ytd"),
      ),
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
    year: "numeric",
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
    SALES_DETAILS_LIST: salesDetailsList,
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
    NEED_SUPPORT: report.needSupport || "-",
  };

  const message = renderTemplate(WA_TEMPLATE, mapping);

  try {
    const token = process.env.FONNTE_TOKEN_WA;
    if (!token) {
      return Response.json(
        {
          success: false,
          error: "Konfigurasi gateway belum lengkap: FONNTE_TOKEN",
        },
        { status: 500 },
      );
    }

    const waBody = new URLSearchParams();
    waBody.append("target", groupId);
    waBody.append("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: waBody.toString(),
    });

    const rawResponse = await res.text();
    let fonnteResponse: unknown = rawResponse;

    try {
      fonnteResponse = JSON.parse(rawResponse);
    } catch {
      // Fonnte may return plain text on error.
    }

    const responseObject =
      fonnteResponse && typeof fonnteResponse === "object"
        ? (fonnteResponse as Record<string, unknown>)
        : null;
    const isFonnteSuccess =
      res.ok && responseObject
        ? responseObject.status === true || responseObject.Status === true
        : res.ok;

    if (!isFonnteSuccess) {
      const fallbackReason = rawResponse
        ? rawResponse
        : "Gateway menolak request pengiriman.";
      const reason =
        responseObject?.reason ?? responseObject?.detail ?? fallbackReason;

      return Response.json(
        {
          success: false,
          error: String(reason),
          gatewayResponse: fonnteResponse,
          groupName: group[0].name,
        },
        { status: 502 },
      );
    }

    return Response.json({
      success: true,
      groupName: group[0].name,
      gatewayResponse: fonnteResponse,
    });
  } catch (error) {
    console.error("Error sending WhatsApp to group:", error);
    return Response.json(
      { success: false, error: "Gateway Error" },
      { status: 500 },
    );
  }
}
