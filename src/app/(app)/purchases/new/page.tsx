"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductPicker, type Product } from "@/components/ProductPicker";

interface LineItem {
  key: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [knownStores, setKnownStores] = useState<string[]>([]);
  const [date, setDate] = useState(todayDateInputValue());
  const [items, setItems] = useState<LineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/purchases/stores")
      .then((r) => (r.ok ? r.json() : []))
      .then(setKnownStores);
  }, []);

  function addProduct(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: `${product.id}-${Date.now()}`,
        product,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function updateItem(key: string, changes: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...changes } : item))
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  async function handleSave() {
    if (!storeName.trim() || items.length === 0) return;
    setIsSaving(true);

    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: storeName.trim(),
        purchasedAt: new Date(date).toISOString(),
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }),
    });

    setIsSaving(false);
    if (response.ok) {
      router.push("/purchases");
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Nytt köp</h1>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Butik</label>
          <input
            type="text"
            list="known-stores"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="t.ex. ICA Kvantum"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
          <datalist id="known-stores">
            {knownStores.map((store) => (
              <option key={store} value={store} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div className="mt-6">
        <ProductPicker onSelect={addProduct} placeholder="Lägg till vara..." />

        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="flex-1 text-sm text-gray-900">
                {item.product.name}
              </span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={item.quantity}
                onChange={(e) =>
                  updateItem(item.key, { quantity: Number(e.target.value) })
                }
                className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
              />
              <span className="text-xs text-gray-400">
                {item.product.defaultUnit}
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="kr/st"
                value={item.unitPrice || ""}
                onChange={(e) =>
                  updateItem(item.key, { unitPrice: Number(e.target.value) })
                }
                className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
              />
              <span className="w-16 text-right text-sm text-gray-500">
                {(item.quantity * item.unitPrice).toFixed(2)} kr
              </span>
              <button
                onClick={() => removeItem(item.key)}
                className="text-gray-400 hover:text-red-600"
                aria-label="Ta bort"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">
            Sök efter varor ovan för att lägga till dem i kvittot.
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-lg font-semibold text-gray-900">
          Summa: {total.toFixed(2)} kr
        </span>
        <button
          onClick={handleSave}
          disabled={isSaving || !storeName.trim() || items.length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving ? "Sparar…" : "Spara köp"}
        </button>
      </div>
    </div>
  );
}
