import { DeepPartial } from "sia-reactor";
import { VoiceConfig, VoiceAiConfig } from "./types";
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
  temporalUndo: "undo",
  temporalRedo: "redo",
  voiceWake: "player",
  voiceQuit: "quit",
  voiceSleep: "sleep",
  voiceMute: "stop listening",
  ai: ["pilot", "spark"],
  aiStop: ["stop thinking", "stop working"],
  voicePrevious: ["go back", "undo work"],
  voiceNext: ["go forward", "redo work"],
  voiceClear: "clear context",
  voiceSubmit: ["submit", "enter"],
  voiceToggleOn: ["yes", "on", "true"],
  voiceToggleOff: ["no", "off", "false"],
}; // speech bait
for (const k of Object.keys(ACTIONS_DICT)) VOICE_COMMANDS[k] ??= ""; // UX boost

export const VOICE_AI_BUILD: DeepPartial<VoiceAiConfig> = {
  active: true,
  persona: { model: "", limit: 50, voice: "default", preference: "" }, // "gemini-3.5-flash-lite" ~3,500 tokens (initial & system prompt, and response)
  feedback: { captions: true, volume: 1, rate: 1 },
  apiKey: "",
  endpoint: "", // "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  history: [],
  draft: { frame: -1, text: "" },
};

export const VOICE_BUILD: DeepPartial<VoiceConfig> = {
  active: {
    value: false,
    options: [
      { value: true, display: "On" },
      { value: false, display: "Off" },
      { value: "passive", display: "Passive" },
    ],
  },
  muted: false,
  ai: VOICE_AI_BUILD,
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
    timeout: 30000,
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
        { value: "auto", display: "Auto (On speech too)" },
        { value: "strict", display: "Strict (Only when awake)" },
      ],
    },
    quoter: {
      position: "top-center",
      icon: "🎙️",
      compact: true,
    },
    router: {
      position: "bottom-center",
      icon: "🧭",
      autoClose: false,
    },
  },
};

export * from "./prompt";
