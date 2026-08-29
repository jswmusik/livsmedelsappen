import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Hej {session.displayName}!
      </h1>
      <p className="mt-2 text-gray-600">
        Välkommen till livsmedelsappen. Listor, recept och inköpslogg är på gång.
      </p>
    </div>
  );
}
