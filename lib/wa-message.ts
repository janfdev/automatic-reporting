import { db } from "@/db";
import { dailyReports, storeReportSummaries } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

export function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export const WA_TEMPLATE = `*Laporan Sales Tanggal {{ DATE }}*
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

*Detail Sales*
* Groceries: {{ DETAIL_GROCERIES }}
* Sales LPG: {{ DETAIL_LPG }}
* Pelumas: {{ DETAIL_PELUMAS }}

*Total Sales (SPD)* : {{ TOTAL_SALES }}
*Target SPD*: {{ TARGET_SPD }}
*% Pencapaian Target {{ PENCAPAIAN }}%*

*Info SC & MD*
* Fulfillment PB terakhir = {{ FULFILLMENT_PB }}
* Avg Fulfillment DC = {{ AVG_FULFILLMENT_DC }}

*Item OOS Store Fast Moving*
{{ OOS_ITEMS }}

*Stock LPG hari ini* tanggal {{ DATE }}
* LPG 3kg : {{ STOCK_LPG_3KG }} tabung
* LPG 5,5 kg : {{ STOCK_LPG_5_5KG }} tabung
* LPG 12kg : {{ STOCK_LPG_12KG }} tabung

MTD
*Pencapaian Sales {{ MTD_LABEL }}*
* Total Sales MTD : {{ MTD_TOTAL_SALES }}
* Sales Per Day MTD: {{ MTD_SPD }}

*Monthly SPD:*
{{ MONTHLY_SPD_LIST }}

*Yearly SPD:*
{{ YEARLY_SPD_LIST }}

*Shrinkage Management*
(Losses, waste)

* Waste: Rp {{ WASTE }}
* Losses: Rp {{ LOSSES }}

*Kendala:*
{{ KENDALA }}

*Need Support:*
{{ NEED_SUPPORT }}

*Semangat! 💪🏻*
Have a *Bright* Day🌤️`;

export function renderTemplate(
  template: string,
  mapping: Record<string, string | number>
) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    const val = mapping[key.toUpperCase()];
    return val === undefined || val === null ? "" : String(val);
  });
}

export async function loadPeriodSummary(params: {
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
      eq(storeReportSummaries.periodKey, params.periodKey)
    )
  });

  if (summary) return summary;

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
        eq(dailyReports.storeId, params.storeId),
        gte(dailyReports.reportDate, params.periodStart),
        lt(dailyReports.reportDate, params.periodEnd)
      )
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
    updatedAt: new Date()
  };
}

export function getMonthLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric"
  });
}
