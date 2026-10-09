import { DeepPartial } from "sia-reactor";
import { VoiceConfig } from "./types";
import { ACTIONS_DICT } from "@consts/actions";

export const VOICE_COMMANDS: Record<string, string | string[]> = {
  next: ["next video", "next item"],
  previous: ["previous video", "previous item"],
  timeSkipFwd: ["skip forward", "forward"],
  timeSkipBwd: ["skip backward", "backward"],
  timePreviousChapter: "previous chapter",
  timeNextChapter: "next chapter",
  volumeUp: ["increase volume", "volume up"],
  volumeDown: ["decrease volume", "volume down"],
  brightnessUp: ["increase brightness", "brightness up"],
  brightnessDown: ["decrease brightness", "brightness down"],
  playbackRateUp: ["increase speed", "speed up"],
  playbackRateDown: ["decrease speed", "slow down"],
  timeStart: "start over",
  timeEnd: "end now",
  capture: "screenshot",
  skipAd: "skip ad",
  timeTravelUndo: "undo",
  timeTravelRedo: "redo",
  voiceWake: "player",
  voiceQuit: "quit",
  voiceMute: "snub",
  voiceSleep: "sleep",
  voiceSubmit: ["submit", "enter"],
  voiceCtxPrevious: "go back",
  voiceCtxNext: "go front",
  voiceCtxClear: "clear",
  voiceToggleOn: ["yes", "on", "true"],
  voiceToggleOff: ["no", "off", "false"],
}; // speech bait
for (const k in ACTIONS_DICT) VOICE_COMMANDS[k] ??= ""; // UX boost

export const VOICE_BUILD: DeepPartial<VoiceConfig> = {
  active: {
    value: "passive",
    options: [
      { value: true, display: "On" },
      { value: false, display: "Off" },
      { value: "passive", display: "Passive" },
    ],
  },
  muted: false,
  process: {
    accuracy: 0.75,
    allowCommands: true,
    stage: {
      value: "post-route",
      options: [
        { value: "", display: "Default" },
        { value: "anytime", display: "Awake or Asleep" },
        { value: "pre-route", display: "Awake pre-route" },
        { value: "post-route", display: "Awake post-route" },
        { value: "never", display: "Never" },
      ],
    },
    match: {
      value: "blob",
      options: [
        { value: "", display: "Default" },
        { value: "blob", display: "Full speech" },
        { value: "chunk", display: "Partial speech" },
      ],
    },
  },
  routing: {
    timeout: 15000,
    direct: true,
    strict: {
      value: "auto",
      options: [
        { value: true, display: "On" },
        { value: false, display: "Off" },
        { value: "auto", display: "Auto (On for text)" },
      ],
    },
    autoToggles: false,
  },
  commands: VOICE_COMMANDS,
  toasts: {
    behavior: {
      value: "persistent",
      options: [
        { value: "persistent", display: "Persistent" },
        { value: "auto", display: "Auto (On speech)" },
        { value: "strict", display: "Strict (Only when awake)" },
      ],
    },
    router: {
      position: "top-center",
      icon: "🎙️",
      compact: true,
    },
    helper: {
      position: "bottom-left",
      icon: "✨",
      autoClose: false,
    },
  },
};
