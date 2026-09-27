import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { PanelPlug } from "@plugs/settings/panel";

export const getSettingspanelMenu = (plug: PanelPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [{ id: "interface", label: "Interface", widget: "group", getValue: () => "On", items: [{ id: "panel", label: "Settings view", widget: "group", getValue: () => "On", items: [{ id: "panelAutoPause", label: "Auto-pause on open", widget: "toggle", getValue: () => (plug.config.autoPause ? "On" : "Off"), onChange: (val: boolean) => (plug.config.autoPause = val), configPaths: ["settings.panel.autoPause"], title: "Automatically pause the media when the settings view is opened" }], hidden: () => !plug.ctlr.config.devMode, configPaths: ["devMode"] }] }],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.panel": typeof getSettingspanelMenu;
  }
}

