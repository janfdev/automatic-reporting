import { NextResponse } from "next/server";
import { desc, eq, inArray, count, and } from "drizzle-orm";
import { db } from "@/db";
import { store, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";

function generateId() {
  return "store_" + nanoid(10);
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized", stores: [], regions: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));
  const offset = (page - 1) * limit;
  const regionFilter = searchParams.get("region");

  const allStores = await db.select({ region: store.region }).from(store);
  const regions = [...new Set(allStores.map(s => s.region).filter(Boolean))].sort();

  const whereClause = regionFilter && regionFilter !== "all"
    ? and(eq(store.region, regionFilter))
    : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(store)
    .where(whereClause);

  const total = Number(totalResult?.total ?? 0);

  const rows = await db
    .select()
    .from(store)
    .where(whereClause)
    .orderBy(desc(store.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    stores: rows,
    regions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type, region, location, targetSpd, operationalYear, operationalHours, priceCluster, seUserId, assignedUserIds } = body;
    const id = generateId();
    const dateNow = new Date();

    let seName: string | null = null;
    if (seUserId) {
      const seUser = await db.query.users.findFirst({
        where: eq(users.id, seUserId)
      });
      seName = seUser?.name || null;
    }

    const saCount = Array.isArray(assignedUserIds) ? assignedUserIds.length : 0;

    await db.insert(store).values({
      id,
      name,
      type: type || "Bright Store",
      region: region || null,
      location,
      seName,
      saCount: saCount || null,
      operationalYear: operationalYear || null,
      operationalHours: operationalHours || null,
      priceCluster: priceCluster || null,
      targetSpd: targetSpd || 0,
      createdAt: dateNow,
      updatedAt: dateNow,
    });

    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      await db.update(users)
        .set({ storeId: id, updatedAt: dateNow })
        .where(inArray(users.id, assignedUserIds));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, type, region, location, targetSpd, operationalYear, operationalHours, priceCluster, seUserId, assignedUserIds } = body;
    const dateNow = new Date();

    let seName: string | null = null;
    if (seUserId) {
      const seUser = await db.query.users.findFirst({
        where: eq(users.id, seUserId)
      });
      seName = seUser?.name || null;
    }

    const saCount = Array.isArray(assignedUserIds) ? assignedUserIds.length : 0;

    await db.update(store)
      .set({
        name,
        type,
        region: region || null,
        location,
        seName,
        saCount: saCount || null,
        operationalYear: operationalYear || null,
        operationalHours: operationalHours || null,
        priceCluster: priceCluster || null,
        targetSpd,
        updatedAt: dateNow
      })
      .where(eq(store.id, id));

    const oldAssigned = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.storeId, id));

    const oldIds = oldAssigned.map(u => u.id);

    const newIds: string[] = Array.isArray(assignedUserIds) ? assignedUserIds : [];

    const toUnassign = oldIds.filter(oid => !newIds.includes(oid));
    const toAssign = newIds.filter(nid => !oldIds.includes(nid));

    if (toUnassign.length > 0) {
      await db.update(users)
        .set({ storeId: null, updatedAt: dateNow })
        .where(inArray(users.id, toUnassign));
    }

    if (toAssign.length > 0) {
      await db.update(users)
        .set({ storeId: id, updatedAt: dateNow })
        .where(inArray(users.id, toAssign));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    await db.update(users)
      .set({ storeId: null, updatedAt: new Date() })
      .where(eq(users.storeId, id));

    await db.delete(store).where(eq(store.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
