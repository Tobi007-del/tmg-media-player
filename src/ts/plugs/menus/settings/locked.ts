import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { LockedPlug } from "@plugs/settings/locked";

export const getSettingsLockedMenu = (plug: LockedPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "locked",
      label: "Lockable",
      widget: "group",
      getValue: () => (plug.config.disabled ? "Off" : "On"),
      configPaths: ["settings.locked.disabled"],
      tipHTML: "Configure whether the player can be locked to prevent accidental interactions.",
      items: [
        {
          id: "lockedDisabled",
          label: "Disable",
          widget: "toggle",
          getValue: () => (plug.config.disabled ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.disabled = val),
          configPaths: ["settings.locked.disabled"],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.locked": typeof getSettingsLockedMenu;
  }
}
