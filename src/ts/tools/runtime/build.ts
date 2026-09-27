import { queryFullscreen } from "@utils/dom";
import { IS_MOBILE } from "@utils/env";
import { reactive } from "sia-reactor";
import { GlobalState } from "./types";
import { Controller } from "@core/controller";
const win = "undefined" !== typeof window ? window : undefined;

export const ATTR = "tmgcontrols";

export const controllers: Controller[] = [];

export const globalState = reactive<GlobalState>({
  audioCtxReady: false,
  dimensions: {
    window: {
      width: win?.innerWidth ?? 0,
      height: win?.innerHeight ?? 0,
    },
  },
  screenOrientation: {
    type: win?.screen?.orientation?.type ?? `${IS_MOBILE ? "portrait" : "landscape"}-primary`,
    angle: win?.screen?.orientation?.angle ?? 0,
    locked: false,
  },
  isVisible: win?.document?.visibilityState !== "hidden",
  isTransient: false,
  inFullscreen: win ? queryFullscreen() : false,
  clock: 0,
});
