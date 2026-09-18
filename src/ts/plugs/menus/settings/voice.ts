import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { VoicePlug } from "@plugs/settings/voice";
import { formatAction } from "@utils/keys";
import { getUIOpt } from "@utils/obj";
import { formatUITime } from "@utils/time";
import { TOAST_FORM_INPUTS, getToastFormVal, syncToastConfig } from "./toasts";
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
            { id: "voiceMuted", label: "Muted", widget: "toggle", getValue: () => (plug.config.muted ? "On" : "Off"), onChange: (val: boolean) => (plug.config.muted = val), configPaths: ["settings.voice.muted"], title: "Temporarily mute the microphone. Path and command routing will remain active." },
            {
              id: "voiceProcess",
              label: "Process",
              widget: "group",
              getValue: () => (plug.config.active.value ? "On" : "Off"),
              configPaths: ["settings.voice.active.value"],
              items: [
                { id: "voiceProcessAccuracy", label: "Accuracy", widget: "range", getValue: () => `${Math.round(plug.config.process.accuracy * 100)}%`, getRange: () => ({ min: 10, max: 100, step: 5, formatTooltip: (v: number) => `${Math.round(v)}%` }), onChange: (val: number | string) => (plug.config.process.accuracy = Number(val) / 100), configPaths: ["settings.voice.process.accuracy"], getTipHTML: () => "Lower values allow for more speech-to-text typos (e.g., 'metadata' vs 'metadita'), but may trigger the wrong command" },
                { id: "voiceProcessStage", label: "Default stage", widget: "select", getOptions: () => plug.config.process.stage.options!, getValue: () => getUIOpt(plug.config.process.stage.options, plug.config.process.stage.value), onChange: (val: any) => (plug.config.process.stage.value = val), configPaths: ["settings.voice.process.stage"], getTipHTML: () => "The default stage to process commands when not explicitly specified" },
                { id: "voiceProcessMatch", label: "Default match", widget: "select", getOptions: () => plug.config.process.match.options!, getValue: () => getUIOpt(plug.config.process.match.options, plug.config.process.match.value), onChange: (val: any) => (plug.config.process.match.value = val), configPaths: ["settings.voice.process.match"], getTipHTML: () => "The default match to process commands when not explicitly specified" },
                { id: "voiceProcessAllowCommands", label: "Allow commands", widget: "toggle", getValue: () => (plug.config.process.allowCommands ? "On" : "Off"), onChange: (val: boolean) => (plug.config.process.allowCommands = val), configPaths: ["settings.voice.process.allowCommands"], title: "Allow custom and built-in voice commands (direct paths navigation will work regardless)" },
              ],
            },
            {
              id: "voiceRouting",
              label: "Routing",
              widget: "group",
              getValue: () => (plug.config.active.value === true ? "On" : "Off"),
              configPaths: ["settings.voice.active.value"],
              items: [
                { id: "voiceRoutingStrict", label: "Strict", widget: "select", getOptions: () => plug.config.routing.strict.options!, getValue: () => getUIOpt(plug.config.routing.strict.options, plug.config.routing.strict.value), onChange: (val: any) => (plug.config.routing.strict.value = val), configPaths: ["settings.voice.routing.strict"], getTipHTML: () => "If enabled, the voice assistant will always require approval before executing otherwise it'll be automatic except for text." },
                { id: "voiceRoutingDirect", label: "Direct", widget: "toggle", getValue: () => (plug.config.routing.direct ? "On" : "Off"), onChange: (val: boolean) => (plug.config.routing.direct = val), configPaths: ["settings.voice.routing.direct"], title: "Skips the Root on reset, dropping you straight into Media > Intent so you can say things like 'Volume 80' immediately." },
                { id: "voiceRoutingAutoToggles", label: "Auto-toggles", widget: "toggle", getValue: () => (plug.config.routing.autoToggles ? "On" : "Off"), onChange: (val: boolean) => (plug.config.routing.autoToggles = val), configPaths: ["settings.voice.routing.autoToggles"], title: "Automatically toggle boolean values when navigating directly to their path without needing an explicit on/off phrase" },
                { id: "voiceRoutingTimeout", label: "Sleep timeout", widget: "input", inputs: [{ name: "time", label: "ms", placeholder: "7000", helperText: { info: "Time in ms of silence before the voice assistant goes back to sleep" }, type: "number", min: "1000", required: true, value: () => plug.config.routing.timeout }], getValue: () => formatUITime(plug.config.routing.timeout), onChange: (val: Record<string, any>) => (plug.config.routing.timeout = val.time), configPaths: ["settings.voice.routing.timeout"] },
              ],
            },
            {
              id: "voiceToastsGroup",
              label: "Notifications",
              widget: "group",
              getValue: () => "On",
              items: [
                { id: "voiceBehavior", label: "Behavior", widget: "select", getOptions: () => plug.config.toasts.behavior.options!, getValue: () => getUIOpt(plug.config.toasts.behavior.options, plug.config.toasts.behavior.value), onChange: (val: string) => (plug.config.toasts.behavior.value = val as typeof plug.config.toasts.behavior.value), configPaths: ["settings.voice.toasts.behavior.value"], getTipHTML: () => "Determines how and when the voice listening toast appears on screen" },
                {
                  id: "voiceToastsRouter",
                  label: "Router",
                  widget: "input",
                  getValue: () => "",
                  inputs: TOAST_FORM_INPUTS.map((input) => ({ ...input, value: () => getToastFormVal(plug.config.toasts.router[input.name as keyof typeof plug.config.toasts.router], input.name) })),
                  onChange: (val: any) => syncToastConfig(val, plug.config.toasts.router),
                  configPaths: ["settings.voice.toasts.router"],
                  title: "Where the main microphone transcript appears when routing",
                },
                {
                  id: "voiceToastsHelper",
                  label: "Helper",
                  widget: "input",
                  getValue: () => "",
                  inputs: TOAST_FORM_INPUTS.map((input) => ({ ...input, value: () => getToastFormVal(plug.config.toasts.helper[input.name as keyof typeof plug.config.toasts.router], input.name) })),
                  onChange: (val: any) => syncToastConfig(val, plug.config.toasts.helper),
                  configPaths: ["settings.voice.toasts.helper"],
                  title: "Where the word hints appear, or transcript when passive",
                },
              ],
            },
            {
              id: "voiceWakeWord",
              label: "Wake word(s)",
              widget: "input",
              inputs: [{ name: "phrase", label: "Phrase(s)", placeholder: "hey player", type: "text", minLength: 1, value: () => plug.config.commands.voiceWake.join(", "), helperText: { info: `Phrases to wake the assistant hands-free. Clear to disable.` } }],
              getValue: () => formatAction("", plug.config.commands.voiceWake),
              onChange: (val: Record<string, any>) =>
                (plug.config.commands.voiceWake = val.phrase
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)),
              configPaths: ["settings.voice.commands.voiceWake"],
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
