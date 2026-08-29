import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updateStoreSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const parsed = updateStoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const existing = await db.store.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const store = await db.store.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(store);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await db.store.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await db.$transaction([
    db.priceObservation.deleteMany({ where: { storeId: id } }),
    db.store.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
