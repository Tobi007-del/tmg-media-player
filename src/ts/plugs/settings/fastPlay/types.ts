import { UISettings } from "@defs/UIOptions";

export interface FastPlayConfig {
  playbackRate: number;
  pointer: {
    type: UISettings<string>;
    threshold: number;
    inset: number;
  };
  key: boolean;
  resetPaused: boolean;
  allowRewind: boolean;
}

export interface FastPlayState {
  active: boolean;
  ptrActive: boolean;
  rewinding: boolean;
}
