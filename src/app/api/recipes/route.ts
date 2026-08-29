import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const createRecipeSchema = z.object({
  name: z.string().trim().min(1),
  servings: z.number().int().positive().default(2),
  instructions: z.string().trim().optional(),
});

export async function GET() {
  const session = await requireSession();

  const recipes = await db.recipe.findMany({
    where: { householdId: session.householdId, archivedAt: null },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createRecipeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig receptdata" }, { status: 400 });
  }

  const recipe = await db.recipe.create({
    data: {
      ...parsed.data,
      householdId: session.householdId,
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
