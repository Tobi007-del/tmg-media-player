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
      id: "interface",
      label: "Interface",
      widget: "group",
      getValue: () => "On",
      items: [
        {
          id: "poster",
          label: "Poster",
          widget: "group",
          getValue: () => (plug.state.visible && plug.media.state.poster ? "On" : "Off"),
          getTipHTML: () => "Configure how the poster image is displayed and generated",
          onWire: (syncUI, signal) => plug.state.on("visible", syncUI, { signal }),
          mediaPaths: ["state.poster"],
          items: [
            { id: "posterEager", label: "Eager visibility", widget: "toggle", getValue: () => (plug.settings.poster.eager ? "On" : "Off"), onChange: (val: boolean) => (plug.settings.poster.eager = val), configPaths: ["settings.poster.eager"], title: "If not eager, the poster hides when playback starts or time changes, and doesn't come back at the end." },
            { id: "posterAutoGenerate", label: "Disable auto-generate", widget: "toggle", getValue: () => (plug.settings.poster.autoGen.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.settings.poster.autoGen.disabled = val), configPaths: ["settings.poster.autoGen.disabled"], title: "Don't generate a poster image from the video if none is provided" },
          ],
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
