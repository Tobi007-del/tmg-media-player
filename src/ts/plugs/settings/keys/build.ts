import { DeepPartial } from "sia-reactor";
import { KeysConfig } from "./types";
import { KEYS_BLOCKS } from "@t007/utils";

export const KEYS_WHITELIST = ["Space", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const KEY_SHORTCUT_MOD_ACTIONS = ["timeSkip", "volume", "brightness", "playbackRate", "captionsFontSize"] as const; // numerical values

export const KEYS_BUILD: DeepPartial<KeysConfig> = {
  disabled: false,
  strictMatches: false,
  overrides: ["Space", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"],
  shortcuts: {
    previous: "Shift+p",
    next: "Shift+n",
    playPause: "k",
    mute: "m",
    dark: "d",
    timeSkipBwd: "j",
    timeSkipFwd: "l",
    timeStart: ["Home", "0"],
    timeEnd: ["End"],
    volumeUp: "ArrowUp",
    volumeDown: "ArrowDown",
    brightnessUp: "y",
    brightnessDown: "h",
    playbackRateUp: ">",
    playbackRateDown: "<",
    timeStepFwd: ".",
    timeStepBwd: ",",
    timeFormat: "z",
    timeMode: "q",
    capture: "s",
    objectFit: "a",
    pictureInPicture: "i",
    theater: "t",
    fullscreen: "f",
    captions: "c",
    captionsFontSizeUp: ["+", "="],
    captionsFontSizeDown: ["-", "_"],
    captionsFontFamily: "u",
    captionsFontWeight: "g",
    captionsFontVariant: "v",
    captionsFontOpacity: "o",
    captionsBackgroundOpacity: "b",
    captionsWindowOpacity: "w",
    captionsCharacterEdgeStyle: "e",
    captionsTextAlignment: "x",
    settings: "?",
    cast: "Shift+r",
    airplay: "Shift+r",
    escape: "Escape",
  },
  blocks: KEYS_BLOCKS,
  whitelist: KEYS_WHITELIST,
  mods: {
    disabled: false,
    timeSkip: {
      ctrl: 60,
      shift: 10,
    },
    volume: {
      ctrl: 50,
      shift: 10,
    },
    brightness: {
      ctrl: 50,
      shift: 10,
    },
    playbackRate: {
      ctrl: 1,
    },
    captionsFontSize: {},
  },
};
