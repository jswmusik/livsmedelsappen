import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const CHAINS = ["ICA", "COOP", "WILLYS", "LIDL"] as const;

const createStoreSchema = z.object({
  chain: z.enum(CHAINS),
  name: z.string().trim().min(1),
  url: z.string().trim().url(),
});

export async function GET() {
  const session = await requireSession();

  const stores = await db.store.findMany({
    where: { householdId: session.householdId },
    orderBy: [{ chain: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(stores);
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const parsed = createStoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig butiksdata. Kontrollera att länken är en giltig URL." },
      { status: 400 }
    );
  }

  const existing = await db.store.findFirst({
    where: { householdId: session.householdId, url: parsed.data.url },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Den här butiken är redan tillagd." },
      { status: 409 }
    );
  }

  const store = await db.store.create({
    data: {
      ...parsed.data,
      householdId: session.householdId,
    },
  });

  return NextResponse.json(store, { status: 201 });
}
