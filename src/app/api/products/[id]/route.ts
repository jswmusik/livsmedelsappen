import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).nullable().optional(),
  defaultUnit: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).nullable().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig produktdata" },
      { status: 400 }
    );
  }

  const existing = await db.product.findFirst({
    where: { id, householdId: session.householdId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const { archived, ...fields } = parsed.data;

  const product = await db.product.update({
    where: { id },
    data: {
      ...fields,
      ...(archived !== undefined
        ? { archivedAt: archived ? new Date() : null }
        : {}),
    },
  });

  return NextResponse.json(product);
}
