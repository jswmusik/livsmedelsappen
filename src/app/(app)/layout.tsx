import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "Hem" },
  { href: "/lists", label: "Lista" },
  { href: "/recipes", label: "Recept" },
  { href: "/purchases", label: "Köp" },
  { href: "/dashboard", label: "Dashboard" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-500">
          Inloggad som{" "}
          <span className="font-medium text-gray-900">
            {session.displayName}
          </span>
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/settings/stores"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            Inställningar
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white">
        <ul className="flex justify-around">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center py-2 text-xs text-gray-600 hover:text-gray-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
