"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Purchase {
  id: string;
  storeName: string;
  purchasedAt: string;
  items: { quantity: number; unitPrice: number; totalPrice: number }[];
  user: { displayName: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setPurchases(data);
        setIsLoading(false);
      });
  }, []);

  async function handleDelete(id: string) {
    const response = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    if (response.ok) {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Köp</h1>
        <button
          onClick={() => router.push("/purchases/new")}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Nytt köp
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Laddar…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {purchases.map((purchase) => {
            const total = purchase.items.reduce(
              (sum, item) => sum + item.totalPrice,
              0
            );
            return (
              <li
                key={purchase.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {purchase.storeName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(purchase.purchasedAt)} · {purchase.user.displayName} ·{" "}
                    {purchase.items.length} varor
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {total.toFixed(2)} kr
                  </span>
                  <button
                    onClick={() => handleDelete(purchase.id)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Ta bort
                  </button>
                </div>
              </li>
            );
          })}
          {purchases.length === 0 && (
            <p className="text-sm text-gray-500">Inga köp loggade ännu.</p>
          )}
        </ul>
      )}
    </div>
  );
}
