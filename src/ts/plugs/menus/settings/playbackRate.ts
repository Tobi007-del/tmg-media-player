import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { PlaybackRatePlug } from "@plugs/settings/playbackRate";
import { parseUIOpt } from "@utils/obj";
import { fanout } from "sia-reactor/utils";
export const getSettingsPlaybackRateMenu = (plug: PlaybackRatePlug): SettingsMenuItem[] => [
  {
    id: "playbackRate",
    label: "Playback speed",
    icon: "playbackrate",
    widget: "group",
    feature: "playbackRate",
    tipHTML: "Configure custom playback speeds",
    getValue: () => (plug.media.state.playbackRate === 1 ? "Normal" : `${plug.media.state.playbackRate}x`),
    items: [
      {
        id: "playbackRateSlider",
        label: "Custom",
        widget: "range",
        inline: true,
        getRange() {
          const divs = [];
          for (let i = Math.ceil(plug.config.min); i <= plug.config.max; i++) divs.push(i);
          return { min: plug.config.min, max: plug.config.max, step: 0.05, formatTooltip: (v: number) => `${v.toFixed(2)}x`, divs };
        },
        getValue: () => plug.media.state.playbackRate.toFixed(2).replace(/\.?0+$/, "") + "x",
        onChange: (val: number) => (plug.media.intent.playbackRate = val),
        configPaths: ["settings.playbackRate.min", "settings.playbackRate.max"],
        mediaPaths: ["state.playbackRate"],
      },
      {
        id: "playbackRateSelect",
        label: "Presets",
        widget: "select",
        inline: true,
        getOptions: () =>
          plug.config.options.map((o) => {
            const p = parseUIOpt(o);
            return { value: p.value, display: p.value === 1 ? "Normal" : p.display };
          }),
        getValue: () => String(plug.media.state.playbackRate),
        onChange: (val: number) => (plug.media.intent.playbackRate = val),
        mediaPaths: ["state.playbackRate"],
      },
    ],
    mediaPaths: ["state.playbackRate"],
  },
  {
    id: "limits",
    label: "Limits",
    icon: "configure",
    widget: "group",
    getValue: () => "",
    items: [
      {
        id: "playbackRateLimits",
        label: "Playback speed",
        widget: "limits",
        configPaths: ["settings.playbackRate.min", "settings.playbackRate.max", "settings.playbackRate.skip"],
        getValue: () => "",
        getLimits: () => [{ name: "playbackRate", label: "Clamp bounds", min: plug.config.min, max: plug.config.max, step: plug.config.skip }],
        onChange: (val: Record<string, number>) => fanout(plug.config, { min: val.playbackRate_min, max: val.playbackRate_max, skip: val.playbackRate_step }, { skipUndefined: true }),
      },
    ],
  },
];

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.playbackRate": typeof getSettingsPlaybackRateMenu;
  }
}
