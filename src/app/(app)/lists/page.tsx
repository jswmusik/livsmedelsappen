"use client";

import { useEffect, useState } from "react";
import { ProductPicker, type Product } from "@/components/ProductPicker";
import { BestPriceBadge, type PriceInfo } from "@/components/BestPriceBadge";

interface ShoppingListItem {
  id: string;
  quantity: number;
  isChecked: boolean;
  product: Product;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
}

export default function ListsPage() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchList();
    fetch("/api/products/prices")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setPrices);
  }, []);

  async function fetchList() {
    setIsLoading(true);
    const response = await fetch("/api/lists");
    if (response.ok) {
      setList(await response.json());
    }
    setIsLoading(false);
  }

  async function addProduct(product: Product) {
    if (!list) return;
    const response = await fetch(`/api/lists/${list.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    if (response.ok) {
      const item = await response.json();
      setList({ ...list, items: [...list.items, item] });
    }
  }

  async function toggleChecked(item: ShoppingListItem) {
    if (!list) return;
    const response = await fetch(
      `/api/lists/${list.id}/items/${item.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: !item.isChecked }),
      }
    );
    if (response.ok) {
      const updated = await response.json();
      setList({
        ...list,
        items: list.items.map((i) => (i.id === item.id ? updated : i)),
      });
    }
  }

  async function updateQuantity(item: ShoppingListItem, quantity: number) {
    if (!list || quantity <= 0) return;
    const response = await fetch(
      `/api/lists/${list.id}/items/${item.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      }
    );
    if (response.ok) {
      const updated = await response.json();
      setList({
        ...list,
        items: list.items.map((i) => (i.id === item.id ? updated : i)),
      });
    }
  }

  async function removeItem(item: ShoppingListItem) {
    if (!list) return;
    const response = await fetch(
      `/api/lists/${list.id}/items/${item.id}`,
      { method: "DELETE" }
    );
    if (response.ok) {
      setList({
        ...list,
        items: list.items.filter((i) => i.id !== item.id),
      });
    }
  }

  if (isLoading) {
    return <div className="px-4 py-6 text-gray-500">Laddar…</div>;
  }

  if (!list) {
    return <div className="px-4 py-6 text-gray-500">Kunde inte ladda listan.</div>;
  }

  const uncheckedItems = list.items.filter((item) => !item.isChecked);
  const checkedItems = list.items.filter((item) => item.isChecked);

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">{list.name}</h1>

      <div className="mt-4">
        <ProductPicker onSelect={addProduct} />
      </div>

      <ul className="mt-6 space-y-2">
        {uncheckedItems.map((item) => (
          <ShoppingListRow
            key={item.id}
            item={item}
            priceInfo={prices[item.product.id]}
            onToggle={() => toggleChecked(item)}
            onQuantityChange={(q) => updateQuantity(item, q)}
            onRemove={() => removeItem(item)}
          />
        ))}
      </ul>

      {checkedItems.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Avbockat
          </p>
          <ul className="mt-2 space-y-2">
            {checkedItems.map((item) => (
              <ShoppingListRow
                key={item.id}
                item={item}
                onToggle={() => toggleChecked(item)}
                onQuantityChange={(q) => updateQuantity(item, q)}
                onRemove={() => removeItem(item)}
              />
            ))}
          </ul>
        </div>
      )}

      {list.items.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">
          Listan är tom. Sök efter en produkt ovan för att lägga till den.
        </p>
      )}
    </div>
  );
}

function ShoppingListRow({
  item,
  priceInfo,
  onToggle,
  onQuantityChange,
  onRemove,
}: {
  item: ShoppingListItem;
  priceInfo?: PriceInfo;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <input
        type="checkbox"
        checked={item.isChecked}
        onChange={onToggle}
        className="h-5 w-5 shrink-0"
      />
      <div className={`flex-1 ${item.isChecked ? "text-gray-400 line-through" : "text-gray-900"}`}>
        <div>
          {item.product.name}
          {item.product.brand ? ` (${item.product.brand})` : ""}
        </div>
        {!item.isChecked && <BestPriceBadge info={priceInfo} />}
      </div>
      <input
        type="number"
        min={0.1}
        step={0.1}
        value={item.quantity}
        onChange={(e) => onQuantityChange(Number(e.target.value))}
        className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
      />
      <span className="w-10 text-xs text-gray-400">{item.product.defaultUnit}</span>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-600"
        aria-label="Ta bort"
      >
        ✕
      </button>
    </li>
  );
}
