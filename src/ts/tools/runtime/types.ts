import { Dimensions } from "@defs/generics";

export interface GlobalState {
  audioCtxReady: boolean;
  dimensions: {
    window: Dimensions;
  };
  screenOrientation: {
    type: OrientationType;
    angle: number;
    locked: boolean;
  };
  isVisible: boolean;
  isTransient: boolean;
  inFullscreen: boolean;
  clock: number;
}
