import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  const stores = await db.purchase.findMany({
    where: { householdId: session.householdId },
    select: { storeName: true },
    distinct: ["storeName"],
    orderBy: { storeName: "asc" },
  });

  return NextResponse.json(stores.map((s) => s.storeName));
}
