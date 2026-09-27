import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { AutoPlug } from "@plugs/settings/auto";
import { getUIOpt, isArr } from "@utils/obj";
import { formatUITime } from "@utils/time";
import { getToastMenuInputs, syncToastConfig } from "./toasts";

export const getSettingsAutoMenu = (plug: AutoPlug): SettingsMenuItem => ({
  id: "autoplay",
  label: "Autoplay",
  icon: "autoplay",
  widget: "group",
  getValue: () => (plug.config.play.value === false ? "Off" : "On"),
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
      getTipHTML: () => "Start playback when the player enters or leaves based on selected option(s)",
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
      getTipHTML: () => "Pause playback when the player enters or leaves based on selected option(s)",
    },
    {
      id: "autoNext",
      label: "Auto-next",
      widget: "group",
      getValue: () => formatUITime(plug.config.next.countdown * 1000),
      configPaths: ["settings.auto.next.countdown"],
      items: [
        { id: "autoNextCountdown", label: "Countdown", widget: "input", inputs: [{ name: "secs", label: "secs or %", placeholder: "20", type: "text", helperText: { info: "Time to end before next plays. Supports seconds or percent (10%). Set to -1 to disable." }, value: () => plug.config.next.countdown }], getValue: () => formatUITime(plug.config.next.countdown * 1000), onChange: (val: Record<string, any>) => (plug.config.next.countdown = val.secs), getTipHTML: () => (plug.ctlr.config.devMode ? "Customize the Time limits to adjust when this countdown begins" : ""), actions: [{ id: "autoNextGoToTimeLimits", getLabel: () => "Time limits", onClick: () => plug.ctlr.plug("settings.panel")?.menu.goTo("timeLimits"), hidden: () => !plug.ctlr.config.devMode }], configPaths: ["settings.auto.next.countdown"] },
        {
          id: "autoNextPreview",
          label: "Preview",
          widget: "group",
          getValue: () => (plug.config.next.preview.usePoster ? "Poster" : "Teaser"),
          configPaths: ["settings.auto.next.preview.usePoster", "settings.auto.next.preview.tease"],
          items: [
            { id: "autoNextPreviewUsePoster", label: "Use poster", widget: "toggle", getValue: () => (plug.config.next.preview.usePoster ? "On" : "Off"), onChange: (val: boolean) => (plug.config.next.preview.usePoster = val), configPaths: ["settings.auto.next.preview.usePoster"], title: "Display the next video's poster during the countdown" },
            { id: "autoNextPreviewTease", label: "Tease video", widget: "toggle", getValue: () => (plug.config.next.preview.tease ? "On" : "Off"), onChange: (val: boolean) => (plug.config.next.preview.tease = val), configPaths: ["settings.auto.next.preview.tease"], title: "Play a short silent preview of the next when no poster is present" },
            { id: "autoNextPreviewLoop", label: "Loop teaser", widget: "toggle", getValue: () => (plug.config.next.preview.loop ? "On" : "Off"), getDisabled: () => !plug.config.next.preview.tease, onChange: (val: boolean) => (plug.config.next.preview.loop = val), configPaths: ["settings.auto.next.preview.loop", "settings.auto.next.preview.tease"], title: "Loop the video tease continuously instead of pausing at the end" },
            {
              id: "autoNextPreviewBounds",
              label: "Teaser bounds",
              widget: "input",
              inputs: [
                { name: "min", label: "Min (secs or %)", placeholder: "0", type: "text", helperText: { info: "Supports seconds or percent (10%)" }, value: () => plug.config.next.preview.min },
                { name: "max", label: "Max (secs or %)", placeholder: "4", type: "text", helperText: { info: "Supports seconds or percent (50%)" }, value: () => plug.config.next.preview.max },
              ],
              getValue: () => `${formatUITime(plug.config.next.preview.min * 1000)} to ${formatUITime(plug.config.next.preview.max * 1000)}`,
              getDisabled: () => !plug.config.next.preview.tease,
              onChange: (val: Record<string, any>) => ((plug.config.next.preview.min = val.min), (plug.config.next.preview.max = val.max)),
              configPaths: ["settings.auto.next.preview.min", "settings.auto.next.preview.max", "settings.auto.next.preview.tease"],
            },
          ],
        },
        {
          id: "autoNextToast",
          label: "Notification",
          widget: "input",
          getValue: () => "",
          inputs: getToastMenuInputs(plug.config.next.toast, ["icon", "type", "autoClose"]),
          onChange: (val: any) => syncToastConfig(val, plug.config.next.toast),
          configPaths: ["settings.auto.next.toast"],
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
