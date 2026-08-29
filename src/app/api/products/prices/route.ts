import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const FRESHNESS_DAYS = 14;

export async function GET() {
  const session = await requireSession();

  const since = new Date();
  since.setDate(since.getDate() - FRESHNESS_DAYS);

  const observations = await db.priceObservation.findMany({
    where: {
      scrapedAt: { gte: since },
      product: { householdId: session.householdId },
    },
    include: { store: { select: { name: true, chain: true } } },
    orderBy: { scrapedAt: "desc" },
  });

  const bestByProduct = new Map<
    string,
    { price: number; isMember: boolean; storeName: string; scrapedAt: string }
  >();

  for (const obs of observations) {
    const isMember = obs.memberPrice !== null && obs.memberPrice < obs.regularPrice;
    const price = isMember ? obs.memberPrice! : obs.regularPrice;

    const existing = bestByProduct.get(obs.productId);
    if (!existing || price < existing.price) {
      bestByProduct.set(obs.productId, {
        price,
        isMember,
        storeName: obs.store.name,
        scrapedAt: obs.scrapedAt.toISOString(),
      });
    }
  }

  return NextResponse.json(Object.fromEntries(bestByProduct));
}
