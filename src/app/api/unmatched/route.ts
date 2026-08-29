import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  const items = await db.unmatchedScrapeItem.findMany({
    where: { householdId: session.householdId, resolvedAt: null },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json(items);
}
