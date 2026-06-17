import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const CaptionOverlay = ({ captions }: { captions: Caption[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const activeCaption = captions.find((caption) => currentMs >= caption.startMs && currentMs < caption.endMs);

  if (!activeCaption) {
    return null;
  }

  const localFrame = ((currentMs - activeCaption.startMs) / 1000) * fps;
  const durationFrames = ((activeCaption.endMs - activeCaption.startMs) / 1000) * fps;
  const enter = interpolate(localFrame, [0, 14], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(localFrame, [durationFrames - 12, durationFrames], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center", paddingBottom: 62 }}>
      <div
        style={{
          opacity: enter * exit,
          transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px)`,
          maxWidth: 1280,
          padding: "22px 34px",
          borderRadius: 28,
          border: "1px solid rgba(125, 211, 252, 0.35)",
          background: "linear-gradient(135deg, rgba(2, 8, 23, 0.88), rgba(15, 23, 42, 0.82))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)",
          color: "#f8fafc",
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.18,
          letterSpacing: "-0.02em",
          textAlign: "center",
          whiteSpace: "pre-line",
          textShadow: "0 3px 18px rgba(0,0,0,0.45)",
        }}
      >
        {activeCaption.text}
      </div>
    </AbsoluteFill>
  );
};
