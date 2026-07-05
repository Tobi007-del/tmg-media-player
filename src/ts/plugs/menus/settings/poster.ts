import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { PosterPlug } from "@plugs/settings/poster";

export const getSettingsPosterMenu = (plug: PosterPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "poster",
      label: "Poster",
      widget: "group",
      tipHTML: "If enabled, the poster strictly hides as soon as playback starts or time changes, and doesn't come back when the video ends.",
      getValue: () => (plug.settings.poster.strict ? "Strict" : "Normal"),
      configPaths: ["settings.poster.strict"],
      items: [
        {
          id: "posterStrict",
          label: "Strict Mode",
          widget: "toggle",
          getValue: () => (plug.settings.poster.strict ? "On" : "Off"),
          onChange: (val: boolean) => (plug.settings.poster.strict = val),
          configPaths: ["settings.poster.strict"],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.poster": typeof getSettingsPosterMenu;
  }
}
