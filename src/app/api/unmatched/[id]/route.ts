import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const linkSchema = z.object({ productId: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json();
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig data" }, { status: 400 });
  }

  const item = await db.unmatchedScrapeItem.findFirst({
    where: { id, householdId: session.householdId, resolvedAt: null },
  });
  if (!item) {
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

  const stores = await db.store.findMany({
    where: { householdId: session.householdId, chain: item.chain, isEnabled: true },
  });

  await db.$transaction([
    db.productMapping.upsert({
      where: {
        chain_externalProductKey: {
          chain: item.chain,
          externalProductKey: item.externalProductKey,
        },
      },
      update: { productId: product.id },
      create: {
        productId: product.id,
        chain: item.chain,
        externalProductKey: item.externalProductKey,
        externalName: item.externalName,
      },
    }),
    db.unmatchedScrapeItem.update({
      where: { id },
      data: { resolvedAt: new Date() },
    }),
    // Backfylla ett pris direkt så det syns i appen redan nu, istället för
    // att vänta på nästa veckas schemalagda scraping.
    ...stores.map((store) =>
      db.priceObservation.create({
        data: {
          productId: product.id,
          storeId: store.id,
          regularPrice: item.lastSeenPrice,
          unit: product.defaultUnit,
          scrapedAt: item.lastSeenAt,
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const item = await db.unmatchedScrapeItem.findFirst({
    where: { id, householdId: session.householdId, resolvedAt: null },
  });
  if (!item) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await db.unmatchedScrapeItem.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
