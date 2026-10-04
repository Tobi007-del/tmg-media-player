import { FrameConfig } from "./types";

export const FRAME_BUILD: Partial<FrameConfig> = {
  disabled: false,
  fps: 30,
  toast: {
    icon: false,
    autoClose: 15000,
  },
  goodTime: {
    searchDuration: 25,
    minSaturation: 12,
    minBrightness: 40,
  },
};
