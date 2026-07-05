import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ObjectFitPlug } from "@plugs/settings/objectFit";

export const getSettingsObjectFitMenu = (plug: ObjectFitPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "layout-objectFit",
      label: "Video fit",
      widget: "select",
      feature: "objectFit",
      getValue: () => plug.toLabel(),
      getOptions: () => plug.config.options!,
      onChange: (val: string) => (plug.media.intent.objectFit = val as typeof plug.media.intent.objectFit),
      mediaPaths: ["state.objectFit"],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.objectFit": typeof getSettingsObjectFitMenu;
  }
}
