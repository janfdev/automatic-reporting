import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reportId, field, status } = body;

    if (!reportId || !field || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (field !== "supportStatus" && field !== "kendalaStatus") {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    if (!["open", "in_progress", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updateObj: Record<string, string> = {};
    updateObj[field] = status;

    await db
      .update(dailyReports)
      .set(updateObj)
      .where(eq(dailyReports.id, reportId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating report status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
