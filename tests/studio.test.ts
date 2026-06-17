import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { loadConfig } from "../src/config.js";
import { buildSkillServerApp } from "../src/skill-server.js";

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

describe("AgentPay Studio", () => {
  it("serves the web UI and Studio config", async () => {
    const config = loadConfig({ mode: "mock" });
    const { url } = await listen(buildSkillServerApp(config));

    const page = await fetch(`${url}/studio/`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toContain("AgentPay Studio");

    const studioConfig = await fetch(`${url}/studio/config`).then((response) => response.json());
    expect(studioConfig.defaults.network).toBe(config.network);
    expect(studioConfig.demoResources).toHaveLength(2);
  });
});
