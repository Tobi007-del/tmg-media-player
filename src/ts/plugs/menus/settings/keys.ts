import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { KeysPlug } from "@plugs/settings/keys";
import { capitalize, uncamelize } from "@utils/str";
import { KEY_SHORTCUT_MOD_ACTIONS } from "@plugs/settings/keys/build";

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
          getTipHTML: () => "Configure keyboard shortcuts and modifier keys",
          configPaths: ["settings.keys.disabled"],
          items: [
            { id: "keyboardDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.disabled = val), configPaths: ["settings.keys.disabled"] },
            { id: "keyboardStrictMatches", label: "Strict matches", widget: "toggle", getValue: () => (plug.config.strictMatches ? "On" : "Off"), onChange: (val: boolean) => (plug.config.strictMatches = val), configPaths: ["settings.keys.strictMatches"], title: "Require exact key combo matches for actions (e.g., Shift+f will not trigger the action for f)." },
            {
              id: "keyboardMods",
              label: "Modifier keys",
              widget: "group",
              getValue: () => (plug.config.mods.disabled ? "Off" : "On"),
              items: [
                { id: "keyboardModsDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.mods.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.mods.disabled = val), configPaths: ["settings.keys.mods.disabled"], title: "Allow holding Shift or Ctrl/Cmd to change how much the action steps by (e.g. holding Shift to seek 10s instead of 5s)" },
                ...KEY_SHORTCUT_MOD_ACTIONS.map((mod) => ({
                  id: `keyboardMod-${mod}`,
                  label: `${capitalize(uncamelize(mod))}`,
                  widget: "group" as const,
                  getValue: () => "",
                  items: [
                    {
                      id: `keyboardMod-${mod}-ctrl`,
                      label: "Ctrl amount",
                      widget: "input" as const,
                      inputs: [{ label: "Amount", type: "number", min: "0", step: "any" as const, value: () => plug.config.mods[mod].ctrl }],
                      getValue: () => String(plug.config.mods[mod].ctrl),
                      onChange: (val: any) => (plug.config.mods[mod].ctrl = val["Amount"]),
                      configPaths: [`settings.keys.mods.${mod}` as const],
                    },
                    {
                      id: `keyboardMod-${mod}-shift`,
                      label: "Shift amount",
                      widget: "input" as const,
                      inputs: [{ label: "Amount", type: "number", min: "0", step: "any" as const, value: () => plug.config.mods[mod].shift }],
                      getValue: () => String(plug.config.mods[mod].shift),
                      onChange: (val: any) => (plug.config.mods[mod].shift = val["Amount"]),
                      configPaths: [`settings.keys.mods.${mod}` as const],
                    },
                  ],
                })),
              ],
            },
            {
              id: "keyboardLists",
              label: "Overrides and lists",
              widget: "group",
              getValue: () => (plug.config.overrides.length || plug.config.blocks.length || plug.config.whitelist.length ? "On" : "Off"),
              configPaths: ["settings.keys.overrides", "settings.keys.blocks", "settings.keys.whitelist"],
              items: [
                {
                  id: "keyboardOverrides",
                  label: "Overrides",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that override default browser behavior" }, value: () => plug.config.overrides.join(", ") }],
                  getValue: () => plug.config.overrides.join(", "),
                  // prettier-ignore
                  onChange: (val: any) => (plug.config.overrides = val["Keys"].split(",").map((s: string) => s.trim()).filter(Boolean)),
                  configPaths: ["settings.keys.overrides"],
                },
                {
                  id: "keyboardBlocks",
                  label: "Blocks",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that block key shortcuts" }, value: () => plug.config.blocks.join(", ") }],
                  getValue: () => plug.config.blocks.join(", "),
                  // prettier-ignore
                  onChange: (val: any) => (plug.config.blocks = val["Keys"].split(",").map((s: string) => s.trim()).filter(Boolean)),
                  configPaths: ["settings.keys.blocks"],
                },
                {
                  id: "keyboardWhitelist",
                  label: "Whitelist",
                  widget: "input" as const,
                  inputs: [{ label: "Keys", placeholder: "Space, ArrowUp", helperText: { info: "Comma-separated keys that are explicitly allowed" }, value: () => plug.config.whitelist.join(", ") }],
                  getValue: () => plug.config.whitelist.join(", "),
                  // prettier-ignore
                  onChange: (val: any) => (plug.config.whitelist = val["Keys"].split(",").map((s: string) => s.trim()).filter(Boolean)),
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
