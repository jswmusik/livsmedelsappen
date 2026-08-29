"use client";

import { useEffect, useState, type FormEvent } from "react";

const CHAINS = ["ICA", "COOP", "WILLYS", "LIDL"] as const;

interface Store {
  id: string;
  chain: string;
  name: string;
  url: string;
  isEnabled: boolean;
  lastScrapedAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "Aldrig";
  return new Date(iso).toLocaleDateString("sv-SE");
}

export default function StoresSettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("ICA");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    setIsLoading(true);
    const response = await fetch("/api/stores");
    if (response.ok) {
      setStores(await response.json());
    }
    setIsLoading(false);
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, name: name.trim(), url: url.trim() }),
    });

    if (response.ok) {
      const store = await response.json();
      setStores([...stores, store]);
      setName("");
      setUrl("");
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Något gick fel");
    }
  }

  async function toggleEnabled(store: Store) {
    const response = await fetch(`/api/stores/${store.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled: !store.isEnabled }),
    });
    if (response.ok) {
      const updated = await response.json();
      setStores(stores.map((s) => (s.id === store.id ? updated : s)));
    }
  }

  async function removeStore(store: Store) {
    const response = await fetch(`/api/stores/${store.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setStores(stores.filter((s) => s.id !== store.id));
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Bevakade butiker</h1>
      <p className="mt-1 text-sm text-gray-500">
        Lägg till länken till en butiks sida på kedjans hemsida. Priser
        hämtas en gång i veckan för butiker som är påslagna.
      </p>

      <form
        onSubmit={handleAdd}
        className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="grid grid-cols-2 gap-2">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value as (typeof CHAINS)[number])}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Eget namn, t.ex. ICA Maxi Hyllinge"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="url"
            placeholder="Länk till butikens sida"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
        >
          Lägg till butik
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-gray-500">Laddar…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {stores.map((store) => (
            <li
              key={store.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {store.name}
                </p>
                <p className="text-xs text-gray-400">
                  {store.chain} · Senast hämtad: {formatDate(store.lastScrapedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={store.isEnabled}
                    onChange={() => toggleEnabled(store)}
                  />
                  På
                </label>
                <button
                  onClick={() => removeStore(store)}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Ta bort
                </button>
              </div>
            </li>
          ))}
          {stores.length === 0 && (
            <p className="text-sm text-gray-500">Inga butiker tillagda ännu.</p>
          )}
        </ul>
      )}
    </div>
  );
}
