import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { OverlayPlug } from "@plugs/settings/overlay";
import { formatMenuMs } from "@utils/time";
import { getUIOpt } from "@utils/obj";

export const getSettingsOverlayMenu = (plug: OverlayPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "overlayConfig",
      label: "Overlay",
      widget: "group",
      getValue: () => (plug.config.behavior.value !== "hidden" && plug.config.delay ? "On" : "Off"),
      getTipHTML: () => "Configure the overlay behavior and appearance",
      configPaths: ["settings.overlay.curtain.value"],
      items: [
        { id: "overlayBehavior", label: "Behaviour", widget: "select", getValue: () => getUIOpt(plug.config.behavior.options, plug.config.behavior.value), getOptions: () => plug.config.behavior.options!, onChange: (val: string) => (plug.config.behavior.value = val as any), configPaths: ["settings.overlay.behavior.value"] },
        { id: "overlayDelay", label: "Auto-hide delay", widget: "input", inputs: [{ label: "ms", placeholder: "2500", type: "number", min: "0", required: true, value: () => plug.config.delay }], getValue: () => formatMenuMs(plug.config.delay), onChange: (val: Record<string, any>) => (plug.config.delay = val["ms"]), configPaths: ["settings.overlay.delay"] },
        { id: "overlayCurtain", label: "Curtain style", widget: "select", getValue: () => getUIOpt(plug.config.curtain.options, plug.config.curtain.value), getOptions: () => plug.config.curtain.options!, onChange: (val: string) => (plug.config.curtain.value = val as any), configPaths: ["settings.overlay.curtain.value"] },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.overlay": typeof getSettingsOverlayMenu;
  }
}
