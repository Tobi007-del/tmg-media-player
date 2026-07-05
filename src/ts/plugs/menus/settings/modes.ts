import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { type ModesPlug } from "@plugs/settings/modes";
import { getUIOpt, getBoolOrStr } from "@utils/obj";

export const getSettingsModesMenu = (plug: ModesPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "modes",
      label: "Modes",
      widget: "group",
      getValue: () => (plug.config.fullscreen.disabled && plug.config.pictureInPicture.disabled && plug.config.theater.disabled && plug.config.miniplayer.disabled ? "Off" : "On"),
      tipHTML: "Configure fullscreen, picture-in-picture, and display modes",
      configPaths: ["settings.modes.fullscreen.disabled", "settings.modes.pictureInPicture.disabled", "settings.modes.theater.disabled", "settings.modes.miniplayer.disabled"],
      items: [
        {
          id: "modesFullscreen",
          label: "Fullscreen",
          widget: "group",
          getValue: () => (plug.config.fullscreen.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.fullscreen.disabled"],
          items: [
            {
              id: "modesFullscreenDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.fullscreen.disabled ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.fullscreen.disabled = val),
              configPaths: ["settings.modes.fullscreen.disabled"],
            },
            {
              id: "modesFullscreenOrientationLock",
              label: "Orientation lock",
              widget: "select",
              getValue: () => getUIOpt(plug.config.fullscreen.orientationLock.options, plug.config.fullscreen.orientationLock.value),
              getOptions: () => plug.config.fullscreen.orientationLock.options!,
              onChange: (val: string) => (plug.config.fullscreen.orientationLock.value = getBoolOrStr(val) as typeof plug.config.fullscreen.orientationLock.value),
              configPaths: ["settings.modes.fullscreen.orientationLock.value"],
              tipHTML: "Lock the device orientation to a specific layout when entering fullscreen",
            },
            {
              id: "modesFullscreenOnRotate",
              label: "Auto-fullscreen on rotate",
              widget: "select",
              getValue: () => getUIOpt(plug.config.fullscreen.onRotate.options, plug.config.fullscreen.onRotate.value),
              getOptions: () => plug.config.fullscreen.onRotate.options!,
              onChange: (val: string) => (plug.config.fullscreen.onRotate.value = getBoolOrStr(val) as typeof plug.config.fullscreen.onRotate.value),
              configPaths: ["settings.modes.fullscreen.onRotate.value"],
              tipHTML: "Automatically enter fullscreen mode when the device is rotated",
            },
          ],
        },
        {
          id: "modesPip",
          label: "Picture in picture",
          widget: "group",
          getValue: () => (plug.config.pictureInPicture.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.pictureInPicture.disabled"],
          items: [
            {
              id: "modesPipDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.pictureInPicture.disabled ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.pictureInPicture.disabled = val),
              configPaths: ["settings.modes.pictureInPicture.disabled"],
            },
            {
              id: "modesPipFloating",
              label: "Floating player API",
              widget: "group",
              getValue: () => "",
              items: [
                {
                  id: "modesPipFloatingDisabled",
                  label: "Disable",
                  widget: "toggle",
                  getValue: () => (plug.config.pictureInPicture.floatingPlayer.disabled ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.disabled = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.disabled"],
                  title: "The floating player (Document PiP API) allows keeping the custom player UI in the Picture-in-Picture window",
                },
                {
                  id: "modesPipFloatingWidth",
                  label: "Initial width",
                  widget: "range",
                  getValue: () => `${Math.round(plug.config.pictureInPicture.floatingPlayer.width)}px`,
                  getRange: () => ({ min: 100, max: 1200, step: 20, formatTooltip: (v: number) => `${Math.round(v)}px` }),
                  onChange: (val: number) => (plug.config.pictureInPicture.floatingPlayer.width = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.width"],
                },
                {
                  id: "modesPipFloatingHeight",
                  label: "Initial height",
                  widget: "range",
                  getValue: () => `${Math.round(plug.config.pictureInPicture.floatingPlayer.height)}px`,
                  getRange: () => ({ min: 100, max: 800, step: 20, formatTooltip: (v: number) => `${Math.round(v)}px` }),
                  onChange: (val: number) => (plug.config.pictureInPicture.floatingPlayer.height = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.height"],
                },
                {
                  id: "modesPipFloatingDisallowReturn",
                  label: "Disallow return to opener",
                  widget: "toggle",
                  getValue: () => (plug.config.pictureInPicture.floatingPlayer.disallowReturnToOpener ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.disallowReturnToOpener = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.disallowReturnToOpener"],
                  title: "Hide the 'Back to Tab' button in the floating window",
                },
                {
                  id: "modesPipFloatingPreferInitial",
                  label: "Prefer initial placement",
                  widget: "toggle",
                  getValue: () => (plug.config.pictureInPicture.floatingPlayer.preferInitialWindowPlacement ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.preferInitialWindowPlacement = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.preferInitialWindowPlacement"],
                  title: "Try to open the floating window in the same screen position it was previously closed",
                },
              ],
            },
          ],
        },
        {
          id: "modesTheater",
          label: "Theater mode",
          widget: "group",
          getValue: () => (plug.config.theater.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.theater.disabled"],
          items: [
            {
              id: "modesTheaterDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.theater.disabled ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.theater.disabled = val),
              configPaths: ["settings.modes.theater.disabled"],
            },
          ],
        },
        {
          id: "modesMiniplayer",
          label: "Miniplayer",
          widget: "group",
          getValue: () => (plug.config.miniplayer.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.miniplayer.disabled"],
          items: [
            {
              id: "modesMiniplayerDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.miniplayer.disabled ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.miniplayer.disabled = val),
              configPaths: ["settings.modes.miniplayer.disabled"],
            },
            {
              id: "modesMiniplayerMinWidth",
              label: "Min window width",
              widget: "range",
              getValue: () => `${Math.round(plug.config.miniplayer.minWindowWidth)}px`,
              getRange: () => ({ min: 100, max: 1200, step: 20, formatTooltip: (v: number) => `${Math.round(v)}px` }),
              onChange: (val: number) => (plug.config.miniplayer.minWindowWidth = val),
              configPaths: ["settings.modes.miniplayer.minWindowWidth"],
            },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.modes": typeof getSettingsModesMenu;
  }
}
