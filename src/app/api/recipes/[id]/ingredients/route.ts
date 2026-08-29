import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const addIngredientSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id: recipeId } = await params;
  const body = await request.json();
  const parsed = addIngredientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, householdId: session.householdId },
  });
  if (!recipe) {
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

  const ingredient = await db.recipeIngredient.upsert({
    where: {
      recipeId_productId: { recipeId, productId: parsed.data.productId },
    },
    update: { quantity: parsed.data.quantity, unit: parsed.data.unit },
    create: {
      recipeId,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
    },
    include: { product: true },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
