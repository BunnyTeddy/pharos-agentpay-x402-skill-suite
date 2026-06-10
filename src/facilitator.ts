import express, { type Express } from "express";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme as FacilitatorExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Server } from "node:http";
import type { AgentPayConfig, AgentPayMode } from "./config.js";
import { assertRealModeConfig, makePharosChain } from "./config.js";
import { MockPaymentLedger } from "./mock-x402.js";

export function buildFacilitatorApp(config: AgentPayConfig, mode: AgentPayMode = config.mode): Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  if (mode === "mock") {
    attachMockFacilitator(app, config);
  } else {
    attachRealFacilitator(app, config);
  }

  return app;
}

function attachMockFacilitator(app: Express, config: AgentPayConfig): void {
  const ledger = new MockPaymentLedger();

  app.get("/supported", (_req, res) => {
    res.json({
      kinds: [{ x402Version: 2, scheme: "exact", network: config.network, extra: { mode: "mock" } }],
      extensions: [],
      signers: { "eip155:*": ["agentpay-mock-facilitator"] },
    });
  });

  app.post("/verify", (req, res) => {
    const paymentPayload = req.body?.paymentPayload;
    if (!paymentPayload?.accepted) {
      res.json({ isValid: false, invalidReason: "missing_payload", invalidMessage: "paymentPayload.accepted is required" });
      return;
    }
    res.json({ isValid: true, payer: paymentPayload.payload?.payer || "agentpay-mock-wallet", extra: { mode: "mock" } });
  });

  app.post("/settle", (req, res) => {
    const paymentPayload = req.body?.paymentPayload;
    if (!paymentPayload?.accepted) {
      res.status(400).json({ success: false, errorReason: "missing_payload", transaction: "", network: config.network });
      return;
    }
    res.json(ledger.settle(paymentPayload));
  });
}

function attachRealFacilitator(app: Express, config: AgentPayConfig): void {
  assertRealModeConfig(config, "facilitator");

  const account = privateKeyToAccount(config.evmPrivateKey!);
  const client = createWalletClient({
    account,
    chain: makePharosChain(config),
    transport: http(config.rpcUrl, { timeout: 30_000 }),
  }).extend(publicActions);

  const signer = toFacilitatorEvmSigner({
    address: account.address,
    getCode: (args) => client.getCode(args),
    readContract: (args) => client.readContract({ ...args, args: args.args || [] } as never),
    verifyTypedData: (args) => client.verifyTypedData(args as never),
    writeContract: (args) => client.writeContract({ ...args, args: args.args || [] } as never),
    sendTransaction: (args) => client.sendTransaction(args as never),
    waitForTransactionReceipt: (args) => client.waitForTransactionReceipt(args as never),
  });

  const facilitator = new x402Facilitator();
  facilitator.register(config.network, new FacilitatorExactEvmScheme(signer));

  app.get("/supported", (_req, res) => {
    res.json(facilitator.getSupported());
  });

  app.post("/verify", async (req, res) => {
    try {
      const { paymentPayload, paymentRequirements } = req.body;
      res.json(await facilitator.verify(paymentPayload, paymentRequirements));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/settle", async (req, res) => {
    try {
      const { paymentPayload, paymentRequirements } = req.body;
      res.json(await facilitator.settle(paymentPayload, paymentRequirements));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}

export function listenFacilitator(config: AgentPayConfig, mode: AgentPayMode = config.mode): Promise<{ server: Server; url: string }> {
  const app = buildFacilitatorApp(config, mode);
  return new Promise((resolve) => {
    const server = app.listen(config.facilitatorPort, () => {
      resolve({ server, url: `http://localhost:${config.facilitatorPort}` });
    });
  });
}
