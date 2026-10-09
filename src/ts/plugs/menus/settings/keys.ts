import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { KeysPlug } from "@plugs/settings/keys";
import { capitalize, uncamelize } from "@utils/str";
import { getUIOpt, isDef } from "@utils/obj";
import { KEYS_MODS_ACTIONS } from "@plugs/settings/keys/build";
import { fanout } from "sia-reactor/utils";

export const getSettingsKeysMenu = (plug: KeysPlug): SettingsMenuItem => ({
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
      items: [
        {
          id: "keyboard",
          label: "Keyboard",
          widget: "group",
          getValue: () => (plug.config.disabled ? "Off" : "On"),
          configPaths: ["settings.keys.disabled"],
          items: [
            { id: "keyboardDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.disabled = val), configPaths: ["settings.keys.disabled"] },
            { id: "keyboardShowOverlay", label: "Show overlay", widget: "toggle", getValue: () => (plug.config.showOverlay ? "On" : "Off"), onChange: (val: boolean) => (plug.config.showOverlay = val), configPaths: ["settings.keys.showOverlay"], title: "Force the player controls overlay to appear when pressing keys." },
            { id: "keyboardPhase", label: "Default phase", widget: "select", getOptions: () => plug.config.phase.options!, getValue: () => getUIOpt(plug.config.phase.options, plug.config.phase.value), onChange: (val: any) => (plug.config.phase.value = val), configPaths: ["settings.keys.phase"], getTipHTML: () => "The default key phase to trigger actions when not explicitly specified" },
            {
              id: "keyboardMods",
              label: "Modifiers",
              widget: "group",
              getValue: () => (plug.config.mods.disabled ? "Off" : "On"),
              items: [
                { id: "keyboardModsDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.mods.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.mods.disabled = val), configPaths: ["settings.keys.mods.disabled"], title: "Allow holding Shift/Ctrl/Cmd to modify steps (e.g. holding Shift to seek 10s instead of 5s)" },
                ...KEYS_MODS_ACTIONS.map((mod) => ({
                  id: `keyboardMod-${mod}`,
                  label: `${capitalize(uncamelize(mod))}`,
                  widget: "input" as const,
                  getValue: ({ ctrl, alt, shift } = plug.config.mods[mod]) => [isDef(ctrl) && `⌘ ${ctrl}`, isDef(shift) && `⇧ ${shift}`, isDef(alt) && `⌥ ${alt}`].filter(Boolean).join(" • "),
                  inputs: [
                    { name: "ctrl", label: "Ctrl amount", type: "number", min: "0", step: "any" as const, value: () => plug.config.mods[mod].ctrl, helperText: { info: "Applies when holding Ctrl or Cmd (⌘) key" } },
                    { name: "shift", label: "Shift amount", type: "number", min: "0", step: "any" as const, value: () => plug.config.mods[mod].shift, helperText: { info: "Applies when holding Shift (⇧) key" } },
                    { name: "alt", label: "Alt amount", type: "number", min: "0", step: "any" as const, value: () => plug.config.mods[mod].alt, helperText: { info: "Applies when holding Alt or Option (⌥) key" } },
                  ],
                  onChange: (val: any) => fanout(plug.config.mods[mod], val),
                  configPaths: [`settings.keys.mods.${mod}` as const],
                })),
              ],
            },
            {
              id: "keyboardLists",
              label: "Constraints",
              widget: "group",
              hidden: () => !plug.ctlr.config.devMode,
              getValue: () => (plug.config.overrides.length || plug.config.blocks.length || plug.config.whitelist.length ? "On" : "Off"),
              configPaths: ["devMode", "settings.keys.overrides", "settings.keys.blocks", "settings.keys.whitelist"],
              items: [
                {
                  id: "keyboardOverrides",
                  label: "Overrides",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that override default browser behavior" }, value: () => plug.config.overrides.join(", ") }],
                  getValue: () => plug.config.overrides.join(", "),
                  onChange: (val: any) =>
                    (plug.config.overrides = val["Keys"]
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)),
                  configPaths: ["settings.keys.overrides"],
                },
                {
                  id: "keyboardBlocks",
                  label: "Blocks",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that block key shortcuts" }, value: () => plug.config.blocks.join(", ") }],
                  getValue: () => plug.config.blocks.join(", "),
                  onChange: (val: any) =>
                    (plug.config.blocks = val["Keys"]
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)),
                  configPaths: ["settings.keys.blocks"],
                },
                {
                  id: "keyboardWhitelist",
                  label: "Whitelist",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that are explicitly allowed" }, value: () => plug.config.whitelist.join(", ") }],
                  getValue: () => plug.config.whitelist.join(", "),
                  onChange: (val: any) =>
                    (plug.config.whitelist = val["Keys"]
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean)),
                  configPaths: ["settings.keys.whitelist"],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.keys": typeof getSettingsKeysMenu;
  }
}

