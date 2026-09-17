import { DeepPartial } from "sia-reactor";
import { LightStateConfig } from "./types";

export const LIGHT_STATE_BUILD: DeepPartial<LightStateConfig> = {
  disabled: false,
  preview: {
    usePoster: true,
    time: 4,
  },
  controls: ["meta", "bigPlayPause", "fullscreenOrientation"],
  stallControl: "bigPlayPause",
};
