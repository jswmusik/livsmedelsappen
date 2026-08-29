"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Product } from "@/components/ProductPicker";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("st");
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setIsLoading(true);
    const response = await fetch("/api/products");
    if (response.ok) {
      setProducts(await response.json());
    }
    setIsLoading(false);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        brand: brand.trim() || undefined,
        defaultUnit,
        category: category.trim() || undefined,
      }),
    });

    if (response.ok) {
      const product = await response.json();
      setProducts([...products, product].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setBrand("");
      setCategory("");
      setDefaultUnit("st");
    }
  }

  async function archiveProduct(product: Product) {
    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (response.ok) {
      setProducts(products.filter((p) => p.id !== product.id));
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Produkter</h1>

      <form
        onSubmit={handleCreate}
        className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Namn *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Märke (valfritt)"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="st">st</option>
            <option value="kg">kg</option>
            <option value="liter">liter</option>
            <option value="paket">paket</option>
          </select>
          <input
            type="text"
            placeholder="Kategori (valfritt)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          Lägg till produkt
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Laddar…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {product.name}
                  {product.brand ? ` (${product.brand})` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {product.defaultUnit}
                  {product.category ? ` · ${product.category}` : ""}
                </p>
              </div>
              <button
                onClick={() => archiveProduct(product)}
                className="text-xs text-gray-400 hover:text-red-600"
              >
                Arkivera
              </button>
            </li>
          ))}
          {products.length === 0 && (
            <p className="text-sm text-gray-500">Inga produkter ännu.</p>
          )}
        </ul>
      )}
    </div>
  );
}
