import { MediaIntent } from "@defs/contract";

export interface GestureGeneralConfig {
  click: keyof MediaIntent | false;
  dblClick: keyof MediaIntent | false;
}

export interface GestureTouchConfig {
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
  skipPersist: boolean;
}
