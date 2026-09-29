import { DeepPartial } from "sia-reactor";
import { LightConfig } from "./types";

export const LIGHT_BUILD: DeepPartial<LightConfig> = {
  disabled: false,
  preview: {
    usePoster: true,
    tease:true,
    loop: false,
    min: 0,
    max: 4,
  },
  controls: ["meta", "bigPlayPause", "fullscreenOrientation"],
  stallControl: "bigPlayPause",
};
