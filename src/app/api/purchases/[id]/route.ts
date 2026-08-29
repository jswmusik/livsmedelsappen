import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updatePurchaseSchema = z.object({
  storeName: z.string().trim().min(1).optional(),
  purchasedAt: z.string().datetime().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const purchase = await db.purchase.findFirst({
    where: { id, householdId: session.householdId },
    include: {
      items: { include: { product: true } },
      user: { select: { displayName: true } },
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  return NextResponse.json(purchase);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const parsed = updatePurchaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const existing = await db.purchase.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const purchase = await db.purchase.update({
    where: { id },
    data: {
      ...(parsed.data.storeName ? { storeName: parsed.data.storeName } : {}),
      ...(parsed.data.purchasedAt
        ? { purchasedAt: new Date(parsed.data.purchasedAt) }
        : {}),
    },
  });

  return NextResponse.json(purchase);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await db.purchase.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await db.$transaction([
    db.purchaseItem.deleteMany({ where: { purchaseId: id } }),
    db.purchase.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
