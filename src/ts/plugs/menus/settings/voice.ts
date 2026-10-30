import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { VoicePlug } from "@plugs/settings/voice";
import { getUIOpt } from "@utils/obj";
import { formatUITime } from "@utils/time";
import { getToastMenuInputs, syncToastConfig } from "./toasts";
import { getTimeTravelHistoryMenu } from "./timeTravel";

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
            { id: "voiceActive", label: "Active", widget: "select", getValue: () => getUIOpt(plug.config.active.options, plug.config.active.value), getOptions: () => plug.config.active.options!, onChange: (val: any) => (plug.config.active.value = val), configPaths: ["settings.voice.active.value"], getTipHTML: () => "Turn the voice control engine on, off or passive (listens for the wake word to turn on)" },
            { id: "voiceMuted", label: "Muted", widget: "toggle", getValue: () => plug.config.muted, onChange: (val: boolean) => (plug.config.muted = val), configPaths: ["settings.voice.muted"], title: "Temporarily mute the microphone. Path and command routing will remain active." },
            {
              id: "voiceAi",
              label: "Copilot",
              widget: "group",
              feature: "voiceAi",
              getValue: () => (plug.config.ai.active ? "On" : "Off"),
              configPaths: ["settings.voice.ai.active"],
              items: [
                { id: "voiceAiActive", label: "Active", widget: "toggle", getValue: () => plug.config.ai.active, onChange: (val: boolean) => (plug.config.ai.active = val), getDisabled: () => !plug.config.active.value, configPaths: ["settings.voice.active.value", "settings.voice.ai.active"], title: "Turn AI copilot mode on or off after the voice control engine is turned on too" },
                { id: "voiceAiPreference", label: "Preference", widget: "input", inputs: [{ name: "preference", label: "User preference", placeholder: "e.g. Gen Z, concise, poetic...", helperText: { info: "Custom style, persona, or instructions for the AI" }, type: "text", value: () => plug.config.ai.preference }], getValue: () => plug.config.ai.preference, onChange: (val: any) => (plug.config.ai.preference = val.preference), configPaths: ["settings.voice.ai.preference"] },
                { id: "voiceAiModel", label: "Model", widget: "input", inputs: [{ name: "model", label: "Model name", placeholder: "gemini-3.5-flash-lite", helperText: { info: "Model identifier sent in payload when querying custom endpoint" }, type: "text", value: () => plug.config.ai.model }], getValue: () => plug.config.ai.model, onChange: (val: any) => (plug.config.ai.model = val.model), configPaths: ["settings.voice.ai.model"] },
                { id: "voiceAiApiKey", label: "API Key", widget: "input", inputs: [{ name: "apiKey", label: "API Key", placeholder: "Bearer token", helperText: { info: "Authorization header for custom LLM endpoint requests" }, type: "password", passwordMeter: false, value: () => plug.config.ai.apiKey } as any], getValue: () => "•".repeat(plug.config.ai.apiKey.length), onChange: (val: any) => (plug.config.ai.apiKey = val.apiKey), configPaths: ["settings.voice.ai.apiKey"] },
                { id: "voiceAiEndpoint", label: "Endpoint", widget: "input", inputs: [{ name: "endpoint", label: "Endpoint URL", placeholder: "https://api...", helperText: { info: "Custom LLM endpoint URL (e.g. https://generativelanguage.googleapis.com/v1beta/openai/chat/completions). Leave blank for Built-in AI." }, type: "text", value: () => plug.config.ai.endpoint }], getValue: () => plug.config.ai.endpoint || "Built-in AI", onChange: (val: any) => (plug.config.ai.endpoint = val.endpoint), configPaths: ["settings.voice.ai.endpoint"] },
              ],
            },
            {
              id: "voiceProcess",
              label: "Process",
              widget: "group",
              getValue: () => (plug.config.active.value ? "On" : "Off"),
              configPaths: ["settings.voice.active.value"],
              items: [
                { id: "voiceProcessAccuracy", label: "Accuracy", widget: "range", getValue: () => `${Math.round(plug.config.process.accuracy * 100)}%`, getRange: () => ({ min: 10, max: 100, step: 5, formatTooltip: (v: number) => `${Math.round(v)}%` }), onChange: (val: number) => (plug.config.process.accuracy = val / 100), configPaths: ["settings.voice.process.accuracy"], getTipHTML: () => "Lower values allow for more speech-to-text typos (e.g., 'metadata' vs 'metadita'), but may trigger the wrong command" },
                { id: "voiceProcessStage", label: "Default stage", widget: "select", getOptions: () => plug.config.process.stage.options!, getValue: () => getUIOpt(plug.config.process.stage.options, plug.config.process.stage.value), onChange: (val: any) => (plug.config.process.stage.value = val), configPaths: ["settings.voice.process.stage"], getTipHTML: () => "The default stage to process commands when not explicitly specified" },
                { id: "voiceProcessMatch", label: "Default match", widget: "select", getOptions: () => plug.config.process.match.options!, getValue: () => getUIOpt(plug.config.process.match.options, plug.config.process.match.value), onChange: (val: any) => (plug.config.process.match.value = val), configPaths: ["settings.voice.process.match"], getTipHTML: () => "The default match to process commands when not explicitly specified" },
                { id: "voiceProcessAllowCommands", label: "Allow commands", widget: "toggle", getValue: () => plug.config.process.allowCommands, onChange: (val: boolean) => (plug.config.process.allowCommands = val), configPaths: ["settings.voice.process.allowCommands"], title: "Allow custom and built-in voice commands (paths navigation will work regardless)" },
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
                { id: "voiceRoutingDirect", label: "Direct", widget: "toggle", getValue: () => plug.config.routing.direct, onChange: (val: boolean) => (plug.config.routing.direct = val), configPaths: ["settings.voice.routing.direct"], title: "Skips the Root on reset, dropping you straight into Media > Intent so you can say things like 'Volume 80' immediately." },
                { id: "voiceRoutingAutoToggles", label: "Auto-toggles", widget: "toggle", getValue: () => plug.config.routing.autoToggles, onChange: (val: boolean) => (plug.config.routing.autoToggles = val), configPaths: ["settings.voice.routing.autoToggles"], title: "Automatically toggle boolean values when navigating directly to their path without needing an explicit on/off phrase" },
                { id: "voiceRoutingTimeout", label: "Sleep timeout", widget: "input", inputs: [{ name: "secs", label: "secs", placeholder: "7", helperText: { info: "Time in seconds of silence before the voice assistant goes back to sleep" }, type: "number", min: "1", step: "any", required: true, value: () => plug.config.routing.timeout / 1000 }], getValue: () => formatUITime(plug.config.routing.timeout), onChange: (val: Record<string, any>) => (plug.config.routing.timeout = val.secs * 1000), configPaths: ["settings.voice.routing.timeout"] },
              ],
            },
            {
              id: "voiceFeedback",
              label: "Feedback",
              widget: "group",
              getValue: () => "On",
              items: [
                { id: "voiceBehavior", label: "Behavior", widget: "select", getOptions: () => plug.config.feedback.behavior.options!, getValue: () => getUIOpt(plug.config.feedback.behavior.options, plug.config.feedback.behavior.value), onChange: (val: string) => (plug.config.feedback.behavior.value = val as typeof plug.config.feedback.behavior.value), configPaths: ["settings.voice.feedback.behavior.value"], getTipHTML: () => "Determines how and when the mic transcript appears on screen" },
                { id: "voiceToastsRouter", label: "Router", widget: "input", getValue: () => "On", inputs: getToastMenuInputs(plug.config.feedback.quoter, ["type", "autoClose"]), onChange: (val: any) => syncToastConfig(val, plug.config.feedback.quoter), configPaths: ["settings.voice.feedback.quoter"], getTipHTML: (icon = plug.config.feedback.quoter.icon) => `Customize the mic transcript${icon ? ` (${icon}) ` : " "}that shows at the ${plug.config.feedback.quoter.position?.replace("-", " ")}` },
                { id: "voiceToastsHelper", label: "Helper", widget: "input", getValue: () => "On", inputs: getToastMenuInputs(plug.config.feedback.router, ["type", "autoClose"]), onChange: (val: any) => syncToastConfig(val, plug.config.feedback.router), configPaths: ["settings.voice.feedback.router"], getTipHTML: (icon = plug.config.feedback.router.icon) => `Customize the router${icon ? ` (${icon}) ` : " "}that show at the ${plug.config.feedback.router.position?.replace("-", " ")} when routing` },
                {
                  id: "voiceFeedbackCopilot",
                  label: "Copilot",
                  widget: "group",
                  getValue: () => (plug.config.feedback.copilot.speech || plug.config.feedback.copilot.captions ? "On" : "Off"),
                  configPaths: ["settings.voice.feedback.copilot.speech", "settings.voice.feedback.copilot.captions"],
                  items: [
                    { id: "voiceAiSpeech", label: "Speech", widget: "toggle", getValue: () => plug.config.feedback.copilot.speech, onChange: (val: boolean) => (plug.config.feedback.copilot.speech = val), configPaths: ["settings.voice.feedback.copilot.speech"], title: "Speak AI responses aloud if unmuted" },
                    { id: "voiceAiCaptions", label: "Captions", widget: "toggle", getValue: () => plug.config.feedback.copilot.captions, onChange: (val: boolean) => (plug.config.feedback.copilot.captions = val), configPaths: ["settings.voice.feedback.copilot.captions"], title: "Show AI responses in captions" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    ...(plug.ai?.module ? [{ id: "timeTravel", label: "Time travel", widget: "group" as const, getValue: () => "", items: [getTimeTravelHistoryMenu(plug.ctlr, plug.ai.module, { id: "voiceAiTimeTravelHistory", label: "AI History", feature: "voiceAi", signal: plug.signal })] }] : []),
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.voice": typeof getSettingsVoiceMenu;
  }
}
