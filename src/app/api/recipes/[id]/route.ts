import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updateRecipeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  servings: z.number().int().positive().optional(),
  instructions: z.string().trim().nullable().optional(),
  archived: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const recipe = await db.recipe.findFirst({
    where: { id, householdId: session.householdId },
    include: {
      ingredients: {
        include: { product: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  return NextResponse.json(recipe);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const parsed = updateRecipeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig receptdata" }, { status: 400 });
  }

  const existing = await db.recipe.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const { archived, ...fields } = parsed.data;

  const recipe = await db.recipe.update({
    where: { id },
    data: {
      ...fields,
      ...(archived !== undefined
        ? { archivedAt: archived ? new Date() : null }
        : {}),
    },
  });

  return NextResponse.json(recipe);
}
