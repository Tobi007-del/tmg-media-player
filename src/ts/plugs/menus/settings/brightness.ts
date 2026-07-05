import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { BrightnessPlug } from "@plugs/settings/brightness";
import { fanout } from "sia-reactor/utils";

export const getSettingsBrightnessMenu = (plug: BrightnessPlug): SettingsMenuItem => ({
  id: "limits",
  label: "Limits",
  icon: "configure",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "brightnessLimits",
      label: "Brightness",
      widget: "limits",
      configPaths: ["settings.brightness.min", "settings.brightness.max", "settings.brightness.skip"],
      getValue: () => "",
      getLimits: () => [{ name: "brightness", label: "Clamp bounds", min: plug.config.min, max: plug.config.max, step: plug.config.skip }],
      onChange: (val: Record<string, number>) => fanout(plug.config, { min: val.brightness_min, max: val.brightness_max, skip: val.brightness_step }, { skipUndefined: true }),
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.brightness": typeof getSettingsBrightnessMenu;
  }
}
