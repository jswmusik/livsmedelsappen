"use client";

import { useEffect, useRef, useState } from "react";

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  defaultUnit: string;
  category: string | null;
}

interface ProductPickerProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductPicker({
  onSelect,
  placeholder = "Sök eller lägg till produkt...",
}: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUnit, setNewUnit] = useState("st");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const response = await fetch(
        `/api/products?q=${encodeURIComponent(query.trim())}`
      );
      if (response.ok) {
        setResults(await response.json());
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function reset() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setIsCreating(false);
    setNewUnit("st");
  }

  async function handleCreate() {
    const trimmed = query.trim();
    if (!trimmed) return;

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, defaultUnit: newUnit }),
    });

    if (response.ok) {
      const product = await response.json();
      onSelect(product);
      reset();
    }
  }

  const exactMatch = results.some(
    (product) => product.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setIsCreating(false);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-gray-900 focus:outline-none"
      />

      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product);
                reset();
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {product.name}
              {product.brand ? ` (${product.brand})` : ""}
              <span className="text-gray-400"> · {product.defaultUnit}</span>
            </button>
          ))}

          {!exactMatch && !isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
            >
              + Skapa ny produkt: &quot;{query.trim()}&quot;
            </button>
          )}

          {isCreating && (
            <div className="space-y-2 border-t border-gray-100 p-3">
              <label className="block text-xs font-medium text-gray-700">
                Enhet
              </label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="st">st</option>
                <option value="kg">kg</option>
                <option value="liter">liter</option>
                <option value="paket">paket</option>
              </select>
              <button
                type="button"
                onClick={handleCreate}
                className="w-full rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Skapa &quot;{query.trim()}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
