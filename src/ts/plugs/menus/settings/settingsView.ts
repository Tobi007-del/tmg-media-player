import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { SettingsViewPlug } from "@plugs/settings/settingsView";

export const getSettingsSettingsViewMenu = (plug: SettingsViewPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "settingsView",
      label: "Settings View",
      widget: "group",
      getValue: () => "",
      items: [
        {
          id: "settingsViewAutoPause",
          label: "Auto-pause on open",
          widget: "toggle",
          getValue: () => (plug.config.autoPause ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.autoPause = val),
          configPaths: ["settings.settingsView.autoPause"],
          title: "Automatically pause the media when the settings view is opened",
        },
        {
          id: "settingsViewMenu",
          label: "Menu",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "settingsViewPreserveStack",
              label: "Remember last opened",
              widget: "toggle",
              getValue: () => (plug.config.menu.preserveStack ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.menu.preserveStack = val),
              configPaths: ["settings.settingsView.menu.preserveStack"],
              title: "Remember the last opened menu when re-opening the settings menu",
            },
          ],
        },
      ],
    },
    // Dev Mode is last in General, registered by settingsView (the last General contributor)
    {
      id: "generalDevMode",
      label: "Developer Mode",
      widget: "toggle",
      getValue: () => (plug.ctlr.config.devMode ? "On" : "Off"),
      onChange: (val: boolean) => (plug.ctlr.config.devMode = val),
      configPaths: ["devMode"],
      tipHTML: "Enables developer tools, verbose logging, and debug overlays.",
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.settingsView": typeof getSettingsSettingsViewMenu;
  }
}
