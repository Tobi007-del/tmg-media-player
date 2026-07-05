import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { AutoPlug } from "@plugs/settings/auto";
import { getBoolOrStr, getUIOpt } from "@utils/obj";

export const getSettingsAutoMenu = (plug: AutoPlug): SettingsMenuItem => ({
  id: "autoplay",
  label: "Autoplay",
  icon: "autoplay",
  widget: "group",
  getValue: () => getUIOpt(plug.config.play.options, plug.config.play.value),
  tipHTML: "Configure automatic playback settings and transitions",
  configPaths: ["settings.auto.play.value"],
  items: [
    {
      id: "autoPlay",
      label: "Autoplay",
      widget: "select",
      getValue: () => getUIOpt(plug.config.play.options, plug.config.play.value),
      getOptions: () => plug.config.play.options!,
      onChange: (val: string) => (plug.config.play.value = getBoolOrStr(val) as typeof plug.config.play.value),
      configPaths: ["settings.auto.play.value"],
      tipHTML: "Automatically start playback when the player enters or leaves the viewport based on the selected option",
    },
    {
      id: "autoPause",
      label: "Auto-pause",
      widget: "select",
      getValue: () => getUIOpt(plug.config.pause.options, plug.config.pause.value),
      getOptions: () => plug.config.pause.options!,
      onChange: (val: string) => (plug.config.pause.value = getBoolOrStr(val) as typeof plug.config.pause.value),
      configPaths: ["settings.auto.pause.value"],
      tipHTML: "Automatically pause playback when the player enters or leaves the viewport based on the selected option",
    },
    {
      id: "autoNext",
      label: "Auto-next",
      widget: "group",
      getValue: () => (plug.config.next.value === -1 ? "Off" : `${plug.config.next.value}ms`),
      configPaths: ["settings.auto.next.value"],
      items: [
        {
          id: "autoNextTime",
          label: "Countdown Time",
          widget: "input",
          inputs: [{ label: "ms", placeholder: "20000", helperText: { info: "Time in ms to wait before automatically playing the next item in the playlist. Set to -1 to disable." }, type: "number", min: "-1", value: () => plug.config.next.value }],
          getValue: () => (plug.config.next.value === -1 ? "Off" : `${plug.config.next.value}ms`),
          onChange: (val: Record<string, any>) => (plug.config.next.value = val["ms"]),
          configPaths: ["settings.auto.next.value"],
        },
        {
          id: "autoNextPreview",
          label: "Preview",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "autoNextPreviewUsePoster",
              label: "Use poster",
              widget: "toggle",
              getValue: () => (plug.config.next.preview.usePoster ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.next.preview.usePoster = val),
              configPaths: ["settings.auto.next.preview.usePoster"],
              tipHTML: "Display the next video's poster during the countdown.",
            },
            {
              id: "autoNextPreviewTease",
              label: "Tease video",
              widget: "toggle",
              getValue: () => (plug.config.next.preview.tease ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.next.preview.tease = val),
              configPaths: ["settings.auto.next.preview.tease"],
              tipHTML: "Play a short silent preview of the next when no poster is present.",
            },
            {
              id: "autoNextPreviewTime",
              label: "Preview Time",
              widget: "input",
              inputs: [{ label: "ms", placeholder: "4000", helperText: { info: "The poster fallback preview time in ms in the next video, where the tease ends." }, type: "number", min: "0", value: () => plug.config.next.preview.time * 1000 }],
              getValue: () => `${plug.config.next.preview.time * 1000}ms`,
              onChange: (val: Record<string, any>) => (plug.config.next.preview.time = val["ms"] / 1000),
              configPaths: ["settings.auto.next.preview.time"],
            },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.auto": typeof getSettingsAutoMenu;
  }
}
