import { UISettings } from "@defs/UIOptions";

export interface FastPlayConfig {
  playbackRate: number;
  key: boolean;
  pointer: {
    type: UISettings<string>;
    threshold: number;
    inset: number;
  };
  resetPaused: boolean;
  rewind: boolean;
}

export interface FastPlayState {
  isRewinding: boolean;
}
