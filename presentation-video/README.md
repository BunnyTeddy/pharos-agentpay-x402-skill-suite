# AgentPay Remotion Presentation Video

A 90-second, no-voiceover Remotion presentation for the Pharos AgentPay x402 Skill Suite.

## Composition

- Composition ID: `AgentPayPresentation`
- Format: 1920×1080, 30fps, 2700 frames (~90 seconds)
- Audio: `public/music/placeholder-ambient.wav`
- Captions: `public/captions/agentpay-captions.json`

## Commands

```bash
npm install
npm run dev       # Open Remotion Studio
npm run typecheck # TypeScript check
npm run still     # Render a 45s sanity-check still
npm run render    # Render out/agentpay-presentation.mp4
```

## Replacing music

Drop a licensed music file into `public/music/`, then update the `staticFile()` path in `src/AgentPayPresentation.tsx`.
The current WAV is an original generated placeholder from `scripts/generate-placeholder-music.py`.

## Notes

- No voiceover is included.
- All on-screen narration is handled by timed English captions.
- The Remotion project is isolated from the root AgentPay skill/API code.
