import { DeepPartial } from "sia-reactor";
import { LightState } from "./types";

export const LIGHT_STATE_BUILD: DeepPartial<LightState> = {
  disabled: false,
  controls: ["meta", "bigplaypause", "fullscreenorientation"],
  preview: {
    usePoster: true,
    time: 4,
  },
};
