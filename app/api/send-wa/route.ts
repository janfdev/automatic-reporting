import { db } from "@/db";
import { dailyReports, store, storeReportSummaries, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { fillDailySalesGaps } from "@/lib/wa-message";

const sendWaSchema = z.object({
  reportId: z.string(),
  groupIds: z.array(z.string()).optional(),
});

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

async function loadPeriodSummary(params: {
  storeId: string;
  periodType: "mtd" | "ytd";
  periodKey: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const summary = await db.query.storeReportSummaries.findFirst({
    where: and(
      eq(storeReportSummaries.storeId, params.storeId),
      eq(storeReportSummaries.periodType, params.periodType),
      eq(storeReportSummaries.periodKey, params.periodKey),
    ),
  });

  if (summary) return summary;

  const [totals] = await db
    .select({
      reportCount: sql<number>`count(distinct date_trunc('day', ${dailyReports.reportDate}))::int`,
      totalSales: sql<number>`coalesce(sum(${dailyReports.totalSales}), 0)`,
      salesGroceries: sql<number>`coalesce(sum(${dailyReports.salesGroceries}), 0)`,
      salesLpg: sql<number>`coalesce(sum(${dailyReports.salesLpg}), 0)`,
      salesPelumas: sql<number>`coalesce(sum(${dailyReports.salesPelumas}), 0)`,
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.storeId, params.storeId),
        gte(dailyReports.reportDate, params.periodStart),
        lt(dailyReports.reportDate, params.periodEnd),
      ),
    );

  return {
    id: `${params.storeId}-${params.periodType}-${params.periodKey}`,
    storeId: params.storeId,
    periodType: params.periodType,
    periodKey: params.periodKey,
    periodLabel: params.periodLabel,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    reportCount: Number(totals?.reportCount ?? 0),
    totalSales: Number(totals?.totalSales ?? 0),
    salesGroceries: Number(totals?.salesGroceries ?? 0),
    salesLpg: Number(totals?.salesLpg ?? 0),
    salesPelumas: Number(totals?.salesPelumas ?? 0),
    targetSpdSnapshot: 0,
    lastReportDate: params.periodEnd,
    updatedAt: new Date(),
  };
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

const WA_TEMPLATE = `*Laporan Sales Tanggal {{ DATE }}*
(Operational: 06:00 - 24:00)

*Store: {{ STORE_NAME }}*
* Tahun Oprasional : {{ OPERATIONAL_YEAR }}
* Nama SE: {{ SE_NAME }}
* Jumlah Shift : 3 Shift
* Jumlah SA : {{ SA_COUNT }} orang
* Jam Operasional: {{ OP_HOURS }}
* Cluster Harga : {{ PRICE_CLUSTER }}
* PL Ytd : -
Kondisi store : *{{ HEALTH_STATUS }}*

*Rincian Sales*
{{ SALES_DETAILS_LIST }}

*Pencapaian Sales {{ MTD_LABEL }}*
* Total Sales MTD : {{ MTD_TOTAL_SALES }}
* Sales Per Day MTD: {{ MTD_SPD }}

*Monthly SPD:*
{{ MONTHLY_SPD_LIST }}

*Yearly SPD:*
{{ YEARLY_SPD_LIST }}

*Detail Sales*
* Groceries: {{ DETAIL_GROCERIES }}
* Sales LPG: {{ DETAIL_LPG }}
* Pelumas: {{ DETAIL_PELUMAS }}

*Total Sales (SPD)* : {{ TOTAL_SALES }}
*Target SPD*: {{ TARGET_SPD }}
*% Pencapaian Target {{ PENCAPAIAN }}%*

*Shrinkage Management*
(Losses, waste)
* Waste: Rp {{ WASTE }}
* Losses: Rp {{ LOSSES }}

*Stock LPG hari ini* tanggal {{ DATE }}
* LPG 3kg : {{ STOCK_LPG_3KG }} tabung
* LPG 5,5 kg : {{ STOCK_LPG_5_5KG }} tabung
* LPG 12kg : {{ STOCK_LPG_12KG }} tabung

*Info SC & MD*
* Fulfillment PB terakhir = {{ FULFILLMENT_PB }}
* Avg Fulfillment DC = {{ AVG_FULFILLMENT_DC }}

*Item OOS Store Fast Moving*
{{ OOS_ITEMS }}

*Kendala:*
{{ KENDALA }}

*Need Support:*
{{ NEED_SUPPORT }}

*Semangat!*
Have a *Bright* Day`;

function renderTemplate(
  template: string,
  mapping: Record<string, string | number>,
) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    const val = mapping[key.toUpperCase()];
    return val === undefined || val === null ? "" : String(val);
  });
}

