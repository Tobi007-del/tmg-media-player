import type { Action } from "@defs/action";

export interface GestureGeneralConfig {
  click: Action["id"] | false;
  dblClick: Action["id"] | false;
}

export interface GestureTouchConfig {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  fastSwipes: boolean;
  threshold: number;
  sliderTimeout: number;
  xRatio: number;
  yRatio: number;
  axesRatio: number;
  inset: number;
}

export interface GestureWheelConfig {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  timeout: number;
  xRatio: number;
  yRatio: number;
}

export type GestureConfig = GestureGeneralConfig & {
  wheel: GestureWheelConfig;
  touch: GestureTouchConfig;
};

export interface GestureState {
  skipping: boolean;
}
