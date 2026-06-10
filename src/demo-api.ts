import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import type { PaymentRequired } from "@x402/core/types";
import type { Server } from "node:http";
import type { AgentPayConfig, AgentPayMode } from "./config.js";
import { assertRealModeConfig } from "./config.js";
import { MockPaymentLedger, createMockPaymentRequired, validateMockPaymentPayload, type MockResourceSpec } from "./mock-x402.js";
import { createPharosServerEvmScheme, decodeSignature, encodeReceipt, encodeRequired, findHeader, PAYMENT_REQUIRED_HEADERS, PAYMENT_RESPONSE_HEADERS, PAYMENT_SIGNATURE_HEADERS } from "./x402-helpers.js";

export const DEMO_RESOURCES: MockResourceSpec[] = [
  {
    method: "GET",
    path: "/alpha/rwa",
    priceUsd: "0.003",
    description: "Premium RWA alpha signal for an autonomous research agent.",
    tags: ["rwa", "alpha", "data"],
  },
  {
    method: "POST",
    path: "/research/summarize",
    priceUsd: "0.005",
    description: "Paid AI research summarization endpoint.",
    tags: ["research", "summary", "agent"],
  },
];

export interface DemoApiBuildResult {
  app: Express;
  ledger: MockPaymentLedger;
}

export function buildDemoApiApp(config: AgentPayConfig, mode: AgentPayMode = config.mode): DemoApiBuildResult {
  const app = express();
  const ledger = new MockPaymentLedger();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "Pharos AgentPay Demo API", mode, network: config.network, chainId: config.chainId });
  });

  app.get("/catalog", (_req, res) => {
    res.json({
      service: "Pharos AgentPay Demo API",
      mode,
      resources: DEMO_RESOURCES.map((resource) => ({
        method: resource.method,
        path: resource.path,
        price: `${resource.priceUsd} USDC`,
        network: config.network,
        asset: config.usdcAddress,
        description: resource.description,
      })),
    });
  });

  if (mode === "real") {
    attachRealPaymentMiddleware(app, config);
  }

  const alphaSpec = DEMO_RESOURCES[0]!;
  const summarizeSpec = DEMO_RESOURCES[1]!;

  app.get(alphaSpec.path, mode === "mock" ? mockPaymentGate(config, ledger, alphaSpec) : passthrough, (_req, res) => {
    res.json({
      signal: {
        id: "rwa-alpha-001",
        assetClass: "Tokenized US Treasuries",
        thesis: "Stablecoin liquidity and sub-second settlement make RWA data subscriptions practical for autonomous agents.",
        sentiment: "positive",
        confidence: 0.86,
        suggestedAgentAction: "buy-premium-report-and-monitor-yield-spreads",
        generatedAt: new Date().toISOString(),
      },
      provenance: {
        network: config.network,
        protectedBy: "x402",
        skill: "agentpay.pay-fetch",
      },
    });
  });

  app.post(summarizeSpec.path, mode === "mock" ? mockPaymentGate(config, ledger, summarizeSpec) : passthrough, (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "RWA market update";
    res.json({
      summary: {
        prompt,
        bullets: [
          "RWA APIs are a natural paid-data primitive for autonomous agents.",
          "x402 lets the agent unlock the result without accounts, passwords, or a card processor.",
          "Pharos Atlantic testnet provides EVM-compatible settlement for micro-payments.",
        ],
        tokenEstimate: 312,
        generatedAt: new Date().toISOString(),
      },
      provenance: {
        network: config.network,
        protectedBy: "x402",
        skill: "agentpay.pay-fetch",
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", path: req.path });
  });

  return { app, ledger };
}

function attachRealPaymentMiddleware(app: Express, config: AgentPayConfig): void {
  assertRealModeConfig(config, "seller");
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator);
  resourceServer.register(config.network, createPharosServerEvmScheme(config));

  const routes: RoutesConfig = {
    "GET /alpha/rwa": {
      accepts: {
        scheme: "exact",
        price: "0.003",
        network: config.network,
        payTo: config.payToAddress,
      },
      description: "Premium RWA alpha signal for autonomous agents",
      mimeType: "application/json",
      serviceName: "Pharos AgentPay Demo API",
      tags: ["pharos", "x402", "rwa", "agentpay"],
    },
    "POST /research/summarize": {
      accepts: {
        scheme: "exact",
        price: "0.005",
        network: config.network,
        payTo: config.payToAddress,
      },
      description: "Paid AI research summarization endpoint",
      mimeType: "application/json",
      serviceName: "Pharos AgentPay Demo API",
      tags: ["pharos", "x402", "research", "agentpay"],
    },
  };

  app.use(paymentMiddleware(routes, resourceServer));
}

function mockPaymentGate(config: AgentPayConfig, ledger: MockPaymentLedger, spec: MockResourceSpec) {
  return (req: Request, res: Response, next: NextFunction) => {
    const absoluteUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const paymentRequired = createMockPaymentRequired(config, spec, absoluteUrl);
    const signatureHeader = findHeader(req.headers, PAYMENT_SIGNATURE_HEADERS);

    if (!signatureHeader) {
      sendMock402(res, paymentRequired, "payment_required");
      return;
    }

    try {
      const paymentPayload = decodeSignature(signatureHeader);
      const invalidReason = validateMockPaymentPayload(paymentPayload, paymentRequired);
      if (invalidReason) {
        sendMock402(res, paymentRequired, invalidReason);
        return;
      }

      const receipt = ledger.settle(paymentPayload);
      const encodedReceipt = encodeReceipt(receipt);
      res.setHeader("PAYMENT-RESPONSE", encodedReceipt);
      res.setHeader("X-PAYMENT-RESPONSE", encodedReceipt);
      res.setHeader("Access-Control-Expose-Headers", PAYMENT_RESPONSE_HEADERS.join(","));
      next();
    } catch (error) {
      sendMock402(res, paymentRequired, error instanceof Error ? error.message : String(error));
    }
  };
}

function sendMock402(res: Response, paymentRequired: PaymentRequired, error: string): void {
  const encoded = encodeRequired({ ...paymentRequired, error });
  res.setHeader("PAYMENT-REQUIRED", encoded);
  res.setHeader("X-PAYMENT-REQUIRED", encoded);
  res.setHeader("Access-Control-Expose-Headers", PAYMENT_REQUIRED_HEADERS.join(","));
  res.status(402).json({
    error,
    paymentRequired: { ...paymentRequired, error },
    agentHint: "Call the AgentPay pay-fetch skill with mode=mock or mode=real to unlock this resource.",
  });
}

function passthrough(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export function listenDemoApi(config: AgentPayConfig, mode: AgentPayMode = config.mode): Promise<{ server: Server; ledger: MockPaymentLedger; url: string }> {
  const { app, ledger } = buildDemoApiApp(config, mode);
  return new Promise((resolve) => {
    const server = app.listen(config.demoApiPort, () => {
      resolve({ server, ledger, url: `http://localhost:${config.demoApiPort}` });
    });
  });
}
