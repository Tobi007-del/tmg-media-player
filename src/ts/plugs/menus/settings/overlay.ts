import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { OverlayPlug } from "@plugs/settings/overlay";
import { formatUITime } from "@utils/time";
import { getUIOpt } from "@utils/obj";

export const getSettingsOverlayMenu = (plug: OverlayPlug): SettingsMenuItem => ({
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
          id: "overlayConfig",
          label: "Overlay",
          widget: "group",
          getValue: () => (plug.config.delay && plug.config.behavior.value !== "hidden" && plug.config.curtain.value !== "none" ? "On" : "Off"),
          configPaths: ["settings.overlay.behavior.value", "settings.overlay.delay", "settings.overlay.curtain.value"],
          items: [
            { id: "overlayBehavior", label: "Behavior", widget: "select", getValue: () => getUIOpt(plug.config.behavior.options, plug.config.behavior.value), getOptions: () => plug.config.behavior.options!, onChange: (val: string) => (plug.config.behavior.value = val as any), configPaths: ["settings.overlay.behavior.value"] },
            { id: "overlayDelay", label: "Auto-hide delay", widget: "input", inputs: [{ name: "secs", label: "secs", placeholder: "2.5", type: "number", min: "0", step: "any", required: true, value: () => plug.config.delay / 1000 }], getValue: () => formatUITime(plug.config.delay), onChange: (val: Record<string, any>) => (plug.config.delay = val.secs * 1000), configPaths: ["settings.overlay.delay"] },
            { id: "overlayCurtain", label: "Curtain style", widget: "select", getValue: () => getUIOpt(plug.config.curtain.options, plug.config.curtain.value), getOptions: () => plug.config.curtain.options!, onChange: (val: string) => (plug.config.curtain.value = val as any), configPaths: ["settings.overlay.curtain.value"] },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.overlay": typeof getSettingsOverlayMenu;
  }
}

