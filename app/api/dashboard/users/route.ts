import { NextResponse } from "next/server";
import { desc, eq, isNull, count } from "drizzle-orm";
import { db } from "@/db";
import { store, users, account, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";

function generateId() {
  return "usr_" + nanoid(10);
}

async function syncStoreAssignment(storeId: string | null) {
  if (!storeId) return;

  const assignedUsers = await db
    .select({ id: users.id, name: users.name, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.storeId, storeId));

  const activeUsers = assignedUsers.filter(u => !u.deletedAt);

  await db.update(store)
    .set({
      seName: activeUsers.length > 0 ? activeUsers[0].name : null,
      saCount: activeUsers.length > 0 ? activeUsers.length : null,
    })
    .where(eq(store.id, storeId));
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const offset = (page - 1) * limit;

  const where = isNull(users.deletedAt);

  const [totalResult] = await db
    .select({ total: count() })
    .from(users)
    .where(where);

  const total = Number(totalResult?.total ?? 0);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      storeId: users.storeId,
      storeName: store.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .leftJoin(store, eq(users.storeId, store.id))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    users: rows.map((row) => ({
      ...row,
      status: row.banned ? "Blocked" : "Active",
    })),
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
    const { name, email, password, role, storeId } = body;
    const userId = generateId();
    const dateNow = new Date();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const targetStoreId = storeId === "none" ? null : storeId;

    await db.insert(users).values({
      id: userId,
      name: name,
      email: email,
      emailVerified: true,
      role: role || "kasir",
      storeId: targetStoreId,
      createdAt: dateNow,
      updatedAt: dateNow,
    });

    const hash = await hashPassword(password);

    await db.insert(account).values({
      id: `acc_${userId}`,
      accountId: email,
      providerId: "credential",
      userId: userId,
      password: hash,
      createdAt: dateNow,
      updatedAt: dateNow,
    });

    await syncStoreAssignment(targetStoreId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating user:", error);
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
    const { id, name, email, password, role, storeId } = body;
    const dateNow = new Date();

    const oldUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    const oldStoreId = oldUser?.storeId || null;
    const newStoreId = storeId === "none" ? null : storeId;

    await db.update(users)
      .set({ 
        name, 
        email, 
        role, 
        storeId: newStoreId,
        updatedAt: dateNow 
      })
      .where(eq(users.id, id));

    if (password && password.trim() !== '') {
      const hash = await hashPassword(password);
      
      const existingAccount = await db.query.account.findFirst({
        where: eq(account.userId, id)
      });

      if (existingAccount) {
        await db.update(account)
          .set({ accountId: email, password: hash, updatedAt: dateNow })
          .where(eq(account.userId, id));
      } else {
        await db.insert(account).values({
          id: `acc_${id}`,
          accountId: email,
          providerId: "credential",
          userId: id,
          password: hash,
          createdAt: dateNow,
          updatedAt: dateNow
        });
      }
    } else {
      await db.update(account)
          .set({ accountId: email, updatedAt: dateNow })
          .where(eq(account.userId, id));
    }

    if (oldStoreId !== newStoreId) {
      await syncStoreAssignment(oldStoreId);
      await syncStoreAssignment(newStoreId);
    } else {
      await syncStoreAssignment(newStoreId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
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
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    const deletedStoreId = userToDelete?.storeId || null;

    await db.update(users)
      .set({ 
        banned: true, 
        deletedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));

    await db.delete(sessionTable).where(eq(sessionTable.userId, id));

    await syncStoreAssignment(deletedStoreId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
