"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductPicker, type Product } from "@/components/ProductPicker";

interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  product: Product;
}

interface Recipe {
  id: string;
  name: string;
  servings: number;
  instructions: string | null;
  ingredients: RecipeIngredient[];
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [servings, setServings] = useState(2);
  const [instructions, setInstructions] = useState("");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [pendingUnit, setPendingUnit] = useState("st");
  const [addedToList, setAddedToList] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  async function fetchRecipe() {
    setIsLoading(true);
    const response = await fetch(`/api/recipes/${id}`);
    if (response.ok) {
      const data: Recipe = await response.json();
      setRecipe(data);
      setName(data.name);
      setServings(data.servings);
      setInstructions(data.instructions ?? "");
    }
    setIsLoading(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        servings,
        instructions: instructions.trim() || null,
      }),
    });
    if (response.ok) {
      const updated = await response.json();
      setRecipe((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  }

  function selectProduct(product: Product) {
    setPendingProduct(product);
    setPendingUnit(product.defaultUnit);
  }

  async function addIngredient() {
    if (!pendingProduct) return;
    const response = await fetch(`/api/recipes/${id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: pendingProduct.id,
        quantity: pendingQuantity,
        unit: pendingUnit,
      }),
    });
    if (response.ok && recipe) {
      const ingredient = await response.json();
      const withoutDuplicate = recipe.ingredients.filter(
        (i) => i.product.id !== ingredient.product.id
      );
      setRecipe({ ...recipe, ingredients: [...withoutDuplicate, ingredient] });
      setPendingProduct(null);
      setPendingQuantity(1);
      setPendingUnit("st");
    }
  }

  async function removeIngredient(ingredientId: string) {
    if (!recipe) return;
    const response = await fetch(
      `/api/recipes/${id}/ingredients/${ingredientId}`,
      { method: "DELETE" }
    );
    if (response.ok) {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((i) => i.id !== ingredientId),
      });
    }
  }

  async function addAllToList() {
    const response = await fetch(`/api/recipes/${id}/add-to-list`, {
      method: "POST",
    });
    if (response.ok) {
      setAddedToList(true);
      setTimeout(() => setAddedToList(false), 3000);
    }
  }

  if (isLoading) {
    return <div className="px-4 py-6 text-gray-500">Laddar…</div>;
  }

  if (!recipe) {
    return <div className="px-4 py-6 text-gray-500">Receptet hittades inte.</div>;
  }

  return (
    <div className="px-4 py-6">
      <button
        onClick={() => router.push("/recipes")}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Alla recept
      </button>

      <form onSubmit={handleSave} className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Portioner:</label>
          <input
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instruktioner (valfritt)"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Spara
        </button>
      </form>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Ingredienser</h2>
          <button
            onClick={addAllToList}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
          >
            {addedToList ? "Tillagt ✓" : "Lägg till i inköpslistan"}
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {recipe.ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="text-sm text-gray-900">
                {ingredient.product.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {ingredient.quantity} {ingredient.unit}
                </span>
                <button
                  onClick={() => removeIngredient(ingredient.id)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Ta bort"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
          {recipe.ingredients.length === 0 && (
            <p className="text-sm text-gray-500">Inga ingredienser ännu.</p>
          )}
        </ul>

        <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <ProductPicker onSelect={selectProduct} placeholder="Lägg till ingrediens..." />
          {pendingProduct && (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-900">
                {pendingProduct.name}
              </span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={pendingQuantity}
                onChange={(e) => setPendingQuantity(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={pendingUnit}
                onChange={(e) => setPendingUnit(e.target.value)}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                onClick={addIngredient}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Lägg till
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
