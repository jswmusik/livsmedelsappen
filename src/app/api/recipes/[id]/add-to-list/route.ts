import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id: recipeId } = await params;

  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, householdId: session.householdId },
    include: { ingredients: true },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  let list = await db.shoppingList.findFirst({
    where: { householdId: session.householdId, archivedAt: null },
  });
  if (!list) {
    list = await db.shoppingList.create({
      data: { householdId: session.householdId },
    });
  }

  const existingItems = await db.shoppingListItem.findMany({
    where: { shoppingListId: list.id },
  });
  const existingByProduct = new Map(
    existingItems.map((item) => [item.productId, item])
  );

  await db.$transaction(
    recipe.ingredients.map((ingredient) => {
      const existing = existingByProduct.get(ingredient.productId);
      if (existing) {
        return db.shoppingListItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + ingredient.quantity },
        });
      }
      return db.shoppingListItem.create({
        data: {
          shoppingListId: list.id,
          productId: ingredient.productId,
          quantity: ingredient.quantity,
          addedBy: session.userId,
        },
      });
    })
  );

  return NextResponse.json({ ok: true, shoppingListId: list.id });
}
