import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">Inställningar</h1>

      <ul className="mt-6 space-y-2">
        <li>
          <Link
            href="/settings/stores"
            className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-900">Bevakade butiker</p>
            <p className="text-xs text-gray-400">
              Lägg till och hantera butiker för prisbevakning
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/settings/unmatched"
            className="block rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-900">Ohanterade varor</p>
            <p className="text-xs text-gray-400">
              Länka scrapade varor till era produkter
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
