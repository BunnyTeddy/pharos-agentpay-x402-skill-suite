import type { CSSProperties, ReactNode } from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";
import { presentationCaptions } from "./presentation-captions";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_IN_FRAMES = 2700;

const colors = {
  bg: "#020817",
  cyan: "#67e8f9",
  cyanDeep: "#0891b2",
  violet: "#8b5cf6",
  blue: "#2563eb",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#fb7185",
  white: "#f8fafc",
  slate: "#94a3b8",
  darkCard: "rgba(15, 23, 42, 0.74)",
  line: "rgba(148, 163, 184, 0.22)",
};

type SceneId = "title" | "problem" | "solution" | "architecture" | "discover" | "payfetch" | "receipt" | "real" | "closing";

type SceneSpec = {
  id: SceneId;
  start: number;
  end: number;
  kicker: string;
  title: string;
};

const scenes: SceneSpec[] = [
  { id: "title", start: 0, end: 6, kicker: "Pharos Agent Carnival · Phase 1", title: "AgentPay x402 Skill Suite" },
  { id: "problem", start: 6, end: 14, kicker: "Problem", title: "Agents cannot buy data like software does." },
  { id: "solution", start: 14, end: 23, kicker: "Solution", title: "Package payment as reusable agent skills." },
  { id: "architecture", start: 23, end: 34, kicker: "Architecture", title: "One flow for Studio, CLI, and any AI agent." },
  { id: "discover", start: 34, end: 50, kicker: "Step 1", title: "Discover 402 payment requirements." },
  { id: "payfetch", start: 50, end: 66, kicker: "Step 2", title: "Pay, retry, and unlock premium data." },
  { id: "receipt", start: 66, end: 78, kicker: "Audit trail", title: "Receipts become agent memory." },
  { id: "real", start: 78, end: 86, kicker: "Real mode", title: "Same skill path, Pharos settlement." },
  { id: "closing", start: 86, end: 90, kicker: "Agent commerce primitive", title: "AgentPay turns HTTP 402 into agent action." },
];

const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);

const ease = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const fadeOut = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const glassCard: CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(2, 8, 23, 0.62))",
  boxShadow: "0 28px 100px rgba(2, 8, 23, 0.46), inset 0 1px 0 rgba(255,255,255,0.08)",
  borderRadius: 32,
};

export const AgentPayPresentation = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: colors.bg, color: colors.white, overflow: "hidden" }}>
      <Background />
      <ProgressRail />
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={secondsToFrames(scene.start)}
          durationInFrames={secondsToFrames(scene.end - scene.start)}
          premountFor={FPS}
        >
          <SceneShell scene={scene}>
            <SceneContent id={scene.id} />
          </SceneShell>
        </Sequence>
      ))}
      <CaptionOverlay captions={presentationCaptions} />
      <Audio
        src={staticFile("music/placeholder-ambient.wav")}
        volume={(audioFrame) =>
          interpolate(audioFrame, [0, 90, DURATION_IN_FRAMES - 120, DURATION_IN_FRAMES], [0, 0.16, 0.16, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Watermark frame={frame} />
    </AbsoluteFill>
  );
};

const Background = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const driftA = Math.sin(seconds * 0.28) * 36;
  const driftB = Math.cos(seconds * 0.19) * 42;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% 18%, rgba(103,232,249,0.20), transparent 34%), radial-gradient(circle at 78% 16%, rgba(139,92,246,0.20), transparent 34%), radial-gradient(circle at 58% 86%, rgba(34,197,94,0.10), transparent 36%), linear-gradient(135deg, #020817 0%, #071426 52%, #020817 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: -170 + driftA,
          top: 520 + driftB,
          borderRadius: "50%",
          border: "1px solid rgba(103,232,249,0.10)",
          background: "radial-gradient(circle, rgba(103,232,249,0.10), transparent 64%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 540,
          height: 540,
          right: -130 + driftB,
          top: 110 - driftA,
          borderRadius: "50%",
          border: "1px solid rgba(139,92,246,0.12)",
          background: "radial-gradient(circle, rgba(139,92,246,0.14), transparent 68%)",
        }}
      />
      <GridOverlay />
    </AbsoluteFill>
  );
};

