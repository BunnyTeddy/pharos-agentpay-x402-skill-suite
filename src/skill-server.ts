import express, { type Express } from "express";
import type { Server } from "node:http";
import type { AgentPayConfig } from "./config.js";
import { decodePaymentReceiptHeader, discoverPayment, payFetch, skillCatalog } from "./skills.js";
import { DecodeReceiptInputSchema } from "./types.js";

export function buildSkillServerApp(config: AgentPayConfig): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "Pharos AgentPay Skill Server", network: config.network });
  });

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

export function listenSkillServer(config: AgentPayConfig): Promise<{ server: Server; url: string }> {
  const app = buildSkillServerApp(config);
  return new Promise((resolve) => {
    const server = app.listen(config.skillPort, () => {
      resolve({ server, url: `http://localhost:${config.skillPort}` });
    });
  });
}
