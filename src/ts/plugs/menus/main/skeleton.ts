import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { SkeletonPlug } from "@plugs/main/skeleton";

export const getSkeletonGeneralMenu = (plug: SkeletonPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    { id: "interaction", label: "Interaction", widget: "group", getValue: () => "On", items: [{ id: "autoPauseOthers", label: "Auto-pause others", title: "Pause other media players on this page when this player starts playing.", widget: "toggle", hidden: () => !plug.ctlr.config.devMode, getValue: () => (plug.config.autoPauseOthers ? "On" : "Off"), onChange: (val: boolean) => (plug.config.autoPauseOthers = val), configPaths: ["skeleton.autoPauseOthers", "devMode"] }] },
    { id: "generalDevMode", label: "Developer mode", title: "Enables developer tools, verbose logging, and debug overlays.", widget: "toggle", getBadge: () => ({ value: !plug.ctlr.config.devMode ? "</>" : "<>" }), getValue: () => (plug.ctlr.config.devMode ? "On" : "Off"), onChange: (val: boolean) => (plug.ctlr.config.devMode = val), configPaths: ["devMode"] },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    skeleton: typeof getSkeletonGeneralMenu;
  }
}
