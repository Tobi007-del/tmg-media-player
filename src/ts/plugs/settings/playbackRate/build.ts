import { PlaybackRateConfig } from "./types";

export const PLAYBACK_RATE_BUILD: Partial<PlaybackRateConfig> = {
  min: 0.1,
  max: 8,
  skip: 0.25,
  options: [1, 1.25, 1.5, 2, 3],
};
