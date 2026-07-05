import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { AmbiencePlug } from "@plugs/settings/ambience";

export const getSettingsAmbienceMenu = (plug: AmbiencePlug): SettingsMenuItem => ({
  id: "ambience",
  label: "Ambience",
  icon: "ambience",
  widget: "toggle",
  getValue: () => (plug.config.active ? "On" : "Off"),
  onChange: (val: boolean) => (plug.config.active = val),
  configPaths: ["settings.ambience.active"],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.ambience": typeof getSettingsAmbienceMenu;
  }
}
