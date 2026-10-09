import { FrameConfig } from "./types";

export const FRAME_BUILD: Partial<FrameConfig> = {
  disabled: false,
  fps: 30,
  main: {
    usePoster: true, // switch to false if auto-gen from video
    searchDuration: 25,
    minSaturation: 12,
    minBrightness: 40,
  },
  toast: {
    icon: false,
    autoClose: 15000,
  },
};
