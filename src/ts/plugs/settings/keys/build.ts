import { DeepPartial } from "sia-reactor";
import { KeysConfig } from "./types";
import { KEYS_BLOCKS } from "@t007/utils";

export const KEYS_WHITELIST = ["Space", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const KEY_SHORTCUT_MOD_ACTIONS = ["timeSkip", "volume", "brightness", "playbackRate", "captionsFontSize"] as const; // numerical values

export const KEYS_BUILD: DeepPartial<KeysConfig> = {
  disabled: false,
  strictMatch: false,
  rankedMatch: true,
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
    timePreviousChapter: "p",
    timeNextChapter: "n",
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
    capture: "s", // screenshot
    objectFit: "a",
    pictureInPicture: "i",
    theater: "t",
    fullscreen: "f",
    captions: "c",
    captionsFontSizeUp: ["+", "="],
    captionsFontSizeDown: ["-", "_"],
    captionsFontFamily: "u",
    captionsFontWeight: "g", // g in weight or gravity
    captionsFontVariant: "v",
    captionsFontOpacity: "o",
    captionsBackgroundOpacity: "b",
    captionsWindowOpacity: "w",
    captionsCharacterEdgeStyle: "e", // edges
    captionsTextAlignment: "r", // shift 'r'ight
    settings: "?",
    cast: "Shift+c",
    airplay: "Shift+a",
    escape: "Escape",
    skipAd: "x", // like pushing an "x" button
    voiceWake: "Shift+v",
    voiceQuit: "Shift+q",
    voiceSleep: "Shift+z", // zz
    voiceMute: "Shift+m",
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
    }, // ">|<" has shift
    captionsFontSize: {},
  },
  showOverlay: true,
  phase: {
    value: "keyup",
    options: [
      { value: "", display: "Default" },
      { value: "keydown", display: "Key down" },
      { value: "keyup", display: "Key up" },
      { value: "none", display: "None" },
    ],
  },
};
