"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Recipe {
  id: string;
  name: string;
  servings: number;
}

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    setIsLoading(true);
    const response = await fetch("/api/recipes");
    if (response.ok) {
      setRecipes(await response.json());
    }
    setIsLoading(false);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (response.ok) {
      const recipe = await response.json();
      router.push(`/recipes/${recipe.id}`);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Recept</h1>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Nytt recept, t.ex. Tacos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Skapa
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Laddar…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <button
                onClick={() => router.push(`/recipes/${recipe.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  {recipe.name}
                </span>
                <span className="text-xs text-gray-400">
                  {recipe.servings} port.
                </span>
              </button>
            </li>
          ))}
          {recipes.length === 0 && (
            <p className="text-sm text-gray-500">Inga recept ännu.</p>
          )}
        </ul>
      )}
    </div>
  );
}
