import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { VoicePlug } from "@plugs/settings/voice";
import { formatAction } from "@utils/keys";
import { getUIOpt } from "@utils/obj";
import { formatUITime } from "@utils/time";

export const getSettingsVoiceMenu = (plug: VoicePlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "interaction",
      label: "Interaction",
      widget: "group",
      getValue: () => "On",
      items: [
        {
          id: "voice",
          label: "Voice",
          getBadge: () => ({ label: "beta" }),
          widget: "group",
          getValue: () => (plug.config.active.value ? "On" : "Off"),
          configPaths: ["settings.voice.active.value"],
          items: [
            { id: "voiceActive", label: "Active", widget: "select", getValue: () => getUIOpt(plug.config.active.options, plug.config.active.value), getOptions: () => plug.config.active.options!, onChange: (val: any) => (plug.config.active.value = val), configPaths: ["settings.voice.active.value"], getTipHTML: () => "Turn the voice control engine on or off or passive (listens for the wake word to turn on)" },
            { id: "voiceMuted", label: "Muted", widget: "toggle", getValue: () => (plug.config.muted ? "On" : "Off"), onChange: (val: boolean) => (plug.config.muted = val), configPaths: ["settings.voice.muted"], getTipHTML: () => "Temporarily mute the microphone. Path and command routing will remain active." },
            { id: "voiceWakeWord", label: "Wake word", widget: "input", inputs: [{ name: "phrase", label: "Phrase", placeholder: "hey kosi", type: "text", minLength: 1, maxLength: 30, value: () => plug.config.wakeWord, helperText: { info: `Phrase used to wake the assistant hands-free. Clear to disable.` } }], getValue: () => formatAction("", [plug.config.wakeWord]), onChange: (val: Record<string, any>) => (plug.config.wakeWord = (val.phrase || "").trim()), configPaths: ["settings.voice.wakeWord"] },
            { id: "voiceTimeout", label: "Sleep timeout", widget: "input", inputs: [{ name: "time", label: "ms", placeholder: "7000", helperText: { info: "Time in ms of silence before the voice assistant goes back to sleep" }, type: "number", min: "1000", required: true, value: () => plug.config.timeout }], getValue: () => formatUITime(plug.config.timeout), onChange: (val: Record<string, any>) => (plug.config.timeout = val.time), configPaths: ["settings.voice.timeout"] },
            {
              id: "voiceInputs",
              label: "Inputs",
              widget: "group",
              getValue: () => "On",
              items: [
                { id: "voiceInputsDirect", label: "Direct", widget: "toggle", getValue: () => (plug.config.inputs.direct ? "On" : "Off"), onChange: (val: boolean) => (plug.config.inputs.direct = val), configPaths: ["settings.voice.inputs.direct"], title: "Skips the Root on reset, dropping you straight into Media > Intent so you can say things like 'Volume 80' immediately." },
                { id: "voiceInputsStrict", label: "Strict", widget: "select", getOptions: () => plug.config.inputs.strict.options!, getValue: () => getUIOpt(plug.config.inputs.strict.options, plug.config.inputs.strict.value), onChange: (val: any) => (plug.config.inputs.strict.value = val), configPaths: ["settings.voice.inputs.strict"], title: "If enabled, the voice assistant will always require your approval before executing a command otherwise they'll be executed automatically except for text." },
                { id: "voiceInputsAccuracy", label: "Accuracy", widget: "range", getValue: () => `${Math.round(plug.config.inputs.accuracy * 100)}%`, getRange: () => ({ min: 10, max: 100, step: 5, formatTooltip: (v: number) => `${Math.round(v)}%` }), onChange: (val: number | string) => (plug.config.inputs.accuracy = Number(val) / 100), configPaths: ["settings.voice.inputs.accuracy"], getTipHTML: () => "Lower values allow for more speech-to-text typos (e.g., 'metadata' vs 'metadita'), but may trigger the wrong command" },
                { id: "voiceAutoToggles", label: "Auto-toggles", widget: "toggle", getValue: () => (plug.config.inputs.autoToggles ? "On" : "Off"), onChange: (val: boolean) => (plug.config.inputs.autoToggles = val), configPaths: ["settings.voice.inputs.autoToggles"], getTipHTML: () => "Automatically toggle boolean values when navigating directly to their path without needing an explicit on/off phrase" },
                { id: "voiceAllowCommands", label: "Allow commands", widget: "toggle", getValue: () => (plug.config.inputs.allowCommands ? "On" : "Off"), onChange: (val: boolean) => (plug.config.inputs.allowCommands = val), configPaths: ["settings.voice.inputs.allowCommands"], getTipHTML: () => "Allow custom and built-in voice commands (direct paths navigation will work regardless)" },
              ],
            },
            {
              id: "voiceNotificationsGroup",
              label: "Notifications",
              widget: "group",
              getValue: () => "On",
              items: [
                { id: "voiceBehavior", label: "Behavior", widget: "select", getOptions: () => plug.config.toasts.behavior.options!, getValue: () => getUIOpt(plug.config.toasts.behavior.options, plug.config.toasts.behavior.value), onChange: (val: string) => (plug.config.toasts.behavior.value = val as typeof plug.config.toasts.behavior.value), configPaths: ["settings.voice.toasts.behavior.value"], getTipHTML: () => "Determines how and when the voice listening toast appears on screen" },
                { id: "voiceListenerPos", label: "Listener", widget: "select", getOptions: () => plug.config.toasts.listenerPos.options!, getValue: () => getUIOpt(plug.config.toasts.listenerPos.options, plug.config.toasts.listenerPos.value), onChange: (val: string) => (plug.config.toasts.listenerPos.value = val as typeof plug.config.toasts.listenerPos.value), configPaths: ["settings.voice.toasts.listenerPos.value"], getTipHTML: () => "Where the main microphone transcript appears when active" },
                { id: "voicePredictPos", label: "Predictor", widget: "select", getOptions: () => plug.config.toasts.predictorPos.options!, getValue: () => getUIOpt(plug.config.toasts.predictorPos.options, plug.config.toasts.predictorPos.value), onChange: (val: string) => (plug.config.toasts.predictorPos.value = val as typeof plug.config.toasts.predictorPos.value), configPaths: ["settings.voice.toasts.predictorPos.value"], getTipHTML: () => "Where the prediction hints appear, or transcript when passive" },
              ],
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
