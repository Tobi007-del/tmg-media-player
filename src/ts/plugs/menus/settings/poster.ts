import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { PosterPlug } from "@plugs/settings/poster";

export const getSettingsPosterMenu = (plug: PosterPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "poster",
      label: "Poster",
      widget: "group",
      hidden: () => !plug.ctlr.config.devMode,
      getValue: () => "On",
      title: "Configure how the poster image is displayed and generated.",
      configPaths: ["devMode", "settings.poster.strict"],
      items: [
        { id: "posterStrict", label: "Strict mode", widget: "toggle", getValue: () => (plug.settings.poster.strict ? "On" : "Off"), onChange: (val: boolean) => (plug.settings.poster.strict = val), configPaths: ["settings.poster.strict"], title: "If strict, the poster hides as soon as playback starts or time changes, and doesn't come back when the video ends." },
        { id: "posterAutoGenerate", label: "Auto-generate", widget: "toggle", getValue: () => (plug.settings.poster.autoGenerate ? "On" : "Off"), onChange: (val: boolean) => (plug.settings.poster.autoGenerate = val), configPaths: ["settings.poster.autoGenerate"], title: "Automatically generate a poster image from the video frame if none is provided." },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.poster": typeof getSettingsPosterMenu;
  }
}
