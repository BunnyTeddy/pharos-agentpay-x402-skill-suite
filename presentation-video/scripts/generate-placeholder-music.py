#!/usr/bin/env python3
"""Generate an original low-volume ambient WAV placeholder for the AgentPay presentation."""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SAMPLE_RATE = 44100
DURATION_SECONDS = 90
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "music" / "placeholder-ambient.wav"

# A soft synthetic pad with a slow pulse. Entirely generated/original.
NOTES = np.array([55.0, 82.41, 110.0, 164.81, 220.0, 329.63], dtype=np.float64)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    t = np.linspace(0, DURATION_SECONDS, SAMPLE_RATE * DURATION_SECONDS, endpoint=False, dtype=np.float64)
    fade_in = np.clip(t / 5.0, 0.0, 1.0)
    fade_out = np.clip((DURATION_SECONDS - t) / 6.0, 0.0, 1.0)
    env = np.minimum(fade_in, fade_out)

    left = np.zeros_like(t)
    right = np.zeros_like(t)
    for i, freq in enumerate(NOTES):
        drift = np.sin(2 * np.pi * (0.012 + i * 0.003) * t + i) * 0.75
        gain = 0.12 / (i + 1)
        harmonic_gain = 0.025 / (i + 1)
        phase_left = 2 * np.pi * (freq + drift) * t
        phase_right = 2 * np.pi * (freq + drift) * t + 0.85 * (i + 1)
        left += np.sin(phase_left) * gain + np.sin(phase_left * 2.005) * harmonic_gain
        right += np.sin(phase_right) * gain + np.sin(phase_right * 2.005) * harmonic_gain

    pulse = np.sin(2 * np.pi * 0.5 * t) ** 8
    left += np.sin(2 * np.pi * 659.25 * t) * 0.018 * np.maximum(0.0, pulse)
    right += np.sin(2 * np.pi * 659.25 * t + 0.85) * 0.018 * np.maximum(0.0, pulse)

    left *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.035 * t)) * env
    right *= (0.78 + 0.22 * np.sin(2 * np.pi * 0.035 * t + 0.85)) * env

    stereo = np.column_stack((left, right))
    stereo = np.clip(stereo, -0.95, 0.95)
    pcm = (stereo * 32767).astype("<i2")

    with wave.open(str(OUTPUT), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())

    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
