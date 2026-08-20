import { DeepPartial } from "sia-reactor";
import { GestureConfig, GestureTouchConfig, GestureWheelConfig } from ".";
import { IS_MOBILE } from "@utils/env";

export const GESTURE_TOUCH_BUILD: Partial<GestureTouchConfig> = {
  volume: true,
  brightness: true,
  timeline: true,
  threshold: 200,
  inset: 20,
  sliderTimeout: 1000,
  axesRatio: 3,
  xRatio: 1,
  yRatio: 1,
};

export const GESTURE_WHEEL_BUILD: Partial<GestureWheelConfig> = {
  volume: true,
  brightness: true,
  timeline: true,
  timeout: 2000,
  xRatio: 12,
  yRatio: 6,
};

export const GESTURE_BUILD: DeepPartial<GestureConfig> = {
  click: IS_MOBILE ? false : "paused",
  dblClick: IS_MOBILE ? "paused" : "fullscreen",
  // touch: GESTURE_TOUCH_BUILD,
  // wheel: GESTURE_WHEEL_BUILD,
};
