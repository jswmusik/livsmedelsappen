import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Miljövariabeln ${name} måste vara satt för att köra seed-skriptet`);
  }
  return value;
}

async function main() {
  const householdName = process.env.SEED_HOUSEHOLD_NAME ?? "Vårt hushåll";

  const household = await db.household.upsert({
    where: { id: "seed-household" },
    update: { name: householdName },
    create: { id: "seed-household", name: householdName },
  });

  const users = [
    {
      email: requireEnv("SEED_USER1_EMAIL"),
      password: requireEnv("SEED_USER1_PASSWORD"),
      displayName: requireEnv("SEED_USER1_NAME"),
    },
    {
      email: requireEnv("SEED_USER2_EMAIL"),
      password: requireEnv("SEED_USER2_PASSWORD"),
      displayName: requireEnv("SEED_USER2_NAME"),
    },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await db.user.upsert({
      where: { email: user.email },
      update: { passwordHash, displayName: user.displayName },
      create: {
        email: user.email,
        passwordHash,
        displayName: user.displayName,
        householdId: household.id,
      },
    });
    console.log(`Skapade/uppdaterade användare: ${user.email}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
