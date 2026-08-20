import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { SettingsViewPlug } from "@plugs/settings/settingsView";

export const getSettingsSettingsViewMenu = (plug: SettingsViewPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [{ id: "interface", label: "Interface", widget: "group", getValue: () => "On", items: [{ id: "settingsView", label: "Settings view", widget: "group", getValue: () => "On", items: [{ id: "settingsViewAutoPause", label: "Auto-pause on open", widget: "toggle", getValue: () => (plug.config.autoPause ? "On" : "Off"), onChange: (val: boolean) => (plug.config.autoPause = val), configPaths: ["settings.settingsView.autoPause"], title: "Automatically pause the media when the settings view is opened" }], hidden: () => !plug.ctlr.config.devMode, configPaths: ["devMode"] }] }],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.settingsView": typeof getSettingsSettingsViewMenu;
  }
}
