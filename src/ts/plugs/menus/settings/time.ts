import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { TimePlug } from "@plugs/settings/time";
import { fanout } from "sia-reactor/utils";
import { isDef } from "@utils/obj";

export const getSettingsTimeMenu = (plug: TimePlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "limits",
      label: "Limits",
      getBadge: () => ({ label: "beta" }),
      widget: "group",
      hidden: () => !plug.ctlr.config.devMode,
      configPaths: ["devMode"],
      getValue: () => "On",
      items: [
        {
          id: "timeLimits",
          label: "Time",
          widget: "limits",
          configPaths: ["settings.time.min", "settings.time.max", "settings.time.skip", "settings.time.start", "settings.time.end"],
          getValue: ({ min, max, skip, start, end } = plug.config) => [isDef(min) && `≥ ${min}`, isDef(max) && `≤ ${max}`, isDef(skip) && `± ${skip}`, isDef(start) && `▶ ${start}`, isDef(end) && `⏹ ${end}`].filter(Boolean).join(" • "),
          getTipHTML: () => "Supports seconds or percent (10%). <b>Start</b> and <b>end</b> are preferences (for autoplay), not strict locks. <b>End</b> allows negative values.",
          getLimits: () => [
            { name: "time", type: "text", label: "Clamp bounds", min: plug.config.min, max: plug.config.max, step: plug.config.skip },
            { name: "time", type: "text", label: "Start and end", start: plug.config.start ?? 0, end: plug.config.end },
          ],
          onChange: (val: Record<string, any>) => fanout(plug.config, { min: val.time_min, max: val.time_max, skip: val.time_step, start: val.time_start, end: val.time_end }, { skipUndef: true }),
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.time": typeof getSettingsTimeMenu;
  }
}
