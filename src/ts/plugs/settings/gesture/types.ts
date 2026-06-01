import { MediaIntent } from "@defs/contract";

export interface GestureGeneral {
  click: keyof MediaIntent | false;
  dblClick: keyof MediaIntent | false;
}

export interface GestureTouch {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  threshold: number;
  sliderTimeout: number;
  xRatio: number;
  yRatio: number;
  axesRatio: number;
  inset: number;
}

export interface GestureWheel {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  timeout: number;
  xRatio: number;
  yRatio: number;
}

export type Gesture = GestureGeneral & {
  wheel: GestureWheel;
  touch: GestureTouch;
};

export interface GestureState {
  skipPersist: boolean;
}
