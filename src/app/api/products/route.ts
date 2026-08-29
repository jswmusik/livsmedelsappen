import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().trim().min(1).optional(),
  defaultUnit: z.string().trim().min(1),
  category: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  const products = await db.product.findMany({
    where: {
      householdId: session.householdId,
      archivedAt: null,
      ...(query
        ? { name: { contains: query, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig produktdata" },
      { status: 400 }
    );
  }

  const product = await db.product.create({
    data: {
      ...parsed.data,
      householdId: session.householdId,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
