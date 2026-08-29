import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updateIngredientSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
});

async function findOwnedIngredient(
  householdId: string,
  recipeId: string,
  ingredientId: string
) {
  return db.recipeIngredient.findFirst({
    where: {
      id: ingredientId,
      recipeId,
      recipe: { householdId },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  const session = await requireSession();
  const { id: recipeId, ingredientId } = await params;
  const body = await request.json();
  const parsed = updateIngredientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const existing = await findOwnedIngredient(
    session.householdId,
    recipeId,
    ingredientId
  );
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const ingredient = await db.recipeIngredient.update({
    where: { id: ingredientId },
    data: parsed.data,
    include: { product: true },
  });

  return NextResponse.json(ingredient);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  const session = await requireSession();
  const { id: recipeId, ingredientId } = await params;

  const existing = await findOwnedIngredient(
    session.householdId,
    recipeId,
    ingredientId
  );
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await db.recipeIngredient.delete({ where: { id: ingredientId } });

  return NextResponse.json({ ok: true });
}
