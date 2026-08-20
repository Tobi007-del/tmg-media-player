import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { PersistPlug } from "@plugs/settings/persist";
import { formatUITime } from "@utils/time";

export const getSettingsPersistMenu = (plug: PersistPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "persist",
      label: "Persistence",
      widget: "group",
      getTipHTML: () => "Configure how settings and playback state are saved to local storage",
      getValue: () => "On",
      hidden: () => !plug.ctlr.config.devMode,
      configPaths: ["devMode"],
      items: [
        { id: "persistThrottle", label: "Save throttle", widget: "input", inputs: [{ name: "time", label: "ms", placeholder: "2500", helperText: { info: "How often the player saves state changes. Higher numbers = fewer saves but less accurate resumption." }, type: "number", min: "0", required: true, value: () => plug.module.config.throttle }], getValue: () => formatUITime(plug.module.config.throttle), onChange: (val: Record<string, any>) => (plug.config.throttle = val.time), configPaths: ["settings.persist.throttle"] },
        { id: "persistStrict", label: "Strict resume", widget: "toggle", getValue: () => (plug.module.config.strict ? "On" : "Off"), onChange: (val: boolean) => (plug.config.strict = val), configPaths: ["settings.persist.strict"], title: "Force save immediately before page closes or reloads for accurate resumption, might restore cleared data." },
        {
          id: "persistClearStorage",
          label: "Clear storage",
          widget: "button",
          getValue: () => "Clear",
          getTipHTML: () => "Permanently wipe all saved player settings and state from your storage",
          onChange: async () => {
            const ok = await t007.confirm?.("Are you sure you want to clear all saved data? This cannot be undone.", { id: `${plug.ctlr.config.id}-clear-dialog`, rootElement: plug.media.container, confirmText: "Proceed" });
            if (!ok) return;
            const typed = await t007.prompt("This permanently deletes all saved settings, preferences and state from your storage. It cannot be undone.", "", { id: `${plug.ctlr.config.id}-clear-prompt`, rootElement: plug.media.container, confirmText: "Clear", placeholder: "CLEAR", label: "Confirmation", pattern: "CLEAR" });
            if (typed?.trim() === "CLEAR") plug.module.clear(), plug.ctlr.plug("settings.toasts")?.toast?.success("Storage cleared successfully!", { tag: "tmg-persist", signal: plug.signal, autoClose: 10000, actions: { "Restart now": () => (plug.module.clear(), window.location.reload()) } });
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
