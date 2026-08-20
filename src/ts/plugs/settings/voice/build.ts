import { DeepPartial } from "sia-reactor";
import { VoiceConfig } from "./types";
import { TOAST_UI_POSITIONS } from "@t007/toast";

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
  wakeWord: "player",
  timeout: 15000,
  inputs: {
    direct: true,
    strict: {
      value: "auto",
      options: [
        { value: true, display: "On" },
        { value: false, display: "Off" },
        { value: "auto", display: "Auto (On for text)" },
      ],
    },
    accuracy: 0.75,
    autoToggles: false,
    commandsDisabled: false,
  },
  commands: {
    voiceQuit: ["bye bye", "exit", "quit"],
    voiceMute: ["snub"],
    voiceSleep: ["sleep"],
    voiceSubmit: ["submit", "enter", "confirm"],
    voiceHistoryFirst: ["start", "first", "root"],
    voiceHistoryPrevious: ["go back", "back", "previous"],
    voiceHistoryNext: ["go front", "front", "go forward", "forward", "next"],
    voiceHistoryLast: ["end", "last", "leaf"],
    voiceHistoryClear: ["reset", "clear"],
    voiceToggleOn: ["on", "yes", "true", "enable", "start"],
    voiceToggleOff: ["off", "no", "false", "disable", "stop"],
  },
  toasts: {
    behavior: {
      value: "persistent",
      options: [
        { value: "persistent", display: "Persistent" },
        { value: "auto", display: "Auto (Show on speech)" },
        { value: "strict", display: "Strict (Show after wake)" },
      ],
    },
    listenerPos: {
      value: "top-center",
      options: TOAST_UI_POSITIONS,
    },
    predictorPos: {
      value: "bottom-left",
      options: TOAST_UI_POSITIONS,
    },
  },
};
