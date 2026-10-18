import { DeepPartial } from "sia-reactor";
import { LightConfig } from "./types";
import { TIME_BUILD } from "@plugs/settings/time/build";

export const LIGHT_BUILD: DeepPartial<LightConfig> = {
  disabled: false,
  preview: {
    usePoster: true,
    tease: false,
    loop: false,
    min: 0,
    max: 4,
  },
  controls: ["meta", "bigPlayPause", "fullscreenOrientation"],
  stallControl: "bigPlayPause",
};

TIME_BUILD.whitelist.push("light.preview.min", "light.preview.max");
