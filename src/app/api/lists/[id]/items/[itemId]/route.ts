import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updateItemSchema = z.object({
  quantity: z.number().positive().optional(),
  isChecked: z.boolean().optional(),
});

async function findOwnedItem(
  householdId: string,
  shoppingListId: string,
  itemId: string
) {
  return db.shoppingListItem.findFirst({
    where: {
      id: itemId,
      shoppingListId,
      shoppingList: { householdId },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await requireSession();
  const { id: shoppingListId, itemId } = await params;
  const body = await request.json();
  const parsed = updateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const existing = await findOwnedItem(
    session.householdId,
    shoppingListId,
    itemId
  );
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const item = await db.shoppingListItem.update({
    where: { id: itemId },
    data: parsed.data,
    include: { product: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await requireSession();
  const { id: shoppingListId, itemId } = await params;

  const existing = await findOwnedItem(
    session.householdId,
    shoppingListId,
    itemId
  );
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await db.shoppingListItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
