import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive().default(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id: shoppingListId } = await params;
  const body = await request.json();
  const parsed = addItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const list = await db.shoppingList.findFirst({
    where: { id: shoppingListId, householdId: session.householdId },
  });
  if (!list) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const product = await db.product.findFirst({
    where: { id: parsed.data.productId, householdId: session.householdId },
  });
  if (!product) {
    return NextResponse.json(
      { error: "Produkten hittades inte" },
      { status: 404 }
    );
  }

  const item = await db.shoppingListItem.create({
    data: {
      shoppingListId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      addedBy: session.userId,
    },
    include: { product: true },
  });

  return NextResponse.json(item, { status: 201 });
}
