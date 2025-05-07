import { defineConfig } from "drizzle-kit";

// URL hardcodeada para prueba
const DATABASE_URL = "postgresql://presupuestos_user:Baires2025@localhost:5432/presupuestos_db";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
