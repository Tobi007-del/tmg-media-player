import { VoiceConfig } from "./types";
import { TOAST_UI_POSITIONS } from "@t007/toast";

export const VOICE_BUILD: VoiceConfig = {
  active: {
    value: "passive",
    options: [
      { value: true, display: "On" },
      { value: false, display: "Off" },
      { value: "passive", display: "Passive" },
    ],
  },
  wakeWord: "player",
  behavior: {
    value: "persistent",
    options: [
      { value: "persistent", display: "Persistent" },
      { value: "auto", display: "Auto (Show on speech)" },
      { value: "strict", display: "Strict (Show after wake)" },
    ],
  },
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
  },
  autoToggles: false,
  commandsDisabled: false,
  commands: {
    voiceQuit: ["byebye", "exit", "quit"],
    voiceSleep: ["sleep"],
    voiceSubmit: ["submit", "enter", "confirm"],
    voiceHistoryFirst: ["start", "first", "root"],
    voiceHistoryPrev: ["goback", "back", "previous"],
    voiceHistoryNext: ["gofront", "front", "goforward", "forward", "next"],
    voiceHistoryLast: ["end", "last", "leaf"],
    voiceHistoryClear: ["reset", "clear"],
    voiceToggleOn: ["on", "yes", "true", "enable", "start"],
    voiceToggleOff: ["off", "no", "false", "disable", "stop"],
  },
  listenerPos: {
    value: "top-center",
    options: TOAST_UI_POSITIONS,
  },
  predictorPos: {
    value: "bottom-left",
    options: TOAST_UI_POSITIONS,
  },
};
