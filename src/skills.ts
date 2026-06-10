import { x402Client } from "@x402/fetch";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme as ClientExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentPayConfig } from "./config.js";
import { assertRealModeConfig, makePharosChain } from "./config.js";
import { bodyToFetchBody, jsonHeaders, readResponseData } from "./http.js";
import { atomicUnitsToUsdNumber, isWithinMaxUsd } from "./money.js";
import { createMockPaymentPayload } from "./mock-x402.js";
import { DiscoverInputSchema, PayFetchInputSchema, type DiscoverInput, type DiscoverResult, type PayFetchInput, type PayFetchResult, type PaymentReceipt } from "./types.js";
import { encodeSignature, firstRequirement, normalizeReceipt, paymentRequiredFromResponse, receiptFromResponse, requirementPriceUsd, decodeReceipt } from "./x402-helpers.js";

export function skillCatalog(config: AgentPayConfig) {
  return {
    name: "Pharos AgentPay x402 Skill Suite",
    version: "0.1.0",
    network: config.network,
    chainId: config.chainId,
    defaultAsset: config.usdcAddress,
    skills: [
      {
        id: "discover_paid_resource",
        endpoint: "POST /skills/discover",
        description: "Probe an HTTP resource and extract x402 payment requirements from a 402 response.",
      },
      {
        id: "pay_fetch",
        endpoint: "POST /skills/pay-fetch",
        description: "Pay for an x402-protected HTTP resource and return data plus a payment receipt.",
      },
      {
        id: "decode_payment_receipt",
        endpoint: "POST /skills/decode-receipt",
        description: "Decode a PAYMENT-RESPONSE header into agent-readable receipt JSON.",
      },
    ],
  };
}

export async function discoverPayment(input: DiscoverInput): Promise<DiscoverResult> {
  const parsed = DiscoverInputSchema.parse(input);
  const response = await fetch(parsed.url, {
    method: parsed.method,
    headers: jsonHeaders(parsed.headers, parsed.body),
    body: parsed.method === "GET" || parsed.method === "HEAD" ? undefined : bodyToFetchBody(parsed.body),
  });
  const data = await readResponseData(response);

  if (response.status !== 402) {
    return {
      requiresPayment: false,
      status: response.status,
      resource: parsed.url,
    };
  }

  const extracted = paymentRequiredFromResponse(response, data);
  if (!extracted.paymentRequired) {
    return {
      requiresPayment: true,
      status: response.status,
      rawPaymentRequiredHeader: extracted.rawHeader,
      error: extracted.error,
    };
  }

  const requirement = firstRequirement(extracted.paymentRequired);
  return {
    requiresPayment: true,
    status: response.status,
    paymentRequired: extracted.paymentRequired,
    requirements: extracted.paymentRequired.accepts,
    network: requirement?.network,
    price: requirement ? requirementPriceUsd(requirement) : undefined,
    payTo: requirement?.payTo,
    resource: extracted.paymentRequired.resource.url,
    rawPaymentRequiredHeader: extracted.rawHeader,
  };
}

export async function payFetch(input: PayFetchInput, config: AgentPayConfig): Promise<PayFetchResult> {
  const parsed = PayFetchInputSchema.parse({ maxUsd: config.maxUsdDefault, mode: config.mode, ...input });
  return parsed.mode === "mock" ? payFetchMock(parsed) : payFetchReal(parsed, config);
}

async function payFetchMock(input: ReturnType<typeof PayFetchInputSchema.parse>): Promise<PayFetchResult> {
  const initial = await fetch(input.url, {
    method: input.method,
    headers: jsonHeaders(input.headers, input.body),
    body: input.method === "GET" || input.method === "HEAD" ? undefined : bodyToFetchBody(input.body),
  });
  const initialData = await readResponseData(initial);

  if (initial.status !== 402) {
    return {
      ok: initial.ok,
      status: initial.status,
      data: initialData,
      receipt: receiptFromResponse(initial),
    };
  }

  const extracted = paymentRequiredFromResponse(initial, initialData);
  if (!extracted.paymentRequired) {
    return { ok: false, status: initial.status, data: initialData, error: extracted.error };
  }

  const requirement = firstRequirement(extracted.paymentRequired);
  if (!requirement) {
    return { ok: false, status: 402, paymentRequired: extracted.paymentRequired, error: "No supported payment requirement found." };
  }
  if (!isWithinMaxUsd(requirement.amount, input.maxUsd)) {
    return {
      ok: false,
      status: 402,
      paymentRequired: extracted.paymentRequired,
      error: `Payment ${atomicUnitsToUsdNumber(requirement.amount)} USD exceeds maxUsd ${input.maxUsd}.`,
    };
  }

  const payload = createMockPaymentPayload(extracted.paymentRequired, input.idempotencyKey);
  const signatureHeader = encodeSignature(payload);
  const paid = await fetch(input.url, {
    method: input.method,
    headers: {
      ...jsonHeaders(input.headers, input.body),
      "PAYMENT-SIGNATURE": signatureHeader,
      "X-PAYMENT": signatureHeader,
      "Idempotency-Key": input.idempotencyKey || String(payload.payload.idempotencyKey),
    },
    body: input.method === "GET" || input.method === "HEAD" ? undefined : bodyToFetchBody(input.body),
  });
  const data = await readResponseData(paid);
  return {
    ok: paid.ok,
    status: paid.status,
    data,
    paymentRequired: extracted.paymentRequired,
    receipt: receiptFromResponse(paid),
    error: paid.ok ? undefined : typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : undefined,
  };
}

async function payFetchReal(input: ReturnType<typeof PayFetchInputSchema.parse>, config: AgentPayConfig): Promise<PayFetchResult> {
  try {
    assertRealModeConfig(config, "buyer");
    const discovered = await discoverPayment(input);
    if (discovered.requiresPayment) {
      const requirement = discovered.requirements?.[0];
      if (requirement && !isWithinMaxUsd(requirement.amount, input.maxUsd)) {
        return {
          ok: false,
          status: 402,
          paymentRequired: discovered.paymentRequired,
          error: `Payment ${atomicUnitsToUsdNumber(requirement.amount)} USD exceeds maxUsd ${input.maxUsd}.`,
        };
      }
    }

    const account = privateKeyToAccount(config.evmPrivateKey!);
    const publicClient = createPublicClient({ chain: makePharosChain(config), transport: http(config.rpcUrl) });
    const signer = toClientEvmSigner(account, publicClient);
    const client = new x402Client();
    client.register(config.network, new ClientExactEvmScheme(signer, { [config.chainId]: { rpcUrl: config.rpcUrl } }));
    client.registerPolicy((_version, requirements) => requirements.filter((requirement) => isWithinMaxUsd(requirement.amount, input.maxUsd)));

    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    const response = await fetchWithPayment(input.url, {
      method: input.method,
      headers: jsonHeaders(input.headers, input.body),
      body: input.method === "GET" || input.method === "HEAD" ? undefined : bodyToFetchBody(input.body),
    });
    const data = await readResponseData(response);
    return {
      ok: response.ok,
      status: response.status,
      data,
      receipt: receiptFromResponse(response),
      error: response.ok ? undefined : typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : undefined,
    };
  } catch (error) {
    return { ok: false, status: 500, error: error instanceof Error ? error.message : String(error) };
  }
}

export function decodePaymentReceiptHeader(rawHeader: string): PaymentReceipt {
  return normalizeReceipt(decodeReceipt(rawHeader), rawHeader);
}
