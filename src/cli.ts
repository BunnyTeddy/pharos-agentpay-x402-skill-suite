#!/usr/bin/env node
import type { Server } from "node:http";
import { loadConfig, loadEnv, type AgentPayMode } from "./config.js";
import { buildDemoApiApp, listenDemoApi } from "./demo-api.js";
import { listenFacilitator } from "./facilitator.js";
import { bodyToFetchBody, jsonHeaders, readResponseData } from "./http.js";
import { discoverPayment, payFetch, skillCatalog } from "./skills.js";
import { buildSkillServerApp, listenSkillServer } from "./skill-server.js";

type Flags = Record<string, string | boolean>;

loadEnv();

async function main(argv = process.argv.slice(2)): Promise<boolean> {
  const [command, ...rest] = argv;
  const { positional, flags } = parseArgs(rest);
  const mode = flagString(flags, "mode") as AgentPayMode | undefined;
  const config = loadConfig({ mode: mode || undefined });

  switch (command) {
    case "serve-skills": {
      const port = flagNumber(flags, "port") || config.skillPort;
      const serverConfig = { ...config, skillPort: port };
      const { url } = await listenSkillServer(serverConfig);
      console.log(JSON.stringify({ ok: true, service: "skills", url, catalog: skillCatalog(serverConfig) }, null, 2));
      return true;
    }
    case "serve-demo-api": {
      const port = flagNumber(flags, "port") || config.demoApiPort;
      const serverConfig = { ...config, demoApiPort: port };
      const { url } = await listenDemoApi(serverConfig, serverConfig.mode);
      console.log(JSON.stringify({ ok: true, service: "demo-api", mode: serverConfig.mode, url }, null, 2));
      return true;
    }
    case "serve-facilitator": {
      const port = flagNumber(flags, "port") || config.facilitatorPort;
      const serverConfig = { ...config, facilitatorPort: port };
      const { url } = await listenFacilitator(serverConfig, serverConfig.mode);
      console.log(JSON.stringify({ ok: true, service: "facilitator", mode: serverConfig.mode, url }, null, 2));
      return true;
    }
    case "studio":
    case "serve-studio": {
      const skillPort = flagNumber(flags, "skill-port") || flagNumber(flags, "port") || config.skillPort;
      const demoApiPort = flagNumber(flags, "demo-port") || config.demoApiPort;
      const serverConfig = { ...config, skillPort, demoApiPort };
      const [demoApi, skillServer] = await Promise.all([
        listenDemoApi(serverConfig, serverConfig.mode),
        listenSkillServer(serverConfig),
      ]);
      console.log(JSON.stringify({
        ok: true,
        service: "studio",
        mode: serverConfig.mode,
        studioUrl: `${skillServer.url}/studio/`,
        skillServer: skillServer.url,
        demoApi: demoApi.url,
        note: "Open studioUrl in your browser. Keep this process running.",
      }, null, 2));
      return true;
    }
    case "discover": {
      const url = positional[0];
      if (!url) throw new Error("Usage: agentpay discover <url> [--method GET]");
      console.log(JSON.stringify(await discoverPayment({ url, method: (flagString(flags, "method") || "GET") as "GET" }), null, 2));
      return false;
    }
    case "pay-fetch": {
      const url = positional[0];
      if (!url) throw new Error("Usage: agentpay pay-fetch <url> --max-usd <amount> --mode mock|real");
      const body = parseJsonFlag(flags, "body");
      const result = await payFetch(
        {
          url,
          method: (flagString(flags, "method") || (body ? "POST" : "GET")) as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD",
          body,
          maxUsd: flagNumber(flags, "max-usd") || config.maxUsdDefault,
          mode: config.mode,
          idempotencyKey: flagString(flags, "idempotency-key"),
        },
        config,
      );
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1;
      return false;
    }
    case "demo": {
      const result = await runDemo(config.mode, config);
      console.log(JSON.stringify(result, null, 2));
      return false;
    }
    case "catalog": {
      console.log(JSON.stringify(skillCatalog(config), null, 2));
      return false;
    }
    case "help":
    case undefined:
      printHelp();
      return false;
    default:
      throw new Error(`Unknown command: ${command}. Run agentpay help.`);
  }
}

