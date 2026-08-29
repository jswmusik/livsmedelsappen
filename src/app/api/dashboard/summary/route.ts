import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const session = await requireSession();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const purchases = await db.purchase.findMany({
    where: {
      householdId: session.householdId,
      purchasedAt: { gte: sixMonthsAgo },
    },
    include: { items: { include: { product: true } } },
  });

  // "Ordinarie pris" - senast kända observation per produkt, oavsett butik.
  // Används som referens för besparingsberäkningen: skillnaden mellan detta
  // och vad hushållet faktiskt betalade vid köptillfället.
  const productIds = [
    ...new Set(purchases.flatMap((p) => p.items.map((i) => i.productId))),
  ];
  const observations = await db.priceObservation.findMany({
    where: { productId: { in: productIds } },
    orderBy: { scrapedAt: "desc" },
  });
  const referencePriceByProduct = new Map<string, number>();
  for (const obs of observations) {
    if (!referencePriceByProduct.has(obs.productId)) {
      referencePriceByProduct.set(obs.productId, obs.regularPrice);
    }
  }

  const byMonth = new Map<string, number>();
  const byStore = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const savingsByMonth = new Map<string, number>();

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(monthKey(d), 0);
    savingsByMonth.set(monthKey(d), 0);
  }

  for (const purchase of purchases) {
    const month = monthKey(new Date(purchase.purchasedAt));
    const purchaseTotal = purchase.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    if (byMonth.has(month)) {
      byMonth.set(month, (byMonth.get(month) ?? 0) + purchaseTotal);
    }

    byStore.set(
      purchase.storeName,
      (byStore.get(purchase.storeName) ?? 0) + purchaseTotal
    );

    for (const item of purchase.items) {
      const category = item.product.category ?? "Okategoriserat";
      byCategory.set(category, (byCategory.get(category) ?? 0) + item.totalPrice);

      const referencePrice = referencePriceByProduct.get(item.productId);
      if (referencePrice !== undefined && referencePrice > item.unitPrice) {
        const savings = (referencePrice - item.unitPrice) * item.quantity;
        if (savingsByMonth.has(month)) {
          savingsByMonth.set(month, (savingsByMonth.get(month) ?? 0) + savings);
        }
      }
    }
  }

  const monthlySpend = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));

  const spendByStore = Array.from(byStore.entries())
    .map(([storeName, total]) => ({ storeName, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const spendByCategory = Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const currentMonthTotal = byMonth.get(monthKey(now)) ?? 0;
  const currentMonthSavings = savingsByMonth.get(monthKey(now)) ?? 0;
  const totalSavings = Array.from(savingsByMonth.values()).reduce(
    (sum, v) => sum + v,
    0
  );

  return NextResponse.json({
    currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
    currentMonthSavings: Math.round(currentMonthSavings * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    hasPriceData: referencePriceByProduct.size > 0,
    monthlySpend,
    spendByStore,
    spendByCategory,
  });
}
