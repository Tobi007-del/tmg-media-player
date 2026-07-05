import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { VoicePlug } from "@plugs/settings/voice";
import { getBoolOrStr, getUIOpt } from "@utils/obj";

export const getSettingsVoiceMenu = (plug: VoicePlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "voice",
      label: "Voice",
      widget: "group",
      getValue: () => getUIOpt(plug.config.active.options, plug.config.active.value),
      configPaths: ["settings.voice.active.value"],
      items: [
        {
          id: "voiceActive",
          label: "Active",
          widget: "select",
          getValue: () => getUIOpt(plug.config.active.options, plug.config.active.value),
          getOptions: () => plug.config.active.options!,
          onChange: (val: boolean) => (plug.config.active.value = getBoolOrStr(val) as typeof plug.config.active.value),
          configPaths: ["settings.voice.active.value"],
          tipHTML: "Turn the voice control engine on or off or passive (listens for the wake word to turn on).",
        },
        {
          id: "voiceWakeWord",
          label: "Wake word",
          widget: "input",
          inputs: [{ label: "Phrase", placeholder: "hey player", type: "text", value: () => plug.config.wakeWord, helperText: { info: "Phrase used to wake the assistant hands-free. Clear to disable." } }],
          getValue: () => (plug.config.wakeWord ? `"${plug.config.wakeWord}"` : ""),
          onChange: (val: Record<string, any>) => (plug.config.wakeWord = val["Phrase"].trim()),
          configPaths: ["settings.voice.wakeWord"],
        },
        {
          id: "voiceBehavior",
          label: "UI Behavior",
          widget: "select",
          getOptions: () => plug.config.behavior.options!,
          getValue: () => getUIOpt(plug.config.behavior.options, plug.config.behavior.value),
          onChange: (val: string) => (plug.config.behavior.value = val as typeof plug.config.behavior.value),
          configPaths: ["settings.voice.behavior.value"],
          tipHTML: "Determines how and when the voice listening toast appears on screen.",
        },
        {
          id: "voiceTimeout",
          label: "Sleep timeout",
          widget: "input",
          inputs: [{ label: "ms", placeholder: "7000", helperText: { info: "Time in ms of silence before the voice assistant goes back to sleep." }, type: "number", min: "1000", value: () => plug.config.timeout }],
          getValue: () => `${plug.config.timeout}ms`,
          onChange: (val: Record<string, any>) => (plug.config.timeout = Number(val["ms"])),
          configPaths: ["settings.voice.timeout"],
        },
        {
          id: "voiceInputs",
          label: "Inputs",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "voiceInputsDirect",
              label: "Direct",
              widget: "toggle",
              getValue: () => (plug.config.inputs.direct ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.inputs.direct = val),
              configPaths: ["settings.voice.inputs.direct"],
              title: "Skips the root menu, dropping you straight into Media > Intent so you can say things like 'Volume 80' immediately.",
            },
            {
              id: "voiceInputsStrict",
              label: "Strict",
              widget: "select",
              getOptions: () => plug.config.inputs.strict.options!,
              getValue: () => getUIOpt(plug.config.inputs.strict.options, plug.config.inputs.strict.value),
              onChange: (val: string) => (plug.config.inputs.strict.value = getBoolOrStr(val) as typeof plug.config.inputs.strict.value),
              configPaths: ["settings.voice.inputs.strict"],
              title: "If enabled, the voice assistant will always require your approval before executing a command otherwise they'll be executed automatically except for text.",
            },
            {
              id: "voiceInputsAccuracy",
              label: "Match accuracy",
              widget: "range",
              getValue: () => `${Math.round(plug.config.inputs.accuracy * 100)}%`,
              getRange: () => ({ min: 10, max: 100, step: 5, formatTooltip: (v: number) => `${Math.round(v)}%` }),
              onChange: (val: number | string) => (plug.config.inputs.accuracy = Number(val) / 100),
              configPaths: ["settings.voice.inputs.accuracy"],
              tipHTML: "Lower values allow for more speech-to-text typos (e.g., 'metadata' vs 'metadita'), but may trigger the wrong command.",
            },
          ],
        },
        {
          id: "voiceCommands",
          label: "Commands",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "voiceCommandsDisabled",
              label: "Disabled",
              widget: "toggle",
              getValue: () => (plug.config.commandsDisabled ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.commandsDisabled = val),
              configPaths: ["settings.voice.commandsDisabled"],
              tipHTML: "Disable all custom and built-in voice commands (direct paths navigation will still work).",
            },
            {
              id: "voiceAutoToggles",
              label: "Auto-toggles",
              widget: "toggle",
              getValue: () => (plug.config.autoToggles ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.autoToggles = val),
              configPaths: ["settings.voice.autoToggles"],
              tipHTML: "Automatically toggle boolean values when navigating directly to their path without needing an explicit on/off phrase.",
            },
          ],
        },
        {
          id: "voicePositionGroup",
          label: "Positioning",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "voiceListenerPos",
              label: "Listener",
              widget: "select",
              getOptions: () => plug.config.listenerPos.options!,
              getValue: () => getUIOpt(plug.config.listenerPos.options, plug.config.listenerPos.value),
              onChange: (val: string) => (plug.config.listenerPos.value = val as typeof plug.config.listenerPos.value),
              configPaths: ["settings.voice.listenerPos.value"],
              tipHTML: "Where the main microphone transcript appears",
            },
            {
              id: "voicePredictPos",
              label: "Predictor",
              widget: "select",
              getOptions: () => plug.config.predictorPos.options!,
              getValue: () => getUIOpt(plug.config.predictorPos.options, plug.config.predictorPos.value),
              onChange: (val: string) => (plug.config.predictorPos.value = val as typeof plug.config.predictorPos.value),
              configPaths: ["settings.voice.predictorPos.value"],
              tipHTML: "Where the AI prediction hints appear",
            },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.voice": typeof getSettingsVoiceMenu;
  }
}
