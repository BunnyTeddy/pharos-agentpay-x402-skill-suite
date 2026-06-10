import { execFileSync } from "node:child_process";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { loadConfig } from "../src/config.js";
import { buildDemoApiApp } from "../src/demo-api.js";
import { payFetch } from "../src/skills.js";

const servers: Server[] = [];

async function listen(app: Express): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test server port");
      servers.push(server);
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))));
});

describe("mock x402 flow", () => {
  it("returns HTTP 402 before payment", async () => {
    const config = loadConfig({ mode: "mock" });
    const { app } = buildDemoApiApp(config, "mock");
    const { url } = await listen(app);

    const response = await fetch(`${url}/alpha/rwa`);

    expect(response.status).toBe(402);
    expect(response.headers.get("PAYMENT-REQUIRED")).toBeTruthy();
  });

  it("pay-fetch unlocks paid data and idempotency avoids duplicate mock charges", async () => {
    const config = loadConfig({ mode: "mock" });
    const { app, ledger } = buildDemoApiApp(config, "mock");
    const { url } = await listen(app);

    const first = await payFetch({ url: `${url}/alpha/rwa`, maxUsd: 0.01, mode: "mock", idempotencyKey: "same-key" }, config);
    const second = await payFetch({ url: `${url}/alpha/rwa`, maxUsd: 0.01, mode: "mock", idempotencyKey: "same-key" }, config);

    expect(first.ok).toBe(true);
    expect(first.receipt?.transaction).toMatch(/^mock:/);
    expect(second.ok).toBe(true);
    expect(second.receipt?.transaction).toBe(first.receipt?.transaction);
    expect(ledger.chargeCount).toBe(1);
  });

  it("CLI catalog command emits valid JSON", () => {
    const config = loadConfig({ mode: "mock" });
    const stdout = execFileSync("node", ["dist/src/cli.js", "catalog"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, AGENTPAY_MODE: "mock" },
    });

    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("Pharos AgentPay x402 Skill Suite");
    expect(parsed.network).toBe(config.network);
    expect(parsed.skills.length).toBeGreaterThan(0);
  });
});
