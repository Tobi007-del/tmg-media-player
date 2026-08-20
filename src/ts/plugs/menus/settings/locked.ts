import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { LockedPlug } from "@plugs/settings/locked";

export const getSettingsLockedMenu = (plug: LockedPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [{ id: "interaction", label: "Interaction", widget: "group", getValue: () => "On", items: [{ id: "locked", label: "Screen lock", widget: "group", getValue: () => (plug.config.disabled ? "Off" : "On"), configPaths: ["settings.locked.disabled"], getTipHTML: () => "Locking the screen prevents accidental touches from pausing or seeking", items: [{ id: "lockedDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.disabled = val), configPaths: ["settings.locked.disabled"] }] }] }],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.locked": typeof getSettingsLockedMenu;
  }
}
