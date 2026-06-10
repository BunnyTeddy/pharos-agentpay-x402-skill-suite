# DoraHacks Submission: Pharos AgentPay x402 Skill Suite

## One-liner

A reusable x402 Skill Suite that lets AI agents discover paid APIs, enforce a max spend, pay over HTTP 402 on Pharos, fetch protected data, and return a verifiable receipt.

## Problem

AI agents need to buy data, tools, and services from other agents or APIs. Today that usually requires API keys, accounts, credit cards, or manual human approval. Pharos is positioned for an autonomous on-chain economy, so agents need a small, reusable payment primitive.

## Solution

AgentPay packages the payment flow as composable skills:

1. `discover_paid_resource` — probe a paid URL and parse x402 requirements.
2. `pay_fetch` — create a payment payload, retry the request, and return protected data plus receipt.
3. `decode_payment_receipt` — normalize the `PAYMENT-RESPONSE` header for auditability.

The repo includes a demo paid API with RWA alpha and research summarization endpoints, plus an optional facilitator for real Pharos testnet settlement.

## Hackathon judging alignment

- **Originality**: packages x402 as an agent-callable Skill Suite, not just a paid API demo.
- **Technical quality**: TypeScript ESM, zod schemas, tests, CLI, HTTP API, mock and real modes.
- **Practical use case**: autonomous agents can buy premium RWA/research data.
- **Reusability**: HTTP + CLI interfaces work with any agent framework.
- **Composability**: receipts can feed future Agent Arena workflows such as reputation, escrow, or paid research agents.
- **Pharos alignment**: defaults to Pharos Atlantic Testnet, `eip155:688689`, and x402 micro-payments.

## Demo script, 90–120 seconds

1. “This is Pharos AgentPay, a reusable x402 Skill Suite for AI agents.”
2. Show `npm run demo:mock`.
3. Explain: “The demo starts a paid API and the Skill HTTP server. The agent asks for RWA alpha.”
4. Point to the first 402 result: “The API refuses access and sends x402 payment requirements.”
5. Point to the successful result: “The Skill creates a payment payload, retries the request, and receives premium data plus a receipt.”
6. Point to `mockLedger.chargeCount`: “The same idempotency key is retried without creating a duplicate charge.”
7. Show README real-mode commands: “With `EVM_PRIVATE_KEY`, `PAY_TO_ADDRESS`, and `FACILITATOR_URL`, the same Skill uses Pharos testnet x402 settlement.”
8. Close: “For Phase 2, this becomes a paid Research Agent or Agent-to-Agent commerce primitive.”

## Run commands for judges

```bash
npm install
npm run build
npm test
npm run demo:mock
```

## Phase 2 path

- Add a full Research Agent that chooses between free and paid data sources.
- Use receipts as agent memory and reputation signals.
- Add budget policies, subscriptions, and agent-to-agent service discovery.
