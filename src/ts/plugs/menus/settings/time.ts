import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { TimePlug } from "@plugs/settings/time";
import { fanout } from "sia-reactor/utils";

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
          getValue: () => "",
          getLimits: () => [
            { name: "time", label: "Clamp bounds", min: plug.config.min, max: plug.config.max, step: plug.config.skip },
            { name: "time", label: "Start and end", start: plug.config.start ?? 0, end: plug.config.end },
          ],
          onChange: (val: Record<string, number>) => fanout(plug.config, { min: val.time_min, max: val.time_max, skip: val.time_step, start: val.time_start, end: val.time_end }, { skipUndef: true }),
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
