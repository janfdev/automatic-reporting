import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, users, store } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, count, desc, eq, isNotNull, ne, or } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "super_admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10")),
  );
  const offset = (page - 1) * limit;
  const type = searchParams.get("type"); // "support" | "kendala" | undefined (= both)

  // Build where clause based on type filter
  // Exclude nilai default ("Aman" = tidak butuh support, "Tidak ada" = tidak ada kendala)
  const whereSupport = and(
    isNotNull(dailyReports.needSupport),
    ne(dailyReports.needSupport, ""),
    ne(dailyReports.needSupport, "Aman"),
  );
  const whereKendala = and(
    isNotNull(dailyReports.formKendala),
    ne(dailyReports.formKendala, ""),
    ne(dailyReports.formKendala, "Tidak ada"),
  );

  const where =
    type === "support"
      ? whereSupport
      : type === "kendala"
        ? whereKendala
        : or(whereSupport, whereKendala);

  const [totalResult] = await db
    .select({ total: count() })
    .from(dailyReports)
    .where(where);

  const total = Number(totalResult?.total ?? 0);

  const rows = await db
    .select({
      id: dailyReports.id,
      reportDate: dailyReports.reportDate,
      needSupport: dailyReports.needSupport,
      formKendala: dailyReports.formKendala,
      supportStatus: dailyReports.supportStatus,
      kendalaStatus: dailyReports.kendalaStatus,
      storeName: store.name,
      authorName: users.name,
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
}
