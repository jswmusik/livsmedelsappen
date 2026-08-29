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

  const byMonth = new Map<string, number>();
  const byStore = new Map<string, number>();
  const byCategory = new Map<string, number>();

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(monthKey(d), 0);
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

  return NextResponse.json({
    currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
    monthlySpend,
    spendByStore,
    spendByCategory,
  });
}
