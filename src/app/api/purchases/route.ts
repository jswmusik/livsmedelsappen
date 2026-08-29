import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const createPurchaseSchema = z.object({
  storeName: z.string().trim().min(1),
  purchasedAt: z.string().datetime().optional(),
  items: z.array(purchaseItemSchema).min(1),
});

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const purchases = await db.purchase.findMany({
    where: {
      householdId: session.householdId,
      ...(from || to
        ? {
            purchasedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      items: true,
      user: { select: { displayName: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  return NextResponse.json(purchases);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createPurchaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig inköpsdata" }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, householdId: session.householdId },
  });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json(
      { error: "En eller flera produkter hittades inte" },
      { status: 404 }
    );
  }

  const purchase = await db.purchase.create({
    data: {
      householdId: session.householdId,
      purchasedBy: session.userId,
      storeName: parsed.data.storeName,
      purchasedAt: parsed.data.purchasedAt
        ? new Date(parsed.data.purchasedAt)
        : new Date(),
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(purchase, { status: 201 });
}
