import { DeepPartial } from "sia-reactor";
import { FastPlay } from "./types";

export const FAST_PLAY_BUILD: DeepPartial<FastPlay> = {
  playbackRate: 2,
  key: true,
  pointer: {
    type: "all",
    threshold: 800,
    inset: 20,
  },
  reset: true,
  rewind: true,
};
