import { NextResponse } from "next/server";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { store, users, account, session as sessionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";

function generateId() {
  return "usr_" + Math.random().toString(36).substring(2, 10);
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      storeName: store.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .leftJoin(store, eq(users.storeId, store.id))
    .orderBy(desc(users.createdAt));

  return NextResponse.json({
    users: rows.map((row) => ({
      ...row,
      status: row.banned ? "Blocked" : "Active",
    })),
    total: rows.length,
  });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;
    const userId = generateId();
    const dateNow = new Date();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    await db.insert(users).values({
      id: userId,
      name: name,
      email: email,
      emailVerified: true,
      role: role || "kasir",
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
    const { id, name, email, password, role } = body;
    const dateNow = new Date();

    await db.update(users)
      .set({ name, email, role, updatedAt: dateNow })
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

    // Mark as banned and set deletedAt for soft delete
    await db.update(users)
      .set({ 
        banned: true, 
        deletedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));

    // Delete sessions to force immediate logout
    await db.delete(sessionTable).where(eq(sessionTable.userId, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
