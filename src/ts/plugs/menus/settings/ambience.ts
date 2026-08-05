import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { AmbiencePlug } from "@plugs/settings/ambience";

export const getSettingsAmbienceMenu = (plug: AmbiencePlug): SettingsMenuItem => ({
  id: "ambience",
  label: "Ambience",
  icon: "ambience",
  widget: "toggle",
  feature: "ambience",
  getValue: () => (plug.media.state.ambience ? "On" : "Off"),
  onChange: (val: boolean) => (plug.media.intent.ambience = val),
  title: () => "Toggle background ambient light effects",
  mediaPaths: ["state.ambience", "features.ambience"],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.ambience": typeof getSettingsAmbienceMenu;
  }
}
