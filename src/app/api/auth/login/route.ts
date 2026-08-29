import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ogiltig e-post eller lösenord" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Fel e-post eller lösenord" },
      { status: 401 }
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json(
      { error: "Fel e-post eller lösenord" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.householdId = user.householdId;
  session.displayName = user.displayName;
  await session.save();

  return NextResponse.json({ ok: true });
}
