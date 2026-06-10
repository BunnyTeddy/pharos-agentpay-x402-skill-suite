import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequired, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { ExactEvmScheme as ServerExactEvmScheme } from "@x402/evm/exact/server";
import type { AgentPayConfig } from "./config.js";
import { atomicUnitsToUsdString, usdToAtomicUnits } from "./money.js";
import type { PaymentReceipt } from "./types.js";

export const PAYMENT_REQUIRED_HEADERS = ["PAYMENT-REQUIRED", "X-PAYMENT-REQUIRED"];
export const PAYMENT_SIGNATURE_HEADERS = ["PAYMENT-SIGNATURE", "X-PAYMENT"];
export const PAYMENT_RESPONSE_HEADERS = ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE"];

export function encodeRequired(paymentRequired: PaymentRequired): string {
  return encodePaymentRequiredHeader(paymentRequired);
}

export function decodeRequired(raw: string): PaymentRequired {
  return decodePaymentRequiredHeader(raw);
}

export function encodeSignature(paymentPayload: PaymentPayload): string {
  return encodePaymentSignatureHeader(paymentPayload);
}

export function decodeSignature(raw: string): PaymentPayload {
  return decodePaymentSignatureHeader(raw);
}

export function encodeReceipt(settleResponse: SettleResponse): string {
  return encodePaymentResponseHeader(settleResponse);
}

export function decodeReceipt(raw: string): SettleResponse {
  return decodePaymentResponseHeader(raw);
}

export function findHeader(headers: Headers | Record<string, string | string[] | undefined>, names: string[]): string | undefined {
  for (const name of names) {
    if (headers instanceof Headers) {
      const value = headers.get(name);
      if (value) return value;
    } else {
      const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
      const value = match?.[1];
      if (Array.isArray(value)) return value[0];
      if (value) return value;
    }
  }
  return undefined;
}

export function paymentRequiredFromResponse(response: Response, data?: unknown): {
  paymentRequired?: PaymentRequired;
  rawHeader?: string;
  error?: string;
} {
  const rawHeader = findHeader(response.headers, PAYMENT_REQUIRED_HEADERS);
  if (rawHeader) {
    try {
      return { paymentRequired: decodeRequired(rawHeader), rawHeader };
    } catch (error) {
      return { rawHeader, error: error instanceof Error ? error.message : String(error) };
    }
  }

  if (data && typeof data === "object" && "paymentRequired" in data) {
    return { paymentRequired: (data as { paymentRequired: PaymentRequired }).paymentRequired };
  }

  return { error: "No x402 payment requirement header/body found on 402 response." };
}

export function receiptFromResponse(response: Response): PaymentReceipt | undefined {
  const rawHeader = findHeader(response.headers, PAYMENT_RESPONSE_HEADERS);
  if (!rawHeader) return undefined;
  return normalizeReceipt(decodeReceipt(rawHeader), rawHeader);
}

export function normalizeReceipt(settleResponse: SettleResponse, rawHeader?: string): PaymentReceipt {
  return {
    network: settleResponse.network,
    transaction: settleResponse.transaction,
    payer: settleResponse.payer,
    amount: settleResponse.amount,
    rawHeader,
    success: settleResponse.success,
    mode: settleResponse.transaction?.startsWith("mock:") ? "mock" : "real",
  };
}

export function firstRequirement(paymentRequired: PaymentRequired): PaymentRequirements | undefined {
  return paymentRequired.accepts[0];
}

export function requirementPriceUsd(requirement: PaymentRequirements): string {
  if (typeof requirement.extra?.displayAmount === "string") {
    return requirement.extra.displayAmount.replace(/\s*USDC$/i, "");
  }
  return atomicUnitsToUsdString(requirement.amount, 6);
}

export function createPharosServerEvmScheme(config: AgentPayConfig): ServerExactEvmScheme {
  const evmScheme = new ServerExactEvmScheme();
  evmScheme.registerMoneyParser(async (amount, network) => {
    if (network !== config.network) return null;
    return {
      amount: usdToAtomicUnits(amount, 6),
      asset: config.usdcAddress,
      extra: {
        token: config.usdcName,
        name: config.usdcName,
        version: "2",
      },
    };
  });
  return evmScheme;
}
