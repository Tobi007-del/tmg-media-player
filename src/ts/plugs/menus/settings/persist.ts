import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { PersistPlug } from "@plugs/settings/persist";

export const getSettingsPersistMenu = (plug: PersistPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "persist",
      label: "Persistence",
      widget: "group",
      tipHTML: "Configure how settings and playback state are saved to local storage.",
      getValue: () => "On",
      items: [
        {
          id: "persistThrottle",
          label: "Save Throttle",
          widget: "input",
          inputs: [{ label: "ms", placeholder: "2500", helperText: { info: "How often the player saves state changes. Higher numbers = fewer writes but less accurate resumption." }, type: "number", min: "0", value: () => plug.module.config.throttle }],
          getValue: () => `${plug.module.config.throttle}ms`,
          onChange: (val: Record<string, any>) => (plug.config.throttle = val["ms"]),
          configPaths: ["settings.persist.throttle"],
        },
        {
          id: "persistStrict",
          label: "Strict resume",
          widget: "toggle",
          getValue: () => (plug.module.config.strict ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.strict = val),
          configPaths: ["settings.persist.strict"],
          title: "Force save immediately before page closes or reloads for accurate resumption, might restore cleared data.",
        },
        {
          id: "persistClearStorage",
          label: "Clear Storage",
          title: "Clear all saved player settings and preferences.",
          widget: "button",
          getValue: () => "Clear",
          onChange: async () => {
            const ok = await t007.confirm("Are you sure you want to clear all your data?", { id: `${plug.ctlr.config.id}-clear-dialog`, rootElement: plug.media.container, confirmText: "Clear", title: "Clear data" });
            if (ok) plug.module.clear(), plug.ctlr.plug("settings.toasts")?.toast?.success("Storage cleared successfully!", { tag: "tmg-persist", signal: plug.signal });
          },
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.persist": typeof getSettingsPersistMenu;
  }
}
