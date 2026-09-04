import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { AutoPlug } from "@plugs/settings/auto";
import { getUIOpt, isArr } from "@utils/obj";
import { formatUITime } from "@utils/time";

export const getSettingsAutoMenu = (plug: AutoPlug): SettingsMenuItem => ({
  id: "autoplay",
  label: "Autoplay",
  icon: "autoplay",
  widget: "group",
  getValue: () => (plug.config.play.value === false ? "Off" : "On"),
  getTipHTML: () => "Configure automatic playback settings and transitions",
  configPaths: ["settings.auto.play.value"],
  items: [
    {
      id: "autoPlay",
      label: "Auto-play",
      widget: "select",
      getMultiple: () => true,
      getValue: () => (plug.config.play.value === false ? ["Off"] : isArr(plug.config.play.value) ? plug.config.play.value.map((v) => getUIOpt(plug.config.play.options, v)) : [getUIOpt(plug.config.play.options, plug.config.play.value)]),
      getOptions: () => plug.config.play.options,
      onChange(v: any) {
        if (v === false) return void (plug.config.play.value = false);
        const cur = isArr(plug.config.play.value) ? [...plug.config.play.value] : [],
          idx = cur.indexOf(v);
        idx > -1 ? cur.splice(idx, 1) : cur.push(v);
        plug.config.play.value = cur.length ? cur : false; // forwarding intent
      },
      configPaths: ["settings.auto.play.value"],
      getTipHTML: () => "Start playback when the player enters or leaves based on selected options",
    },
    {
      id: "autoPause",
      label: "Auto-pause",
      widget: "select",
      getMultiple: () => true,
      getValue: () => (plug.config.pause.value === false ? ["Off"] : isArr(plug.config.pause.value) ? plug.config.pause.value.map((v) => getUIOpt(plug.config.pause.options, v)) : [getUIOpt(plug.config.pause.options, plug.config.pause.value)]),
      getOptions: () => plug.config.pause.options,
      onChange(v: any) {
        if (v === false) return void (plug.config.pause.value = false);
        const cur = isArr(plug.config.pause.value) ? [...plug.config.pause.value] : [],
          idx = cur.indexOf(v);
        idx > -1 ? cur.splice(idx, 1) : cur.push(v);
        plug.config.pause.value = cur.length ? cur : false;
      },
      configPaths: ["settings.auto.pause.value"],
      getTipHTML: () => "Pause playback when the player enters or leaves based on selected options",
    },
    {
      id: "autoNext",
      label: "Auto-next",
      widget: "group",
      getValue: () => formatUITime(plug.config.next.value),
      configPaths: ["settings.auto.next.value"],
      items: [
        { id: "autoNextTime", label: "Countdown time", widget: "input", inputs: [{ name: "time", label: "ms", placeholder: "20000", helperText: { info: "Time in ms to wait before automatically playing the next item in the playlist. Set to -1 to disable." }, type: "number", min: "-1", required: true, value: () => plug.config.next.value }], getValue: () => formatUITime(plug.config.next.value), onChange: (val: Record<string, any>) => (plug.config.next.value = val.time), configPaths: ["settings.auto.next.value"] },
        {
          id: "autoNextPreview",
          label: "Preview",
          widget: "group",
          getValue: () => "",
          items: [
            { id: "autoNextPreviewUsePoster", label: "Use poster", widget: "toggle", getValue: () => (plug.config.next.preview.usePoster ? "On" : "Off"), onChange: (val: boolean) => (plug.config.next.preview.usePoster = val), configPaths: ["settings.auto.next.preview.usePoster"], getTipHTML: () => "Display the next video's poster during the countdown" },
            { id: "autoNextPreviewTease", label: "Tease video", widget: "toggle", getValue: () => (plug.config.next.preview.tease ? "On" : "Off"), onChange: (val: boolean) => (plug.config.next.preview.tease = val), configPaths: ["settings.auto.next.preview.tease"], getTipHTML: () => "Play a short silent preview of the next when no poster is present" },
            { id: "autoNextPreviewTime", label: "Preview time", widget: "input", inputs: [{ name: "time", label: "ms", placeholder: "4000", helperText: { info: "The poster fallback preview time in ms in the next video, where the tease ends" }, type: "number", min: "0", value: () => plug.config.next.preview.time * 1000 }], getValue: () => formatUITime(plug.config.next.preview.time * 1000), onChange: (val: Record<string, any>) => (plug.config.next.preview.time = val.time / 1000), configPaths: ["settings.auto.next.preview.time"] },
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
