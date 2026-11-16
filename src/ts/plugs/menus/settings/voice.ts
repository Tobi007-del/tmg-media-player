import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { VoicePlug } from "@plugs/settings/voice";
import { getUIOpt } from "@utils/obj";
import { formatUITime } from "@utils/time";
import { getToastMenuInputs, syncToastConfig } from "./toasts";
import { getTemporalHistoryMenu } from "./temporal";
import { fanout } from "sia-reactor/utils";
import { capitalize } from "@utils/str";

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
              feature: "ai",
              getBadge: () => ({ label: "new" }),
              getValue: () => (plug.config.ai.active ? "On" : "Off"),
              configPaths: ["settings.voice.ai.active"],
              items: [
                { id: "voiceAiActive", label: "Active", widget: "toggle", getValue: () => plug.config.ai.active, onChange: (val: boolean) => (plug.config.ai.active = val), getDisabled: () => !plug.config.active.value, configPaths: ["settings.voice.active.value", "settings.voice.ai.active"], title: "Turn AI copilot mode on or off after the voice control engine is turned on too" },
                {
                  id: "voiceAiPersona",
                  label: "Persona",
                  widget: "input",
                  inputs: [
                    { name: "preference", label: "User preference", placeholder: "e.g. Gen Z, concise, poetic...", helperText: { info: "Custom style or instructions for the AI" }, type: "text", value: () => plug.config.ai.persona.preference },
                    { name: "model", label: "Model", placeholder: "gemini-3.5-flash-lite", helperText: { info: "Model sent in payload when querying custom endpoint" }, type: "text", inline: true, value: () => plug.config.ai.persona.model },
                    { name: "limit", label: "Limit", placeholder: "50", helperText: { info: "Max conversation turns kept (higher values use more tokens)" }, type: "number", min: "1", step: "1", required: true, inline: true, value: () => plug.config.ai.persona.limit },
                    {
                      name: "voice",
                      label: "Voice",
                      type: "select",
                      get options() {
                        const def = plug.ai?.getVoice()?.name;
                        return [{ option: `System default${def ? ` (${def})` : ""}`, value: "default" }, ...(globalThis.speechSynthesis?.getVoices() || []).map((v) => ({ option: `${v.name}${v.localService ? " (offline)" : ""}`, value: v.name }))];
                      },
                      helperText: { info: "Speech synthesis voice for copilot responses" },
                      value: () => plug.config.ai.persona.voice,
                    },
                  ],
                  getValue: () => [plug.config.ai.persona.preference, capitalize(plug.config.ai.persona.voice)].filter(Boolean).join(" • "),
                  onChange: (val: any) => fanout(plug.config.ai.persona, val),
                  configPaths: ["settings.voice.ai.persona"],
                },
                {
                  id: "voiceAiFeedback",
                  label: "Feedback",
                  widget: "group",
                  getValue: () => (plug.config.ai.feedback.volume || plug.config.ai.feedback.captions ? "On" : "Off"),
                  configPaths: ["settings.voice.ai.feedback.volume", "settings.voice.ai.feedback.rate", "settings.voice.ai.feedback.captions"],
                  items: [
                    { id: "voiceAiCaptions", label: "Captions", widget: "toggle", getValue: () => plug.config.ai.feedback.captions, onChange: (val: boolean) => (plug.config.ai.feedback.captions = val), configPaths: ["settings.voice.ai.feedback.captions"], title: "Show AI responses in captions that show up sooner than speech" },
                    {
                      id: "voiceAiVolume",
                      label: "Volume",
                      widget: "range",
                      getValue: () => (plug.config.ai.feedback.volume ? `${Math.round(plug.config.ai.feedback.volume * 100)}%` : "Off"),
                      getRange() {
                        const divs = [];
                        for (let i = 10; i <= 100; i += 10) divs.push(i);
                        return { min: 0, max: 100, step: 1, formatTooltip: (v: number) => (v ? `${Math.round(v)}%` : "Off"), divs };
                      },
                      onChange: (val: number) => (plug.config.ai.feedback.volume = val / 100),
                      configPaths: ["settings.voice.ai.feedback.volume"],
                      getTipHTML: () => "Adjust the speech volume for copilot responses (0% turns off speech)",
                    },
                    {
                      id: "voiceAiRate",
                      label: "Speed",
                      widget: "range",
                      getValue: () => `${plug.config.ai.feedback.rate}x`,
                      getRange() {
                        const divs = [];
                        for (let i = 0.75; i <= 2; i += 0.25) divs.push(i);
                        return { min: 0.5, max: 2, step: 0.05, formatTooltip: (v: number) => `${v.toFixed(2)}x`, divs };
                      },
                      onChange: (val: number) => (plug.config.ai.feedback.rate = Math.round(val * 100) / 100),
                      configPaths: ["settings.voice.ai.feedback.rate"],
                      getTipHTML: () => "Adjust the speech speed for copilot responses (1.0x is normal)",
                    },
                  ],
                },
                { id: "voiceAiApiKey", label: "API Key", widget: "input", inputs: [{ name: "apiKey", label: "API Key", placeholder: "Bearer token", helperText: { info: "Authorization header for custom LLM endpoint requests" }, type: "password", passwordMeter: false, value: () => plug.config.ai.apiKey } as any], getValue: () => "•".repeat(plug.config.ai.apiKey.length) || "None", onChange: (val: any) => (plug.config.ai.apiKey = val.apiKey), configPaths: ["settings.voice.ai.apiKey"] },
                { id: "voiceAiEndpoint", label: "Endpoint", widget: "input", inputs: [{ name: "endpoint", label: "Endpoint URL", placeholder: "https://api...", helperText: { info: "Custom LLM endpoint URL (e.g. https://generativelanguage.googleapis.com/v1beta/openai/chat/completions)" }, type: "text", value: () => plug.config.ai.endpoint }], getValue: () => plug.config.ai.endpoint || "Built-in AI", onChange: (val: any) => (plug.config.ai.endpoint = val.endpoint), configPaths: ["settings.voice.ai.endpoint"] },
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
              id: "voiceToasts",
              label: "Notification",
              widget: "group",
              getValue: () => "On",
              items: [
                { id: "voiceBehavior", label: "Behavior", widget: "select", getOptions: () => plug.config.toasts.behavior.options!, getValue: () => getUIOpt(plug.config.toasts.behavior.options, plug.config.toasts.behavior.value), onChange: (val: string) => (plug.config.toasts.behavior.value = val as typeof plug.config.toasts.behavior.value), configPaths: ["settings.voice.toasts.behavior.value"], getTipHTML: () => "Determines how and when the mic transcript appears on screen" },
                { id: "voiceToastsRouter", label: "Router", widget: "input", getValue: () => "On", inputs: getToastMenuInputs(plug.config.toasts.quoter, ["type", "autoClose"]), onChange: (val: any) => syncToastConfig(val, plug.config.toasts.quoter), configPaths: ["settings.voice.toasts.quoter"], getTipHTML: (icon = plug.config.toasts.quoter.icon) => `Customize the mic transcript${icon ? ` (${icon}) ` : " "}that shows at the ${plug.config.toasts.quoter.position?.replace("-", " ")}` },
                { id: "voiceToastsHelper", label: "Helper", widget: "input", getValue: () => "On", inputs: getToastMenuInputs(plug.config.toasts.router, ["type", "autoClose"]), onChange: (val: any) => syncToastConfig(val, plug.config.toasts.router), configPaths: ["settings.voice.toasts.router"], getTipHTML: (icon = plug.config.toasts.router.icon) => `Customize the router${icon ? ` (${icon}) ` : " "}that show at the ${plug.config.toasts.router.position?.replace("-", " ")} when routing` },
              ],
            },
          ],
        },
      ],
    },
    ...(plug.ai?.module ? [{ id: "temporal", label: "Time travel", widget: "group" as const, getValue: () => "", items: [getTemporalHistoryMenu(plug.ctlr, plug.ai.module, { id: "voiceAiTemporalHistory", label: "AI History", feature: "ai", getBadge: () => ({ label: "new" }), signal: plug.signal })] }] : []),
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.voice": typeof getSettingsVoiceMenu;
  }
}
