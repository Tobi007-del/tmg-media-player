import { Dimensions } from "@defs/generics";

// Defines states explicitly managed by the TMG Environment Observers
export interface CtlrState {
  readyState: number;
  audioContextReady: boolean;
  mediaIntersecting: boolean;
  mediaParentIntersecting: boolean;
  dimensions: {
    container: Dimensions & {
      tier: string;
    };
    pseudoContainer: Dimensions & {
      tier: string;
    };
    window: Dimensions;
    object: Dimensions & {
      top: number;
      left: number;
    };
  };
  screenOrientation: {
    type: OrientationType;
    angle: number;
  };
  docVisibilityState: DocumentVisibilityState;
  docInFullscreen: boolean;
  frameReadyPromise?: Promise<null> | null;
}
