import { DeepPartial } from "sia-reactor";
import { VoiceConfig } from "./types";
import { ACTIONS_DICT } from "@consts/actions";

export const VOICE_COMMANDS: Record<string, string | string[]> = {
  skipAd: "skip ad", // speech bait
  voiceWake: "player",
  voiceQuit: "quit",
  voiceMute: "snub",
  voiceSleep: "sleep",
  voiceSubmit: ["submit", "confirm", "enter"],
  voiceCtxPrevious: ["go back", "back", "previous"],
  voiceCtxNext: ["go front", "front", "go forward", "forward", "next"],
  voiceCtxClear: ["reset", "clear"],
  voiceToggleOn: ["on", "yes", "true", "enable", "start"],
  voiceToggleOff: ["off", "no", "false", "disable", "stop"],
};
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
