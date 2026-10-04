import { createSeedClient } from "./client";
import { seedDemoCatalog } from "./catalog";
import { seedMinimal } from "./minimal";
import { seedDemoUsers } from "./users";

async function main() {
  const mode = process.argv[2] ?? "minimal";
  if (mode !== "minimal" && mode !== "demo") throw new Error(`Unknown seed mode "${mode}" (use minimal | demo)`);
  if (mode === "demo" && process.env.APP_ENV === "production") throw new Error("Refusing to load DEMO DATA in production");

  const db = createSeedClient();
  try {
    await seedMinimal(db);
    if (mode === "demo") {
      await seedDemoUsers(db);
      await seedDemoCatalog(db);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
