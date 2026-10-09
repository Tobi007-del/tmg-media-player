import { ToastOptions } from "@t007/toast";

export interface FrameConfig {
  disabled: boolean;
  fps: number;
  main: {
    usePoster: boolean;
    searchDuration: number;
    minSaturation: number;
    minBrightness: number;
  };
  toast: ToastOptions;
}
