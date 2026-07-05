import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { VolumePlug } from "@plugs/settings/volume";
import { fanout } from "sia-reactor/utils";

export const getSettingsVolumeMenu = (plug: VolumePlug): SettingsMenuItem => ({
  id: "limits",
  label: "Limits",
  icon: "configure",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "volumeLimits",
      label: "Volume",
      widget: "limits",
      configPaths: ["settings.volume.skip"],
      getValue: () => "",
      getLimits: () => [{ name: "volume", label: "Clamp bounds", min: plug.config.min, max: plug.config.max, step: plug.config.skip }],
      onChange: (val: Record<string, number>) => fanout(plug.config, { min: val.volume_min, max: val.volume_max, skip: val.volume_step }, { skipUndefined: true }),
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.volume": typeof getSettingsVolumeMenu;
  }
}
