import { DeepPartial } from "sia-reactor";
import { KeysConfig } from "./types";
import { KEYS_BLOCKS } from "@t007/utils";
import { ACTIONS_DICT } from "@consts/actions";

export const KEYS_SHORTCUTS: Record<string, string | string[]> = {
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
  timeTravelUndo: ["Ctrl+z", "Cmd+z"],
  timeTravelRedo: ["Ctrl+y", "Ctrl+Shift+z", "Cmd+Shift+z"], // "Cmd+y" -> history
  voiceWake: "Shift+v",
  voiceQuit: "Shift+q",
  voiceSleep: "Shift+z", // zz
  voiceMute: "Shift+m",
};
for (const k in ACTIONS_DICT) KEYS_SHORTCUTS[k] ??= ""; // UX boost

export const KEYS_OVERIDES = ["Space", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];

export const KEYS_WHITELIST = ["Space", "Escape", "ArrowLeft", "ArrowRight", "1", "2", "3", "4", "5", "6", "7", "8", "9"]; // "ArrowUp", "ArrowDown", "Enter", "Home", "End", "0",

export const KEYS_MODS_ACTIONS = ["timeSkip", "volume", "brightness", "playbackRate", "captionsFontSize"] as const; // numerical values

export const KEYS_BUILD: DeepPartial<KeysConfig> = {
  disabled: false,
  overrides: KEYS_OVERIDES,
  shortcuts: KEYS_SHORTCUTS,
  blocks: KEYS_BLOCKS,
  whitelist: KEYS_WHITELIST,
  moddedlist: [" ", "arrowleft", "arrowright", ...Object.keys(KEYS_SHORTCUTS).filter((k) => KEYS_MODS_ACTIONS.some((m) => k.startsWith(m))), "capture"],
  linkedPhase: true,
  showOverlay: true,
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
