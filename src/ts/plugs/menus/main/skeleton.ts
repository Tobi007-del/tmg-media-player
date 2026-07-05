import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { Controller } from "@core/controller";

export const getSkeletonGeneralMenu = (_ctlr: Controller): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "main.skeleton": typeof getSkeletonGeneralMenu;
  }
}
