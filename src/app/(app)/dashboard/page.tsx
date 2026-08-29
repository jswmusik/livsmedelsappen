"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Summary {
  currentMonthTotal: number;
  monthlySpend: { month: string; total: number }[];
  spendByStore: { storeName: string; total: number }[];
  spendByCategory: { category: string; total: number }[];
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
  ];
  return `${names[Number(m) - 1]} ${year.slice(2)}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary);
  }, []);

  if (!summary) {
    return <div className="px-4 py-6 text-gray-500">Laddar…</div>;
  }

  const chartData = summary.monthlySpend.map((m) => ({
    month: formatMonthLabel(m.month),
    total: m.total,
  }));

  const maxStoreTotal = Math.max(1, ...summary.spendByStore.map((s) => s.total));
  const maxCategoryTotal = Math.max(
    1,
    ...summary.spendByCategory.map((c) => c.total)
  );

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Denna månad</p>
        <p className="text-3xl font-semibold text-gray-900">
          {summary.currentMonthTotal.toFixed(0)} kr
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">
          Senaste 6 månaderna
        </h2>
        <div className="mt-2 h-56 rounded-lg border border-gray-200 bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={40} />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(0)} kr`}
              />
              <Bar dataKey="total" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Per butik</h2>
        <ul className="mt-2 space-y-2">
          {summary.spendByStore.map((store) => (
            <li key={store.storeName}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">{store.storeName}</span>
                <span className="text-gray-500">{store.total.toFixed(0)} kr</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-900"
                  style={{ width: `${(store.total / maxStoreTotal) * 100}%` }}
                />
              </div>
            </li>
          ))}
          {summary.spendByStore.length === 0 && (
            <p className="text-sm text-gray-500">Inga köp loggade ännu.</p>
          )}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-700">Per kategori</h2>
        <ul className="mt-2 space-y-2">
          {summary.spendByCategory.map((cat) => (
            <li key={cat.category}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900">{cat.category}</span>
                <span className="text-gray-500">{cat.total.toFixed(0)} kr</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-400"
                  style={{ width: `${(cat.total / maxCategoryTotal) * 100}%` }}
                />
              </div>
            </li>
          ))}
          {summary.spendByCategory.length === 0 && (
            <p className="text-sm text-gray-500">Inga köp loggade ännu.</p>
          )}
        </ul>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Besparingsjämförelse mot butikspriser kommer när prisbevakningen
        (Fas 2) är på plats.
      </p>
    </div>
  );
}
