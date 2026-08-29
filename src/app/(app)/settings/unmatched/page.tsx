"use client";

import { useEffect, useState } from "react";
import { ProductPicker, type Product } from "@/components/ProductPicker";

interface UnmatchedItem {
  id: string;
  chain: string;
  externalName: string;
  lastSeenPrice: number;
  lastSeenAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

export default function UnmatchedSettingsPage() {
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setIsLoading(true);
    const response = await fetch("/api/unmatched");
    if (response.ok) {
      setItems(await response.json());
    }
    setIsLoading(false);
  }

  async function linkTo(itemId: string, product: Product) {
    const response = await fetch(`/api/unmatched/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    if (response.ok) {
      setItems(items.filter((i) => i.id !== itemId));
      setLinkingId(null);
    }
  }

  async function ignore(itemId: string) {
    const response = await fetch(`/api/unmatched/${itemId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setItems(items.filter((i) => i.id !== itemId));
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Ohanterade varor</h1>
      <p className="mt-1 text-sm text-gray-500">
        Varor som hittats vid scraping men som ännu inte är kopplade till
        någon av era produkter. Länka dem för att börja se priser i appen.
      </p>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Laddar…</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.externalName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.chain} · {item.lastSeenPrice.toFixed(2)} kr · sedd{" "}
                    {formatDate(item.lastSeenAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setLinkingId(linkingId === item.id ? null : item.id)
                    }
                    className="text-xs font-medium text-gray-900 underline"
                  >
                    Länka
                  </button>
                  <button
                    onClick={() => ignore(item.id)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Ignorera
                  </button>
                </div>
              </div>

              {linkingId === item.id && (
                <div className="mt-3">
                  <ProductPicker
                    onSelect={(product) => linkTo(item.id, product)}
                    placeholder="Sök eller skapa produkt att länka till..."
                  />
                </div>
              )}
            </li>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500">
              Inga ohanterade varor just nu.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
