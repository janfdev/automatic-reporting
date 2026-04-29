import { db } from "@/db";
import { dailyReports, store, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const sendWaSchema = z.object({
  reportId: z.string()
});
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const requestBody = await req.json();

  const parsed = sendWaSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Payload tidak valid" },
      { status: 400 }
    );
  }

  const { reportId } = parsed.data;
  const userRec = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });
  if (!userRec?.storeId) {
    return Response.json(
      {
        success: false,
        error: "Akun ini belum memiliki outlet (store) yang ditetapkan."
      },
      { status: 400 }
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
        error: "Forbidden"
      },
      { status: 403 }
    );
  }

  const storeList = await db
    .select()
    .from(store)
    .where(eq(store.id, report.storeId))
    .limit(1);
  const storeData = storeList[0];

  const date = report.reportDate ? new Date(report.reportDate) : new Date();
  const dateString = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  // Parsing JSON items
  const itemOos = Array.isArray(report.itemOos) ? report.itemOos : [];
  const oosString =
    itemOos.length > 0
      ? itemOos
          .map((item: Record<string, string>) => `- ${item.name}`)
          .join("\n")
      : "- Tidak ada";

  const totalSales = report.totalSales || 0;
  const targetSpd = storeData?.targetSpd || 0;
  const pencapaian =
    targetSpd > 0 ? ((totalSales / targetSpd) * 100).toFixed(0) : 0;

  // Coba meniru template
  const message = `*Laporan Sales Tanggal ${dateString}*

  *Store: ${storeData?.name || "-"}*
  Tahun Oprasional : ${storeData?.operationalYear || "-"}
  Nama SE: ${storeData?.seName || "-"}
  Jumlah Shift : 3 (Default)
  Jumlah SA : ${storeData?.saCount || "-"}
  Jam Operasional: ${storeData?.operationalHours || "-"}
  Cluster Harga : ${storeData?.priceCluster || "-"}
  PL Ytd (Data Dummy) : -
  Kondisi store : *Sehat* 🟢

  *Rincian Sales*
  Groceries Bright  : Rp ${(report.salesGroceries || 0).toLocaleString("id-ID")}
  Sales LPG           : Rp ${(report.salesLpg || 0).toLocaleString("id-ID")}
  Pelumas                : Rp ${(report.salesPelumas || 0).toLocaleString("id-ID")}
  Total Sales  (SPD) : Rp ${totalSales.toLocaleString("id-ID")}
  Target SPD store   : Rp ${targetSpd.toLocaleString("id-ID")}
  % Pencapaian Target : ${pencapaian}%

  *Info SC & MD*
  % Fulfillment PB = ${report.fulfillmentPb || 0}%
  % Avg Fulfillment DC = ${report.avgFulfillmentDc || 0}%

  *Item OOS Store Fast Moving*
  ${oosString}

  *Stock LPG*
  LPG 3kg : ${report.stockLpg3kg || 0}
  LPG 5,5 kg : ${report.stockLpg5kg || 0}
  LPG 12kg : ${report.stockLpg12kg || 0}

  MTD
  *Pencapaian Sales MTD (Belum ada data real time MTD)*
  Total Sales MTD : Menunggu Kalkulasi
  Sales Per Day MTD : Menunggu Kalkulasi

  *Shrinkage Management*
  (Losses, waste, own use)
  Waste : ${(report.waste || 0).toLocaleString("id-ID")}
  Losses : ${(report.losses || 0).toLocaleString("id-ID")}
  Own use : -

  *Need Support:*
  ${report.needSupport || "-"}

  *Semangat! 💪🏻*
  Have a *Bright* Day! 🌤️`;

  //   const message = `*Laporan Sales Tanggal ${dateString}*

  // *Store: ${storeData?.name || "-"}*
  // Tahun Oprasional : ${storeData?.operationalYear || "-"}
  // Nama SE: ${storeData?.seName || "-"}
  // Jumlah Shift : 3 (Default)
  // Jumlah SA : ${storeData?.saCount || "-"}
  // Jam Operasional: ${storeData?.operationalHours || "-"}
  // Cluster Harga : ${storeData?.priceCluster || "-"}
  // PL Ytd (Data Dummy) : -
  // Kondisi store : *Sehat* 🟢`;

  try {
    const token = process.env.FONNTE_TOKEN;
    const target = process.env.WA_TUJUAN_LAPORAN;

    if (!token || !target) {
      return Response.json(
        { success: false, error: "Konfigurasi gateway belum lengkap." },
        { status: 500 }
      );
    }

    const waBody = new URLSearchParams();
    waBody.append("target", target);
    waBody.append("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: waBody.toString()
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
          gatewayResponse: fonnteResponse
        },
        { status: 502 }
      );
    }

    return Response.json({ success: true, gatewayResponse: fonnteResponse });
  } catch (error) {
    console.error("Error sending WhatsApp report:", error);
    return Response.json(
      { success: false, error: "Gateway Error" },
      { status: 500 }
    );
  }
}
