import { config as loadDotenv } from "dotenv";
import { defineChain } from "viem";

export const DEFAULT_PHAROS_NETWORK = "eip155:688689" as const;
export const DEFAULT_PHAROS_CHAIN_ID = 688_689;
export const DEFAULT_PHAROS_RPC_URL = "https://atlantic.dplabs-internal.com";
export const DEFAULT_TEST_USDC_ADDRESS = "0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8";
export const DEFAULT_USDC_NAME = "USDC";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type AgentPayMode = "mock" | "real";

export interface AgentPayConfig {
  mode: AgentPayMode;
  skillPort: number;
  demoApiPort: number;
  facilitatorPort: number;
  network: `eip155:${number}`;
  chainId: number;
  rpcUrl: string;
  usdcAddress: `0x${string}`;
  usdcName: string;
  payToAddress: `0x${string}`;
  facilitatorUrl: string;
  evmPrivateKey?: `0x${string}`;
  maxUsdDefault: number;
}

export function loadEnv(): void {
  loadDotenv({ quiet: true });
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric env ${name}: ${raw}`);
  }
  return value;
}

function normalizeHexAddress(value: string | undefined, fallback: string): `0x${string}` {
  const candidate = (value || fallback).trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(candidate)) {
    throw new Error(`Invalid EVM address: ${candidate}`);
  }
  return candidate as `0x${string}`;
}

function normalizePrivateKey(value: string | undefined): `0x${string}` | undefined {
  if (!value || value.includes("YOUR_PRIVATE_KEY")) return undefined;
  const candidate = value.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(candidate)) {
    throw new Error("Invalid EVM_PRIVATE_KEY format. Expected 0x-prefixed 32-byte hex string.");
  }
  return candidate as `0x${string}`;
}

export function loadConfig(overrides: Partial<AgentPayConfig> = {}): AgentPayConfig {
  const chainId = readNumberEnv("PHAROS_CHAIN_ID", DEFAULT_PHAROS_CHAIN_ID);
  const network = (process.env.PHAROS_NETWORK || `eip155:${chainId}`) as `eip155:${number}`;
  const facilitatorPort = readNumberEnv("FACILITATOR_PORT", 4023);
  const mode = (overrides.mode || process.env.AGENTPAY_MODE || "mock") as AgentPayMode;

  if (mode !== "mock" && mode !== "real") {
    throw new Error(`Invalid AGENTPAY_MODE: ${mode}`);
  }

  return {
    mode,
    skillPort: readNumberEnv("SKILL_PORT", readNumberEnv("PORT", 4020)),
    demoApiPort: readNumberEnv("DEMO_API_PORT", 4021),
    facilitatorPort,
    network,
    chainId,
    rpcUrl: process.env.PHAROS_RPC_URL || DEFAULT_PHAROS_RPC_URL,
    usdcAddress: normalizeHexAddress(process.env.USDC_ADDRESS, DEFAULT_TEST_USDC_ADDRESS),
    usdcName: process.env.USDC_NAME || DEFAULT_USDC_NAME,
    payToAddress: normalizeHexAddress(process.env.PAY_TO_ADDRESS, ZERO_ADDRESS),
    facilitatorUrl: process.env.FACILITATOR_URL || `http://localhost:${facilitatorPort}`,
    evmPrivateKey: normalizePrivateKey(process.env.EVM_PRIVATE_KEY),
    maxUsdDefault: readNumberEnv("MAX_USD_DEFAULT", 0.01),
    ...overrides,
  };
}

export function assertRealModeConfig(config: AgentPayConfig, role: "buyer" | "seller" | "facilitator"): void {
  if (role === "buyer" || role === "facilitator") {
    if (!config.evmPrivateKey) {
      throw new Error(`${role} real mode requires EVM_PRIVATE_KEY in environment.`);
    }
  }

  if ((role === "seller" || role === "facilitator") && config.payToAddress === ZERO_ADDRESS) {
    throw new Error(`${role} real mode requires PAY_TO_ADDRESS to be a non-zero recipient address.`);
  }
}

export function makePharosChain(config: AgentPayConfig) {
  return defineChain({
    id: config.chainId,
    name: "Pharos Atlantic Testnet",
    nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
    blockExplorers: { default: { name: "PharosScan", url: "https://atlantic.pharosscan.xyz" } },
    testnet: true,
  });
}
