import type { CtlrConfig } from "@defs/config";
import type { DeepPartial } from "sia-reactor";

export const CONFIG_BUILD: DeepPartial<CtlrConfig> = {
  mediaType: "video",
  mediaPlayer: "TMG",
  startup: { intent: { playsInline: true, brightness: 100 } },
  settings: {},
  debug: true,
  noPlugList: ["settings.persist"], // "settings.persist" dev
};

/*
import { AUTO_BUILD, CSS_BUILD, BRIGHTNESS_BUILD, CAPTIONS_BUILD, CONTROL_PANEL_BUILD, ERROR_MESSAGES_BUILD, FAST_PLAY_BUILD, GESTURE_BUILD, KEYS_BUILD, LOCKED_BUILD, MODES_BUILD, NOTIFIERS_BUILD, OBJECT_FIT_BUILD, OVERLAY_BUILD, PERSIST_BUILD, PLAYBACK_RATE_BUILD, TIME_BUILD, FRAME_BUILD, TOASTS_BUILD, VOLUME_BUILD, LIGHT_STATE_BUILD, MEDIA_BUILD, DISABLED_BUILD } from "@plugs";

export const CONFIG_BUILD: DeepPartial<CtlrConfig> = {
  mediaType: "video",
  mediaPlayer: "TMG",
  media: MEDIA_BUILD,
  disabled: DISABLED_BUILD,
  lightState: LIGHT_STATE_BUILD,
  debug: true,
  settings: {
    auto: AUTO_BUILD,
    css: CSS_BUILD,
    brightness: BRIGHTNESS_BUILD,
    captions: CAPTIONS_BUILD,
    controlPanel: CONTROL_PANEL_BUILD,
    errorMessages: ERROR_MESSAGES_BUILD,
    fastPlay: FAST_PLAY_BUILD,
    gesture: GESTURE_BUILD,
    keys: KEYS_BUILD,
    locked: LOCKED_BUILD,
    modes: MODES_BUILD,
    objectFit: OBJECT_FIT_BUILD,
    notifiers: NOTIFIERS_BUILD,
    overlay: OVERLAY_BUILD,
    persist: PERSIST_BUILD,
    playbackRate: PLAYBACK_RATE_BUILD,
    time: TIME_BUILD,
    frame: FRAME_BUILD,
    toasts: TOASTS_BUILD,
    volume: VOLUME_BUILD,
  },
};
*/
