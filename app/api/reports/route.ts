import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { dailyReports, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
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
      isPushedToWa
    } = parsed.data;

    const sanitizedItemOos = itemOos.filter(
      (item) => item.name.trim().length > 0
    );

    // Hitung total otomatis dari server
    const totalSales =
      Number(salesGroceries) + Number(salesLpg) + Number(salesPelumas);

    const newId = "daily" + nanoid(10);
    const newReport = await db
      .insert(dailyReports)
      .values({
        id: newId,
        storeId: userRec.storeId,
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
        isPushedToWa
      })
      .returning();

    return NextResponse.json({ success: true, data: newReport[0] });
  } catch (e) {
    console.error("API /api/reports Error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menyimpan data." },
      { status: 500 }
    );
  }
}
