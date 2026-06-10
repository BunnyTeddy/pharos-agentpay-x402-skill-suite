import { z } from "zod";
import type { PaymentRequired, PaymentRequirements } from "@x402/core/types";

export const ModeSchema = z.enum(["mock", "real"]);
export type Mode = z.infer<typeof ModeSchema>;

export const MethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);
export type HttpMethod = z.infer<typeof MethodSchema>;

const HeadersSchema = z.record(z.string(), z.string()).default({});

export const DiscoverInputSchema = z.object({
  url: z.url(),
  method: MethodSchema.default("GET"),
  headers: HeadersSchema,
  body: z.unknown().optional(),
});

export const PayFetchInputSchema = DiscoverInputSchema.extend({
  maxUsd: z.number().positive().default(0.01),
  mode: ModeSchema.default("mock"),
  idempotencyKey: z.string().min(1).optional(),
});

export const DecodeReceiptInputSchema = z.object({
  rawHeader: z.string().min(1),
});

export type DiscoverInput = z.input<typeof DiscoverInputSchema>;
export type PayFetchInput = z.input<typeof PayFetchInputSchema>;
export type PayFetchInputParsed = z.output<typeof PayFetchInputSchema>;

export interface PaymentReceipt {
  network: string;
  transaction?: string;
  payer?: string;
  payTo?: string;
  asset?: string;
  amount?: string;
  rawHeader?: string;
  success?: boolean;
  mode?: "mock" | "real";
}

export interface DiscoverResult {
  requiresPayment: boolean;
  status: number;
  requirements?: PaymentRequirements[];
  paymentRequired?: PaymentRequired;
  network?: string;
  price?: string;
  payTo?: string;
  resource?: string;
  rawPaymentRequiredHeader?: string;
  error?: string;
}

export interface PayFetchResult {
  ok: boolean;
  status: number;
  data?: unknown;
  paymentRequired?: PaymentRequired;
  receipt?: PaymentReceipt;
  error?: string;
}
