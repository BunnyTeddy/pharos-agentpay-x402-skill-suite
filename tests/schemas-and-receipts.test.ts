import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { MockPaymentLedger, createMockPaymentPayload, createMockPaymentRequired } from "../src/mock-x402.js";
import { PayFetchInputSchema } from "../src/types.js";
import { decodePaymentReceiptHeader } from "../src/skills.js";
import { encodeReceipt } from "../src/x402-helpers.js";

describe("schemas and receipts", () => {
  it("validates pay-fetch input", () => {
    expect(() => PayFetchInputSchema.parse({ url: "not-a-url", maxUsd: 0.01 })).toThrow();
    const parsed = PayFetchInputSchema.parse({ url: "http://localhost:4021/alpha/rwa", maxUsd: 0.01 });
    expect(parsed.method).toBe("GET");
    expect(parsed.mode).toBe("mock");
  });

  it("decodes a PAYMENT-RESPONSE header", () => {
    const config = loadConfig({ mode: "mock" });
    const paymentRequired = createMockPaymentRequired(
      config,
      { method: "GET", path: "/alpha/rwa", priceUsd: "0.003", description: "test" },
      "http://localhost:4021/alpha/rwa",
    );
    const payload = createMockPaymentPayload(paymentRequired, "receipt-test");
    const receipt = new MockPaymentLedger().settle(payload);
    const rawHeader = encodeReceipt(receipt);

    expect(decodePaymentReceiptHeader(rawHeader)).toMatchObject({
      success: true,
      network: config.network,
      transaction: expect.stringMatching(/^mock:/),
      payer: "agentpay-mock-wallet",
      mode: "mock",
    });
  });
});
