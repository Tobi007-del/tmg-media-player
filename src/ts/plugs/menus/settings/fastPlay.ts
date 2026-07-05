import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { FastPlayPlug } from "@plugs/settings/fastPlay";
import { getUIOpt } from "@utils/obj";

const fPRgx = /all|mouse|touch|pen/;

export const getSettingsFastPlayMenu = (plug: FastPlayPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "fastPlay",
      label: "Fast play",
      widget: "group",
      getValue: () => (plug.config.key || fPRgx.test(plug.config.pointer.type.value) ? "On" : "Off"),
      tipHTML: "Configure fast playback gestures, speed, and triggers",
      configPaths: ["settings.fastPlay.key", "settings.fastPlay.pointer.type.value"],
      items: [
        {
          id: "fastPlayRate",
          label: "Fast play speed",
          widget: "range",
          getValue: () => `${plug.config.playbackRate}x`,
          getRange() {
            const divs = [];
            for (let i = Math.ceil(plug.settings.playbackRate.min); i <= plug.settings.playbackRate.max; i++) divs.push(i);
            return { min: plug.settings.playbackRate.min, max: plug.settings.playbackRate.max, step: 0.05, formatTooltip: (v: number) => `${v.toFixed(2)}x`, divs };
          },
          onChange: (val: number) => (plug.config.playbackRate = val),
          configPaths: ["settings.fastPlay.playbackRate", "settings.playbackRate.min", "settings.playbackRate.max"],
          tipHTML: "Playback speed multiplier when fast play is active",
        },
        {
          id: "fastPlayKey",
          label: "Keyboard hold trigger",
          widget: "toggle",
          getValue: () => (plug.config.key ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.key = val),
          configPaths: ["settings.fastPlay.key"],
          title: "Press and hold the Left/Right arrow keys to temporarily rewind or fast-forward",
        },
        {
          id: "fastPlayPointer",
          label: "Pointer hold trigger",
          widget: "group",
          getValue: () => (plug.config.pointer.threshold && fPRgx.test(plug.config.pointer.type.value) ? "On" : "Off"),
          tipHTML: "Press and hold the video with your mouse or finger to temporarily rewind or fast-forward",
          configPaths: ["settings.fastPlay.pointer.type.value", "settings.fastPlay.pointer.threshold"],
          items: [
            {
              id: "fastPlayPointerType",
              label: "Pointer type",
              widget: "select",
              getValue: () => getUIOpt(plug.config.pointer.type.options, plug.config.pointer.type.value),
              getOptions: () => plug.config.pointer.type.options!,
              onChange: (val: string) => (plug.config.pointer.type.value = val),
              configPaths: ["settings.fastPlay.pointer.type.value"],
              tipHTML: "Which input devices can trigger fast play by long pressing the video.",
            },
            {
              id: "fastPlayPointerThreshold",
              label: "Hold Duration",
              widget: "input",
              inputs: [{ label: "ms", placeholder: "2500", helperText: { info: "How long you need to hold your finger or mouse down before fast play starts." }, type: "number", min: "0", value: () => plug.config.pointer.threshold }],
              getValue: () => `${plug.config.pointer.threshold}ms`,
              onChange: (val: Record<string, any>) => (plug.config.pointer.threshold = val["ms"]),
              configPaths: ["settings.fastPlay.pointer.threshold"],
            },
            {
              id: "fastPlayPointerInset",
              label: "Edge inset",
              widget: "range",
              getValue: () => `${Math.round(plug.config.pointer.inset)}px`,
              getRange: () => ({ min: 0, max: 100, step: 5, formatTooltip: (v: number) => `${Math.round(v)}px` }),
              onChange: (val: number) => (plug.config.pointer.inset = val),
              configPaths: ["settings.fastPlay.pointer.inset"],
              tipHTML: "Distance from the screen edges to ignore long presses (prevents accidental triggers)",
            },
          ],
        },
        {
          id: "fastPlayReset",
          label: "Reset paused on release",
          widget: "toggle",
          getValue: () => (plug.config.resetPaused ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.resetPaused = val),
          configPaths: ["settings.fastPlay.resetPaused"],
          title: "Automatically reset play state when you release the trigger",
        },
        {
          id: "fastPlayRewind",
          label: "Allow rewind",
          widget: "toggle",
          getValue: () => (plug.config.rewind ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.rewind = val),
          configPaths: ["settings.fastPlay.rewind"],
          title: "Allow fast playing backwards (rewinding) if triggered on the left side of the screen",
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