function isValidPhoneNumber(num: string) {
  return /^\d{7,15}$/.test(num);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const requestBody = await req.json();

  const parsed = sendWaSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Payload tidak valid" },
      { status: 400 },
    );
  }

  const { reportId, groupIds } = parsed.data;
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

  // Ambil data report dari Database
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
      {
        success: false,
        error: "Forbidden",
      },
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

  // Ambil rincian sales harian untuk bulan berjalan
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

  // Ambil riwayat Monthly SPD (6 bulan terakhir)
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

  // Ambil riwayat Yearly SPD
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

  // Parsing JSON items
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

  const rawTargets: string[] = [];
  const singleVar = process.env.WA_TUJUAN_LAPORAN;
  if (singleVar) {
    singleVar
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => rawTargets.push(t));
  }
  for (const key in process.env) {
    if (key.startsWith("WA_TUJUAN_LAPORAN_")) {
      const val = process.env[key]?.trim();
      if (val) rawTargets.push(val);
    }
  }

  const validTargets: string[] = [];
  const invalidTargets: string[] = [];
  Array.from(new Set(rawTargets)).forEach((t) => {
    if (isValidPhoneNumber(t)) validTargets.push(t);
    else invalidTargets.push(t);
  });

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
    if (!token || validTargets.length === 0) {
      const missing = !token ? "FONNTE_TOKEN" : "no valid WA targets";
      return Response.json(
        {
          success: false,
          error: `Konfigurasi gateway belum lengkap: ${missing}`,
          invalidTargets: invalidTargets,
        },
        { status: 500 },
      );
    }

    const deliveryResults: {
      target: string;
      success: boolean;
      error?: string;
      gatewayResponse?: unknown;
    }[] = [];
    for (const target of validTargets) {
      const waBody = new URLSearchParams();
      waBody.append("target", target);
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
        deliveryResults.push({
          target,
          success: false,
          error: String(reason),
          gatewayResponse: fonnteResponse,
        });
      } else {
        deliveryResults.push({
          target,
          success: true,
          gatewayResponse: fonnteResponse,
        });
      }
    }

    const failedDeliveries = deliveryResults.filter(
      (result) => !result.success,
    );
    const successDeliveries = deliveryResults.filter(
      (result) => result.success,
    );

    if (successDeliveries.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Semua nomor gagal menerima pesan WhatsApp.",
          failedTargets: failedDeliveries.map((result) => ({
            target: result.target,
            error: result.error,
          })),
          results: deliveryResults,
        },
        { status: 502 },
      );
    }

    return Response.json({
      success: true,
      warning:
        failedDeliveries.length > 0
          ? "Sebagian nomor gagal menerima pesan WhatsApp."
          : undefined,
      failedTargets:
        failedDeliveries.length > 0
          ? failedDeliveries.map((result) => ({
              target: result.target,
              error: result.error,
            }))
          : [],
      results: deliveryResults,
    });
  } catch (error) {
    console.error("Error sending WhatsApp report:", error);
    return Response.json(
      { success: false, error: "Gateway Error" },
      { status: 500 },
    );
  }
}