async function runDemo(mode: AgentPayMode, config = loadConfig({ mode })): Promise<unknown> {
  if (mode === "real") {
    const { server, url } = await listenDemoApi(config, "real");
    try {
      const result = await payFetch({ url: `${url}/alpha/rwa`, maxUsd: config.maxUsdDefault, mode: "real" }, config);
      return { ok: result.ok, mode, demoApi: url, result };
    } finally {
      await closeServer(server);
    }
  }

  const demoAppResult = buildDemoApiApp({ ...config, demoApiPort: 0 }, "mock");
  const demoServer = await listenOnRandomPort(demoAppResult.app);
  const skillApp = buildSkillServerApp({ ...config, skillPort: 0 });
  const skillServer = await listenOnRandomPort(skillApp);

  try {
    const catalog = await fetchJson(`${skillServer.url}/skills/catalog`);
    const alpha = await postJson(`${skillServer.url}/skills/pay-fetch`, {
      url: `${demoServer.url}/alpha/rwa`,
      method: "GET",
      maxUsd: 0.01,
      mode: "mock",
      idempotencyKey: "demo-alpha-001",
    });
    const alphaRetry = await postJson(`${skillServer.url}/skills/pay-fetch`, {
      url: `${demoServer.url}/alpha/rwa`,
      method: "GET",
      maxUsd: 0.01,
      mode: "mock",
      idempotencyKey: "demo-alpha-001",
    });
    const summary = await postJson(`${skillServer.url}/skills/pay-fetch`, {
      url: `${demoServer.url}/research/summarize`,
      method: "POST",
      body: { prompt: "Summarize why x402 matters for Pharos AI agents" },
      maxUsd: 0.01,
      mode: "mock",
      idempotencyKey: "demo-summary-001",
    });

    return {
      ok: true,
      mode,
      story: "AI research agent buys paid RWA alpha through the AgentPay x402 Skill, then reuses the same idempotency key safely.",
      skillServer: skillServer.url,
      demoApi: demoServer.url,
      catalog,
      results: { alpha, alphaRetry, summary },
      mockLedger: { chargeCount: demoAppResult.ledger.chargeCount, records: demoAppResult.ledger.records },
    };
  } finally {
    await Promise.all([closeServer(skillServer.server), closeServer(demoServer.server)]);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  return readResponseData(response);
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, { method: "POST", headers: jsonHeaders({}, body), body: bodyToFetchBody(body) });
  return readResponseData(response);
}

async function listenOnRandomPort(app: import("express").Express): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Unable to resolve random listening port.");
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function parseArgs(args: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[rawKey] = inlineValue;
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[rawKey] = next;
      i += 1;
    } else {
      flags[rawKey] = true;
    }
  }
  return { positional, flags };
}

function flagString(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function flagNumber(flags: Flags, key: string): number | undefined {
  const value = flagString(flags, key);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid --${key}: ${value}`);
  return parsed;
}

function parseJsonFlag(flags: Flags, key: string): unknown | undefined {
  const value = flagString(flags, key);
  if (!value) return undefined;
  return JSON.parse(value);
}

function printHelp(): void {
  console.log(`Pharos AgentPay x402 Skill Suite

Commands:
  agentpay serve-skills [--mode mock|real] [--port 4020]
  agentpay serve-demo-api [--mode mock|real] [--port 4021]
  agentpay serve-facilitator [--mode mock|real] [--port 4023]
  agentpay studio [--mode mock|real] [--skill-port 4020] [--demo-port 4021]
  agentpay discover <url> [--method GET]
  agentpay pay-fetch <url> --max-usd <amount> [--mode mock|real] [--method GET|POST] [--body '{"prompt":"..."}']
  agentpay demo [--mode mock|real]
  agentpay catalog
`);
}

main().then((keepsRunning) => {
  if (!keepsRunning) process.exit(process.exitCode ?? 0);
}).catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
