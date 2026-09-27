import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { SkeletonPlug } from "@plugs/main/skeleton";
import { getUIOpt } from "@utils/obj";

export const getSkeletonMenu = (plug: SkeletonPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "interaction",
      label: "Interaction",
      widget: "group",
      getValue: () => "On",
      items: [{ id: "exclusivePlay", label: "Exclusive play", widget: "select", hidden: () => !plug.ctlr.config.devMode, getValue: () => getUIOpt(plug.config.exclusivePlay.options, plug.config.exclusivePlay.value), getOptions: () => plug.config.exclusivePlay.options, onChange: (val: any) => (plug.config.exclusivePlay.value = val as typeof plug.config.exclusivePlay.value), getTipHTML: () => "Pause other media players on this page when this starts playing", configPaths: ["skeleton.exclusivePlay.value", "devMode"] }],
    },
    { id: "generalDevMode", label: "Developer mode", title: "Enables developer tools, verbose logging, and debug overlays.", widget: "toggle", getBadge: () => ({ value: !plug.ctlr.config.devMode ? "</>" : "<>" }), getValue: () => (plug.ctlr.config.devMode ? "On" : "Off"), onChange: (val: boolean) => (plug.ctlr.config.devMode = val), configPaths: ["devMode"] },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    skeleton: typeof getSkeletonMenu;
  }
}
