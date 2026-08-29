import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  let list = await db.shoppingList.findFirst({
    where: { householdId: session.householdId, archivedAt: null },
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!list) {
    list = await db.shoppingList.create({
      data: { householdId: session.householdId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  return NextResponse.json(list);
}
