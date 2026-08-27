import { DeepPartial } from "sia-reactor";
import { FastPlayConfig } from "./types";

export const FAST_PLAY_BUILD: DeepPartial<FastPlayConfig> = {
  playbackRate: 2,
  pointer: {
    type: {
      value: "all",
      options: [
        { value: "all", display: "All" },
        { value: "mouse", display: "Mouse" },
        { value: "touch", display: "Touch" },
        { value: "pen", display: "Pen" },
        { value: "none", display: "None" },
      ],
    },
    threshold: 800,
    inset: 20,
  },
  key: true,
  resetPaused: true,
  allowRewind: true,
};
