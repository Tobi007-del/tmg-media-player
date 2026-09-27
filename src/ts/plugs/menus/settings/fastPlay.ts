import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { FastPlayPlug } from "@plugs/settings/fastPlay";
import { getUIOpt } from "@utils/obj";
import { formatMenuPx } from "@utils/str";
import { formatUITime } from "@utils/time";

const fPRgx = /all|mouse|touch|pen/;

export const getSettingsFastPlayMenu = (plug: FastPlayPlug): SettingsMenuItem => ({
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
          id: "fastPlay",
          label: "Fast play",
          widget: "group",
          getValue: () => (plug.config.key || fPRgx.test(plug.config.pointer.type.value) ? "On" : "Off"),
          getTipHTML: () => "Press and hold a key or the video with your mouse or finger to temporarily fast-forward or rewind",
          configPaths: ["settings.fastPlay.key", "settings.fastPlay.pointer.type.value"],
          items: [
            {
              id: "fastPlayRate",
              label: "Playback speed",
              widget: "range",
              getValue: () => `${plug.config.playbackRate}x`,
              getRange() {
                const divs = [];
                for (let i = Math.ceil(plug.settings.playbackRate.min); i <= plug.settings.playbackRate.max; i++) divs.push(i);
                return { min: plug.settings.playbackRate.min, max: plug.settings.playbackRate.max, step: 0.05, formatTooltip: (v: number) => `${v.toFixed(2)}x`, divs };
              },
              onChange: (val: number) => (plug.config.playbackRate = val),
              configPaths: ["settings.fastPlay.playbackRate", "settings.playbackRate.min", "settings.playbackRate.max"],
            },
            {
              id: "fastPlayPointer",
              label: "Pointer trigger",
              widget: "group",
              getValue: () => (plug.config.pointer.threshold && fPRgx.test(plug.config.pointer.type.value) ? "On" : "Off"),
              configPaths: ["settings.fastPlay.pointer.type.value", "settings.fastPlay.pointer.threshold"],
              items: [
                { id: "fastPlayPointerType", label: "Pointer type", widget: "select", getValue: () => getUIOpt(plug.config.pointer.type.options, plug.config.pointer.type.value), getOptions: () => plug.config.pointer.type.options!, onChange: (val: string) => (plug.config.pointer.type.value = val), configPaths: ["settings.fastPlay.pointer.type.value"], getTipHTML: () => "Which input devices can trigger fast play by long pressing" },
                { id: "fastPlayPointerThreshold", label: "Hold duration", widget: "input", inputs: [{ name: "secs", label: "secs", placeholder: "2.5", helperText: { info: "How long to hold your finger or mouse down before fast play starts, provided it did not move during the hold" }, type: "number", min: "0", max: "10", required: true, value: () => plug.config.pointer.threshold / 1000 }], getValue: () => formatUITime(plug.config.pointer.threshold), onChange: (val: Record<string, any>) => (plug.config.pointer.threshold = val.secs * 1000), configPaths: ["settings.fastPlay.pointer.threshold"] },
                { id: "fastPlayPointerInset", label: "Edge inset", widget: "range", getValue: () => formatMenuPx(plug.config.pointer.inset, true), getRange: () => ({ min: 0, max: 100, step: 5, formatTooltip: formatMenuPx }), onChange: (val: number) => (plug.config.pointer.inset = val), configPaths: ["settings.fastPlay.pointer.inset"], getTipHTML: () => "Distance from the screen edges to ignore long presses (prevents accidental triggers)" },
              ],
            },
            { id: "fastPlayKey", label: "Keyboard trigger", widget: "toggle", getValue: () => (plug.config.key ? "On" : "Off"), onChange: (val: boolean) => (plug.config.key = val), configPaths: ["settings.fastPlay.key"], title: "Press and hold the play/pause key to temporarily rewind or fast-forward" },
            { id: "fastPlayResetPaused", label: "Reset paused on release", widget: "toggle", getValue: () => (plug.config.resetPaused ? "On" : "Off"), onChange: (val: boolean) => (plug.config.resetPaused = val), configPaths: ["settings.fastPlay.resetPaused"], title: "Automatically reset play state when you release the trigger" },
            { id: "fastPlayAllowRewind", label: "Allow rewind", widget: "toggle", getValue: () => (plug.config.allowRewind ? "On" : "Off"), onChange: (val: boolean) => (plug.config.allowRewind = val), configPaths: ["settings.fastPlay.allowRewind"], title: "Allow fast playing backwards (rewinding) if triggered on the left side of the screen" },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.fastPlay": typeof getSettingsFastPlayMenu;
  }
}

