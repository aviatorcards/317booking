import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://postgres:password@127.0.0.1:5432/317booking",
      APP_TIMEZONE: "America/Indiana/Indianapolis",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
