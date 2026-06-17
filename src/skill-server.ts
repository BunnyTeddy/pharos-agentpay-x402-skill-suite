import express, { type Express, type Request } from "express";
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPayConfig } from "./config.js";
import { decodePaymentReceiptHeader, discoverPayment, payFetch, skillCatalog } from "./skills.js";
import { DecodeReceiptInputSchema } from "./types.js";

export interface SkillServerAppOptions {
  getDemoApiBaseUrl?: (req: Request) => string;
}

export function buildSkillServerApp(config: AgentPayConfig, options: SkillServerAppOptions = {}): Express {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.redirect(302, "/studio/");
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "Pharos AgentPay Skill Server", network: config.network });
  });

  app.get("/studio/config", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const demoApiBaseUrl = options.getDemoApiBaseUrl?.(req) || `http://localhost:${config.demoApiPort}`;
    res.json({
      name: "AgentPay Studio",
      description: "Web control center for AI agents buying x402-protected APIs on Pharos.",
      studioUrl: `${origin}/studio/`,
      skillApiBaseUrl: origin,
      demoApiBaseUrl,
      defaults: {
        mode: config.mode,
        maxUsd: config.maxUsdDefault,
        network: config.network,
        chainId: config.chainId,
        asset: config.usdcAddress,
        payTo: config.payToAddress,
        facilitatorUrl: config.facilitatorUrl,
      },
      demoResources: [
        {
          id: "rwa-alpha",
          label: "RWA Alpha Signal",
          method: "GET",
          url: `${demoApiBaseUrl}/alpha/rwa`,
          price: "0.003 USDC",
          body: null,
        },
        {
          id: "research-summary",
          label: "Research Summarizer",
          method: "POST",
          url: `${demoApiBaseUrl}/research/summarize`,
          price: "0.005 USDC",
          body: { prompt: "Summarize why x402 matters for Pharos AI agents" },
        },
      ],
    });
  });

  const studioPath = findStudioStaticPath();
  app.get(/^\/studio$/, (_req, res) => {
    res.redirect(302, "/studio/");
  });
  app.use("/studio", express.static(studioPath, { extensions: ["html"], fallthrough: false }));

  app.get("/skills/catalog", (_req, res) => {
    res.json(skillCatalog(config));
  });

  app.post("/skills/discover", async (req, res) => {
    try {
      res.json(await discoverPayment(req.body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/skills/pay-fetch", async (req, res) => {
    try {
      const result = await payFetch(req.body, config);
      res.status(result.ok ? 200 : result.status >= 400 && result.status < 600 ? result.status : 500).json(result);
    } catch (error) {
      res.status(400).json({ ok: false, status: 400, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/skills/decode-receipt", (req, res) => {
    try {
      const parsed = DecodeReceiptInputSchema.parse(req.body);
      res.json(decodePaymentReceiptHeader(parsed.rawHeader));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return app;
}

function findStudioStaticPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "../public/studio"),
    path.resolve(moduleDir, "../../public/studio"),
    path.resolve(process.cwd(), "public/studio"),
  ];
  const found = candidates.find((candidate) => existsSync(path.join(candidate, "index.html")));
  if (!found) {
    throw new Error(`AgentPay Studio static assets not found. Checked: ${candidates.join(", ")}`);
  }
  return found;
}

export function listenSkillServer(config: AgentPayConfig): Promise<{ server: Server; url: string }> {
  const app = buildSkillServerApp(config);
  return new Promise((resolve) => {
    const server = app.listen(config.skillPort, () => {
      resolve({ server, url: `http://localhost:${config.skillPort}` });
    });
  });
}
