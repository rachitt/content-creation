import type { Config } from "drizzle-kit";
import path from "node:path";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? path.resolve(process.cwd(), "data", "content.db"),
  },
  strict: true,
  verbose: true,
} satisfies Config;
