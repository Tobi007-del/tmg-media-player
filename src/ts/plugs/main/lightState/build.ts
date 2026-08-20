import { DeepPartial } from "sia-reactor";
import { LightStateConfig } from "./types";

export const LIGHT_STATE_BUILD: DeepPartial<LightStateConfig> = {
  disabled: false,
  controls: ["meta", "bigPlayPause", "fullscreenOrientation"],
  preview: {
    usePoster: true,
    time: 4,
  },
};
