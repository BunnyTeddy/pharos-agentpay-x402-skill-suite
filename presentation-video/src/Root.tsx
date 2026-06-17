import "./index.css";
import { Composition } from "remotion";
import { AgentPayPresentation, DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./AgentPayPresentation";

export const RemotionRoot = () => {
  return (
    <Composition
      id="AgentPayPresentation"
      component={AgentPayPresentation}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