const GridOverlay = () => (
  <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: "absolute", inset: 0, opacity: 0.28 }}>
    <defs>
      <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M 72 0 L 0 0 0 72" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
      </pattern>
      <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="white" stopOpacity="0.3" />
        <stop offset="0.45" stopColor="white" stopOpacity="0.08" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <mask id="gridMask">
        <rect width={WIDTH} height={HEIGHT} fill="url(#gridFade)" />
      </mask>
    </defs>
    <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" mask="url(#gridMask)" />
  </svg>
);

const SceneShell = ({ scene, children }: { scene: SceneSpec; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const durationFrames = secondsToFrames(scene.end - scene.start);
  const enter = ease(frame, 0, 24);
  const exit = fadeOut(frame, durationFrames - 20, durationFrames);

  return (
    <AbsoluteFill
      style={{
        opacity: enter * exit,
        transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px) scale(${interpolate(enter, [0, 1], [0.985, 1])})`,
        padding: "84px 92px 168px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 34 }}>
        <div>
          <div style={{ color: colors.cyan, textTransform: "uppercase", letterSpacing: "0.19em", fontWeight: 900, fontSize: 22 }}>
            {scene.kicker}
          </div>
          <h1 style={{ margin: "14px 0 0", fontSize: 54, lineHeight: 1.02, letterSpacing: "-0.055em", maxWidth: 1100 }}>
            {scene.title}
          </h1>
        </div>
        <NetworkBadge />
      </div>
      {children}
    </AbsoluteFill>
  );
};

const NetworkBadge = () => (
  <div
    style={{
      ...glassCard,
      borderRadius: 999,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 22,
      fontWeight: 800,
    }}
  >
    <span style={{ width: 12, height: 12, borderRadius: "50%", background: colors.green, boxShadow: `0 0 22px ${colors.green}` }} />
    Pharos · eip155:688689
  </div>
);

const SceneContent = ({ id }: { id: SceneId }) => {
  switch (id) {
    case "title":
      return <TitleScene />;
    case "problem":
      return <ProblemScene />;
    case "solution":
      return <SolutionScene />;
    case "architecture":
      return <ArchitectureScene />;
    case "discover":
      return <DiscoverScene />;
    case "payfetch":
      return <PayFetchScene />;
    case "receipt":
      return <ReceiptScene />;
    case "real":
      return <RealModeScene />;
    case "closing":
      return <ClosingScene />;
  }
};

const TitleScene = () => {
  const frame = useCurrentFrame();
  const title = ease(frame, 4, 30);
  const stats = ease(frame, 42, 26);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.04fr 0.96fr", gap: 48, alignItems: "center", height: "100%" }}>
      <div>
        <div style={{ display: "flex", gap: 14, marginBottom: 24, opacity: title }}>
          <Pill label="x402 over HTTP 402" color={colors.cyan} />
          <Pill label="Skill API + CLI + Studio" color={colors.violet} />
        </div>
        <div
          style={{
            fontSize: 132,
            lineHeight: 0.92,
            letterSpacing: "-0.075em",
            fontWeight: 950,
            opacity: title,
            transform: `translateX(${interpolate(title, [0, 1], [-42, 0])}px)`,
          }}
        >
          Pharos
          <br />
          <span style={{ color: colors.cyan }}>AgentPay</span>
        </div>
        <p style={{ color: colors.slate, fontSize: 30, lineHeight: 1.35, maxWidth: 820, marginTop: 28, opacity: title }}>
          A reusable payment primitive that lets autonomous AI agents discover paid APIs, pay safely, fetch data, and store receipts.
        </p>
      </div>
      <div style={{ ...glassCard, height: 610, padding: 34, position: "relative", overflow: "hidden", opacity: stats }}>
        <OrbitalLogo />
        <div style={{ position: "absolute", left: 34, bottom: 34, right: 34, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Metric label="Default network" value="Pharos Atlantic" />
          <Metric label="Payment rail" value="x402 V2" />
          <Metric label="Demo mode" value="Mock + Real" />
          <Metric label="Receipt" value="Verifiable JSON" />
        </div>
      </div>
    </div>
  );
};

const ProblemScene = () => {
  const frame = useCurrentFrame();
  const cards = [
    { title: "API keys", detail: "Static secrets do not fit autonomous commerce.", icon: "key" },
    { title: "Cards", detail: "Card rails require accounts and human billing flows.", icon: "card" },
    { title: "Manual approval", detail: "Agents need auditable policies, not click-by-click control.", icon: "hand" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 42, alignItems: "stretch", height: "100%" }}>
      <div style={{ ...glassCard, padding: 34, position: "relative", overflow: "hidden" }}>
        <AgentNeedCard progress={ease(frame, 4, 28)} />
      </div>
      <div style={{ display: "grid", gap: 18 }}>
        {cards.map((card, index) => {
          const p = ease(frame, 16 + index * 12, 20);
          return <BlockerCard key={card.title} {...card} progress={p} />;
        })}
      </div>
    </div>
  );
};

const SolutionScene = () => {
  const frame = useCurrentFrame();
  const skillCards = [
    { id: "discover_paid_resource", color: colors.cyan, text: "Probe a URL and extract x402 requirements from HTTP 402." },
    { id: "pay_fetch", color: colors.violet, text: "Enforce max spend, sign a payment, retry the request." },
    { id: "decode_payment_receipt", color: colors.green, text: "Normalize PAYMENT-RESPONSE into receipt JSON." },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 26, height: "100%", alignItems: "center" }}>
      {skillCards.map((skill, index) => {
        const p = ease(frame, 10 + index * 18, 24);
        return (
          <div
            key={skill.id}
            style={{
              ...glassCard,
              minHeight: 500,
              padding: 34,
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [48, 0])}px)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Pill label={`Skill ${index + 1}`} color={skill.color} />
              <h2 style={{ fontSize: 42, lineHeight: 1.02, letterSpacing: "-0.045em", margin: "26px 0 20px" }}>{skill.id}</h2>
              <p style={{ color: colors.slate, fontSize: 25, lineHeight: 1.36 }}>{skill.text}</p>
            </div>
            <div style={{ height: 110, borderRadius: 26, background: `linear-gradient(135deg, ${skill.color}28, rgba(15,23,42,0.2))`, border: `1px solid ${skill.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 950 }}>
              {index === 0 ? "402" : index === 1 ? "$ → data" : "receipt"}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ArchitectureScene = () => {
  const frame = useCurrentFrame();
  const nodes = [
    { label: "AI Agent", sub: "workflow / CLI", color: colors.cyan },
    { label: "AgentPay Skill API", sub: "discover + pay-fetch", color: colors.violet },
    { label: "Protected API", sub: "RWA alpha endpoint", color: colors.amber },
    { label: "Pharos settlement", sub: "facilitator / receipt", color: colors.green },
  ];

  return (
    <div style={{ ...glassCard, height: "100%", padding: 46, position: "relative", overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox="0 0 1540 560" style={{ position: "absolute", inset: 0, margin: "auto", opacity: ease(frame, 24, 34) }}>
        <defs>
          <linearGradient id="flowGradient" x1="0" x2="1">
            <stop offset="0" stopColor={colors.cyan} />
            <stop offset="0.5" stopColor={colors.violet} />
            <stop offset="1" stopColor={colors.green} />
          </linearGradient>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="url(#flowGradient)" />
          </marker>
        </defs>
        {[0, 1, 2].map((index) => (
          <path
            key={index}
            d={`M ${295 + index * 350} 280 C ${380 + index * 350} 210, ${480 + index * 350} 210, ${565 + index * 350} 280`}
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            markerEnd="url(#arrow)"
          />
        ))}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, height: "100%", alignItems: "center", position: "relative" }}>
        {nodes.map((node, index) => {
          const p = ease(frame, 6 + index * 13, 22);
          return <ArchitectureNode key={node.label} {...node} progress={p} index={index} />;
        })}
      </div>
    </div>
  );
};

const DiscoverScene = () => {
  const frame = useCurrentFrame();
  const pulse = 0.72 + Math.sin(frame * 0.12) * 0.12;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 34, height: "100%" }}>
      <div style={{ ...glassCard, padding: 34, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Pill label="GET /alpha/rwa" color={colors.cyan} />
        <div>
          <h2 style={{ fontSize: 58, letterSpacing: "-0.025em", margin: "0 0 22px" }}>Premium RWA<br />Alpha</h2>
          <p style={{ color: colors.slate, fontSize: 27, lineHeight: 1.36 }}>The resource server refuses free access and returns x402 requirements.</p>
        </div>
        <div style={{ borderRadius: 30, background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.42)", padding: 28 }}>
          <div style={{ color: colors.red, fontSize: 74, fontWeight: 950, opacity: pulse }}>HTTP 402</div>
          <div style={{ color: colors.white, fontSize: 26, fontWeight: 800 }}>Payment Required</div>
        </div>
      </div>
      <CodePanel
        progress={ease(frame, 30, 28)}
        title="PAYMENT-REQUIRED"
        lines={[
          "{",
          '  "x402Version": 2,',
          '  "network": "eip155:688689",',
          '  "amount": "3000",',
          '  "asset": "USDC",',
          '  "resource": "/alpha/rwa"',
          "}",
        ]}
        highlightLines={[2, 3]}
      />
    </div>
  );
};

const PayFetchScene = () => {
  const frame = useCurrentFrame();
  const steps = [
    { label: "Budget guard", value: "maxUsd: 0.01", color: colors.green },
    { label: "Sign payload", value: "PAYMENT-SIGNATURE", color: colors.violet },
    { label: "Retry request", value: "X-PAYMENT", color: colors.cyan },
    { label: "Unlock data", value: "200 OK", color: colors.green },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "0.96fr 1.04fr", gap: 34, height: "100%" }}>
      <div style={{ display: "grid", gap: 16 }}>
        {steps.map((step, index) => {
          const p = ease(frame, 10 + index * 22, 22);
          return <PaymentStep key={step.label} {...step} index={index + 1} progress={p} />;
        })}
      </div>
      <div style={{ ...glassCard, padding: 34, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Pill label="Premium response" color={colors.green} />
          <div style={{ color: colors.green, fontSize: 28, fontWeight: 950, opacity: ease(frame, 82, 20) }}>UNLOCKED</div>
        </div>
        <div style={{ borderRadius: 30, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.34)", padding: 30, flex: 1, opacity: ease(frame, 72, 24) }}>
          <div style={{ color: colors.slate, fontSize: 22, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900 }}>RWA alpha signal</div>
          <h2 style={{ fontSize: 48, letterSpacing: "-0.045em", margin: "18px 0" }}>Tokenized US Treasuries</h2>
          <p style={{ color: colors.white, fontSize: 28, lineHeight: 1.38, margin: 0 }}>
            Stablecoin liquidity and sub-second settlement make RWA data subscriptions practical for autonomous agents.
          </p>
          <div style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Pill label="sentiment: positive" color={colors.green} />
            <Pill label="confidence: 0.86" color={colors.cyan} />
            <Pill label="agent action ready" color={colors.violet} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ReceiptScene = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 34, height: "100%" }}>
      <CodePanel
        progress={ease(frame, 6, 26)}
        title="PAYMENT-RESPONSE"
        lines={[
          "{",
          '  "success": true,',
          '  "transaction": "mock:38166dc5...",',
          '  "network": "eip155:688689",',
          '  "payer": "agentpay-mock-wallet",',
          '  "amount": "3000",',
          '  "mode": "mock"',
          "}",
        ]}
        highlightLines={[1, 2, 3]}
      />
      <div style={{ ...glassCard, padding: 34, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Pill label="Receipt Vault" color={colors.green} />
        <div style={{ display: "grid", gap: 18 }}>
          <ReceiptRow label="Idempotency key" value="demo-alpha-001" progress={ease(frame, 20, 18)} />
          <ReceiptRow label="First transaction" value="mock:38166dc5" progress={ease(frame, 36, 18)} />
          <ReceiptRow label="Retry transaction" value="mock:38166dc5" progress={ease(frame, 52, 18)} />
          <ReceiptRow label="Charge count" value="1 unique charge" progress={ease(frame, 68, 18)} />
        </div>
        <div style={{ borderRadius: 28, padding: 24, background: "rgba(34,197,94,0.12)", color: colors.green, fontSize: 30, fontWeight: 950, textAlign: "center", opacity: ease(frame, 86, 18) }}>
          retry-safe payments for agents
        </div>
      </div>
    </div>
  );
};

const RealModeScene = () => {
  const frame = useCurrentFrame();
  const items = [
    { label: "EVM_PRIVATE_KEY", color: colors.violet },
    { label: "PAY_TO_ADDRESS", color: colors.cyan },
    { label: "FACILITATOR_URL", color: colors.green },
    { label: "USDC_ADDRESS", color: colors.amber },
  ];
  return (
    <div style={{ ...glassCard, height: "100%", padding: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
      <div>
        <h2 style={{ fontSize: 74, lineHeight: 1, letterSpacing: "-0.06em", margin: "0 0 24px" }}>Mock for judges. Real for settlement.</h2>
        <p style={{ color: colors.slate, fontSize: 30, lineHeight: 1.38, maxWidth: 720 }}>
          The same skill interface upgrades from deterministic mock mode to Pharos Atlantic testnet x402 settlement.
        </p>
      </div>
      <div style={{ display: "grid", gap: 18 }}>
        {items.map((item, index) => <EnvBadge key={item.label} {...item} progress={ease(frame, 10 + index * 10, 18)} />)}
      </div>
    </div>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const p = ease(frame, 2, 28);
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.95, 1])})` }}>
        <div style={{ margin: "0 auto 30px", width: 164, height: 164 }}>
          <OrbitalMark />
        </div>
        <h2 style={{ fontSize: 92, lineHeight: 0.95, letterSpacing: "-0.07em", margin: 0 }}>
          Agent-to-agent commerce
          <br />
          <span style={{ color: colors.cyan }}>starts with one skill.</span>
        </h2>
        <p style={{ color: colors.slate, fontSize: 34, marginTop: 28 }}>AgentPay · x402 · Pharos Atlantic Testnet</p>
      </div>
    </div>
  );
};

const Pill = ({ label, color }: { label: string; color: string }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 15px",
      borderRadius: 999,
      color,
      background: `${color}16`,
      border: `1px solid ${color}45`,
      fontSize: 19,
      fontWeight: 900,
      letterSpacing: "0.01em",
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 16px ${color}` }} />
    {label}
  </span>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div style={{ borderRadius: 24, padding: 22, background: "rgba(2, 8, 23, 0.55)", border: `1px solid ${colors.line}` }}>
    <div style={{ color: colors.slate, fontSize: 18, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</div>
    <div style={{ color: colors.white, fontSize: 29, fontWeight: 950, marginTop: 8 }}>{value}</div>
  </div>
);

const OrbitalLogo = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", width: 430, height: 430, borderRadius: "50%", border: "1px solid rgba(103,232,249,0.2)", transform: `rotate(${frame * 0.22}deg)` }} />
      <div style={{ position: "absolute", width: 330, height: 330, borderRadius: "50%", border: "1px dashed rgba(139,92,246,0.34)", transform: `rotate(${-frame * 0.16}deg)` }} />
      <div style={{ width: 220, height: 220 }}>
        <OrbitalMark />
      </div>
    </div>
  );
};

const OrbitalMark = () => (
  <svg width="100%" height="100%" viewBox="0 0 220 220">
    <defs>
      <linearGradient id="mark" x1="42" x2="185" y1="22" y2="195">
        <stop stopColor={colors.cyan} />
        <stop offset="0.48" stopColor="#22d3ee" />
        <stop offset="1" stopColor={colors.violet} />
      </linearGradient>
    </defs>
    <path d="M110 18 198 180 110 150 22 180 110 18Z" fill="url(#mark)" />
    <path d="M110 56 160 152 110 136 60 152 110 56Z" fill="#020817" opacity="0.72" />
    <path d="M110 18v132L22 180 110 18Z" fill="#79f7ff" opacity="0.34" />
  </svg>
);

const AgentNeedCard = ({ progress }: { progress: number }) => (
  <div style={{ opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [36, 0])}px)` }}>
    <Pill label="Autonomous research agent" color={colors.cyan} />
    <div style={{ marginTop: 34, borderRadius: 34, padding: 34, background: "rgba(2, 8, 23, 0.58)", border: `1px solid ${colors.line}` }}>
      <div style={{ fontSize: 26, color: colors.slate, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>Task</div>
      <div style={{ fontSize: 52, lineHeight: 1.02, letterSpacing: "-0.055em", fontWeight: 950, marginTop: 14 }}>Buy premium RWA alpha before market open.</div>
    </div>
    <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <Metric label="Needs" value="paid data" />
      <Metric label="Requires" value="receipt" />
    </div>
  </div>
);

const BlockerCard = ({ title, detail, icon, progress }: { title: string; detail: string; icon: string; progress: number }) => (
  <div
    style={{
      ...glassCard,
      padding: 30,
      opacity: progress,
      transform: `translateX(${interpolate(progress, [0, 1], [54, 0])}px)`,
      display: "grid",
      gridTemplateColumns: "88px 1fr",
      gap: 24,
      alignItems: "center",
    }}
  >
    <div style={{ width: 88, height: 88, borderRadius: 26, background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.38)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.red, fontSize: 34, fontWeight: 950 }}>
      {icon === "key" ? "⌘" : icon === "card" ? "$" : "×"}
    </div>
    <div>
      <h2 style={{ margin: 0, fontSize: 36, letterSpacing: "-0.035em" }}>{title}</h2>
      <p style={{ margin: "9px 0 0", color: colors.slate, fontSize: 23, lineHeight: 1.3 }}>{detail}</p>
    </div>
  </div>
);

const ArchitectureNode = ({ label, sub, color, progress, index }: { label: string; sub: string; color: string; progress: number; index: number }) => (
  <div
    style={{
      ...glassCard,
      minHeight: 260,
      padding: 26,
      opacity: progress,
      transform: `translateY(${interpolate(progress, [0, 1], [44, 0])}px)`,
      position: "relative",
    }}
  >
    <div style={{ position: "absolute", top: 22, right: 22, color, fontSize: 28, fontWeight: 950 }}>0{index + 1}</div>
    <div style={{ width: 70, height: 70, borderRadius: 22, background: `${color}18`, border: `1px solid ${color}50`, marginBottom: 34 }} />
    <h2 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.04em" }}>{label}</h2>
    <p style={{ margin: "10px 0 0", color: colors.slate, fontSize: 22 }}>{sub}</p>
  </div>
);

const CodePanel = ({ title, lines, highlightLines, progress }: { title: string; lines: string[]; highlightLines: number[]; progress: number }) => (
  <div style={{ ...glassCard, padding: 30, opacity: progress, transform: `translateY(${interpolate(progress, [0, 1], [42, 0])}px)`, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <Pill label={title} color={colors.violet} />
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ width: 13, height: 13, borderRadius: "50%", background: colors.red }} />
        <span style={{ width: 13, height: 13, borderRadius: "50%", background: colors.amber }} />
        <span style={{ width: 13, height: 13, borderRadius: "50%", background: colors.green }} />
      </div>
    </div>
    <div style={{ fontFamily: "SFMono-Regular, Menlo, Consolas, monospace", fontSize: 27, lineHeight: 1.68, color: "#dbeafe" }}>
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} style={{ padding: "0 12px", borderRadius: 14, background: highlightLines.includes(index) ? "rgba(103,232,249,0.12)" : "transparent", color: highlightLines.includes(index) ? colors.cyan : "#dbeafe" }}>
          <span style={{ color: "#64748b", marginRight: 18 }}>{String(index + 1).padStart(2, "0")}</span>
          {line}
        </div>
      ))}
    </div>
  </div>
);

const PaymentStep = ({ label, value, color, progress, index }: { label: string; value: string; color: string; progress: number; index: number }) => (
  <div
    style={{
      ...glassCard,
      padding: 26,
      opacity: progress,
      transform: `translateX(${interpolate(progress, [0, 1], [-44, 0])}px)`,
      display: "grid",
      gridTemplateColumns: "76px 1fr",
      gap: 22,
      alignItems: "center",
    }}
  >
    <div style={{ width: 76, height: 76, borderRadius: 24, background: `${color}18`, border: `1px solid ${color}50`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 950 }}>
      {index}
    </div>
    <div>
      <div style={{ color: colors.white, fontSize: 31, fontWeight: 950, letterSpacing: "-0.035em" }}>{label}</div>
      <div style={{ color, fontSize: 23, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  </div>
);

const ReceiptRow = ({ label, value, progress }: { label: string; value: string; progress: number }) => (
  <div style={{ borderRadius: 24, padding: "20px 22px", background: "rgba(2,8,23,0.50)", border: `1px solid ${colors.line}`, opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [34, 0])}px)` }}>
    <div style={{ color: colors.slate, fontSize: 19, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</div>
    <div style={{ color: colors.white, fontSize: 31, fontWeight: 950, marginTop: 6 }}>{value}</div>
  </div>
);

const EnvBadge = ({ label, color, progress }: { label: string; color: string; progress: number }) => (
  <div style={{ borderRadius: 26, padding: "24px 28px", background: `${color}12`, border: `1px solid ${color}45`, color, fontSize: 31, fontWeight: 950, opacity: progress, transform: `translateX(${interpolate(progress, [0, 1], [44, 0])}px)` }}>
    {label}
  </div>
);

const ProgressRail = () => {
  const frame = useCurrentFrame();
  const progress = frame / DURATION_IN_FRAMES;
  return (
    <div style={{ position: "absolute", left: 92, right: 92, top: 42, height: 8, borderRadius: 999, background: "rgba(148,163,184,0.14)", overflow: "hidden", zIndex: 10 }}>
      <div style={{ height: "100%", width: `${Math.min(100, progress * 100)}%`, background: `linear-gradient(90deg, ${colors.cyan}, ${colors.violet}, ${colors.green})`, borderRadius: 999 }} />
    </div>
  );
};

const Watermark = ({ frame }: { frame: number }) => (
  <div style={{ position: "absolute", right: 92, bottom: 48, color: "rgba(226,232,240,0.42)", fontSize: 18, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", opacity: interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
    AgentPay Studio · no voiceover · captioned demo
  </div>
);
