import { createHash, randomUUID } from "node:crypto";
import type { PaymentPayload, PaymentRequired, PaymentRequirements, ResourceInfo, SettleResponse } from "@x402/core/types";
import type { AgentPayConfig } from "./config.js";
import { usdToAtomicUnits } from "./money.js";

export interface MockResourceSpec {
  method: string;
  path: string;
  priceUsd: string;
  description: string;
  mimeType?: string;
  tags?: string[];
}

export interface MockChargeRecord {
  idempotencyKey: string;
  transaction: string;
  requirement: PaymentRequirements;
  payer: string;
  createdAt: string;
  settledCount: number;
}

export class MockPaymentLedger {
  private readonly charges = new Map<string, MockChargeRecord>();

  settle(paymentPayload: PaymentPayload): SettleResponse {
    const key = getMockIdempotencyKey(paymentPayload);
    const payer = getMockPayer(paymentPayload);
    const existing = this.charges.get(key);
    if (existing) {
      existing.settledCount += 1;
      return this.toSettleResponse(existing);
    }

    const record: MockChargeRecord = {
      idempotencyKey: key,
      transaction: `mock:${hashShort(key)}`,
      requirement: paymentPayload.accepted,
      payer,
      createdAt: new Date().toISOString(),
      settledCount: 1,
    };
    this.charges.set(key, record);
    return this.toSettleResponse(record);
  }

  get chargeCount(): number {
    return this.charges.size;
  }

  get records(): MockChargeRecord[] {
    return [...this.charges.values()];
  }

  private toSettleResponse(record: MockChargeRecord): SettleResponse {
    return {
      success: true,
      transaction: record.transaction,
      network: record.requirement.network,
      payer: record.payer,
      amount: record.requirement.amount,
      extra: {
        mode: "mock",
        idempotencyKey: record.idempotencyKey,
        settledCount: record.settledCount,
      },
    };
  }
}

export function createMockPaymentRequired(config: AgentPayConfig, spec: MockResourceSpec, absoluteUrl: string): PaymentRequired {
  const resource: ResourceInfo = {
    url: absoluteUrl,
    description: spec.description,
    mimeType: spec.mimeType || "application/json",
    serviceName: "Pharos AgentPay Demo API",
    tags: ["pharos", "x402", "agentpay", ...(spec.tags || [])],
  };

  return {
    x402Version: 2,
    resource,
    accepts: [
      {
        scheme: "exact",
        network: config.network,
        asset: config.usdcAddress,
        amount: usdToAtomicUnits(spec.priceUsd, 6),
        payTo: config.payToAddress,
        maxTimeoutSeconds: 300,
        extra: {
          token: config.usdcName,
          name: config.usdcName,
          version: "2",
          mode: "mock",
          displayAmount: `${spec.priceUsd} USDC`,
          assetTransferMethod: "mock",
        },
      },
    ],
  };
}

export function createMockPaymentPayload(paymentRequired: PaymentRequired, idempotencyKey?: string): PaymentPayload {
  const accepted = paymentRequired.accepts[0];
  if (!accepted) throw new Error("Payment required response has no accepted payment requirements.");

  return {
    x402Version: paymentRequired.x402Version,
    resource: paymentRequired.resource,
    accepted,
    payload: {
      mode: "mock",
      idempotencyKey: idempotencyKey || randomUUID(),
      payer: "agentpay-mock-wallet",
      issuedAt: new Date().toISOString(),
      nonce: randomUUID(),
    },
    extensions: {
      agentpay: {
        skill: "pay-fetch",
        demo: true,
      },
    },
  };
}

export function validateMockPaymentPayload(paymentPayload: PaymentPayload, paymentRequired: PaymentRequired): string | undefined {
  const accepted = paymentRequired.accepts[0];
  if (!accepted) return "Payment requirement is missing accepts[0].";
  if (paymentPayload.x402Version !== paymentRequired.x402Version) return "x402 version mismatch.";
  if (paymentPayload.accepted.scheme !== accepted.scheme) return "scheme mismatch.";
  if (paymentPayload.accepted.network !== accepted.network) return "network mismatch.";
  if (paymentPayload.accepted.asset.toLowerCase() !== accepted.asset.toLowerCase()) return "asset mismatch.";
  if (paymentPayload.accepted.amount !== accepted.amount) return "amount mismatch.";
  if (paymentPayload.accepted.payTo.toLowerCase() !== accepted.payTo.toLowerCase()) return "payTo mismatch.";
  if (!getMockIdempotencyKey(paymentPayload)) return "missing idempotency key.";
  return undefined;
}

function getMockIdempotencyKey(paymentPayload: PaymentPayload): string {
  const payload = paymentPayload.payload || {};
  const key = payload.idempotencyKey;
  if (typeof key === "string" && key.length > 0) return key;
  return hashShort(JSON.stringify(paymentPayload));
}

function getMockPayer(paymentPayload: PaymentPayload): string {
  const payer = paymentPayload.payload?.payer;
  return typeof payer === "string" ? payer : "agentpay-mock-wallet";
}

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
