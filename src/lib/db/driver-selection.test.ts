import { afterEach, describe, expect, it, vi } from "vitest";

describe("seleção do driver de banco por DATABASE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa o driver neon-http quando a URL aponta para a Neon", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://user:pass@ep-example-123456.us-east-2.aws.neon.tech/db",
    );

    const { getDb } = await import("@/lib/db");

    expect(getDb()).toBeTruthy();
  });
});
