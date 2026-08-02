import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ModesPlug } from "@plugs/settings/modes";
import { getUIOpt, parseUIOpt } from "@utils/obj";
import { formatMenuPx } from "@utils/str";
import { safeNum } from "@utils/num";
import { getClientWH } from "@utils/dom";
import { UITuple } from "@defs/UIOptions";

export const getSettingsModesMenu = (plug: ModesPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "modes",
      label: "Modes",
      widget: "group",
      getValue: () => (plug.config.fullscreen.disabled && plug.config.pictureInPicture.disabled && plug.config.theater.disabled && plug.config.miniplayer.disabled ? "Off" : "On"),
      getTipHTML: () => "Configure fullscreen, picture-in-picture, and display modes",
      configPaths: ["settings.modes.fullscreen.disabled", "settings.modes.pictureInPicture.disabled", "settings.modes.theater.disabled", "settings.modes.miniplayer.disabled"],
      items: [
        {
          id: "modesFullscreen",
          label: "Fullscreen",
          widget: "group",
          getValue: () => (plug.config.fullscreen.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.fullscreen.disabled"],
          items: [
            { id: "modesFullscreenDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.fullscreen.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.fullscreen.disabled = val), configPaths: ["settings.modes.fullscreen.disabled"] },
            { id: "modesFullscreenPseudo", label: "Pseudo (Full Window)", widget: "toggle", getValue: () => (plug.config.fullscreen.pseudo ? "On" : "Off"), onChange: (val: boolean) => (plug.config.fullscreen.pseudo = val), configPaths: ["settings.modes.fullscreen.pseudo"], getTipHTML: () => "Fill the browser window instead, useful when the real deal is unavailable or restricted" },
            {
              id: "modesFullscreenOrientation",
              label: "Orientation",
              widget: "group",
              getValue() {
                const opts = this.items![0].getOptions!() as UITuple<string>[];
                return opts.find((o) => o.value === (plug.media.state.autoFullscreenOrientation ? "auto" : plug.media.state.fullscreenOrientation))?.display || "";
              },
              mediaPaths: ["state.fullscreenOrientation", "state.autoFullscreenOrientation"],
              items: [
                {
                  id: "modesFullscreenOrientationSelect",
                  label: "Options",
                  widget: "select",
                  feature: "fullscreenOrientation",
                  inline: true,
                  getValue: () => (plug.media.state.autoFullscreenOrientation ? "auto" : String(plug.media.state.fullscreenOrientation)),
                  getOptions: () =>
                    plug.config.fullscreen.orientation.options!.map((o, _, __, opt = parseUIOpt(o)) => {
                      if (opt.value !== "auto" || !plug.media.state.autoFullscreenOrientation) return opt;
                      const curr = plug.config.fullscreen.orientation.options!.map(parseUIOpt).find((o) => o.value === plug.media.state.fullscreenOrientation)?.display || "";
                      return { ...opt, display: `Auto${curr ? ` (${curr})` : ""}` };
                    }),
                  onChange: (val: string) => (val === "auto" ? (plug.media.intent.autoFullscreenOrientation = true) : (plug.media.intent.fullscreenOrientation = val as typeof plug.media.intent.fullscreenOrientation)),
                  mediaPaths: ["state.fullscreenOrientation", "state.autoFullscreenOrientation"],
                  getTipHTML: () => "Lock the device orientation to a specific layout when entering fullscreen",
                },
                {
                  id: "modesFullscreenAllowMediaOverride",
                  label: "Allow media override",
                  widget: "toggle",
                  getValue: () => (plug.config.fullscreen.orientation.allowMediaOverride ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.fullscreen.orientation.allowMediaOverride = val),
                  configPaths: ["settings.modes.fullscreen.orientation.allowMediaOverride"],
                },
                {
                  id: "modesFullscreenRotation",
                  label: "Rotation toggle",
                  widget: "group",
                  getValue: () => (plug.config.fullscreen.orientation.rotationToggle.on.value !== false || plug.config.fullscreen.orientation.rotationToggle.off.value !== false ? "On" : "Off"),
                  configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.on.value", "settings.modes.fullscreen.orientation.rotationToggle.off.value"],
                  getTipHTML: () => "Automatically toggle fullscreen when the device is rotated to a specific orientation",
                  items: [
                    {
                      id: "modesFullscreenOnRotate",
                      label: "Auto-enter",
                      widget: "select",
                      getValue: () => getUIOpt(plug.config.fullscreen.orientation.rotationToggle.on.options, plug.config.fullscreen.orientation.rotationToggle.on.value),
                      getOptions: () => plug.config.fullscreen.orientation.rotationToggle.on.options!,
                      onChange: (val: any) => (plug.config.fullscreen.orientation.rotationToggle.on.value = val),
                      configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.on.value"],
                    },
                    {
                      id: "modesFullscreenOffRotate",
                      label: "Auto-exit",
                      widget: "select",
                      getValue: () => getUIOpt(plug.config.fullscreen.orientation.rotationToggle.off.options, plug.config.fullscreen.orientation.rotationToggle.off.value),
                      getOptions: () => plug.config.fullscreen.orientation.rotationToggle.off.options!,
                      onChange: (val: any) => (plug.config.fullscreen.orientation.rotationToggle.off.value = val),
                      configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.off.value"],
                    },
                  ],
                },
              ],
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
            { id: "modesPipDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.pictureInPicture.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pictureInPicture.disabled = val), configPaths: ["settings.modes.pictureInPicture.disabled"] },
            {
              id: "modesPipFloating",
              label: "Floating player",
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
                  title: "The floating player allows keeping the custom player UI in the Picture-in-Picture window",
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
                {
                  id: "modesPipFloatingWidth",
                  label: "Initial width",
                  widget: "range",
                  getValue: () => formatMenuPx(plug.config.pictureInPicture.floatingPlayer.width, true),
                  getRange: () => ({ min: 160, max: plug.ctlr.state.dimensions.window.width, step: 10, formatTooltip: formatMenuPx }),
                  onChange: (val: number) => (plug.config.pictureInPicture.floatingPlayer.width = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.width"],
                },
                {
                  id: "modesPipFloatingHeight",
                  label: "Initial height",
                  widget: "range",
                  getValue: () => formatMenuPx(plug.config.pictureInPicture.floatingPlayer.height, true),
                  getRange: () => ({ min: 90, max: plug.ctlr.state.dimensions.window.height, step: 10, formatTooltip: formatMenuPx }),
                  onChange: (val: number) => (plug.config.pictureInPicture.floatingPlayer.height = val),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.height"],
                },
              ],
            },
          ],
        },
        {
          id: "modesTheater",
          label: "Theater",
          widget: "group",
          getValue: () => (plug.config.theater.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.theater.disabled"],
          items: [{ id: "modesTheaterDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.theater.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.theater.disabled = val), configPaths: ["settings.modes.theater.disabled"] }],
        },
        {
          id: "modesMiniplayer",
          label: "Miniplayer",
          widget: "group",
          getValue: () => (plug.config.miniplayer.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.miniplayer.disabled"],
          items: [
            { id: "modesMiniplayerDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.miniplayer.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.miniplayer.disabled = val), configPaths: ["settings.modes.miniplayer.disabled"] },
            {
              id: "modesMiniplayerLayout",
              label: "Layout",
              widget: "group",
              getValue: () => "",
              items: [
                {
                  id: "modesMiniplayerPosX",
                  label: "X position",
                  widget: "input",
                  inputs: [{ name: "pos", label: "%", type: "number", required: true, min: "0", max: "100", value: () => safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerX as string)), 100) }],
                  getValue: () => `${safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerX as string)), 100)}%`,
                  onChange: (val: any) => (plug.settings.css.currentMiniplayerX = `${val.pos}%`),
                  configPaths: ["settings.css.currentMiniplayerX"],
                },
                {
                  id: "modesMiniplayerPosY",
                  label: "Y position",
                  widget: "input",
                  inputs: [{ name: "pos", label: "%", type: "number", required: true, min: "0", max: "100", value: () => safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerY as string)), 100) }],
                  getValue: () => `${safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerY as string)), 100)}%`,
                  onChange: (val: any) => (plug.settings.css.currentMiniplayerY = `${val.pos}%`),
                  configPaths: ["settings.css.currentMiniplayerY"],
                },
                {
                  id: "modesMiniplayerWidth",
                  label: "Width",
                  widget: "input",
                  inputs: [{ name: "size", label: "px", type: "number", required: true, min: "160", max: () => String(getClientWH(plug.media.container.parentElement).clientWidth), value: () => Math.round(parseFloat(plug.settings.css.currentMiniplayerWidth as string) || plug.media.container.clientWidth) }],
                  getValue: () => formatMenuPx(Math.round(parseFloat(plug.settings.css.currentMiniplayerWidth as string) || plug.media.container.clientWidth), true),
                  onChange: (val: any) => (plug.settings.css.currentMiniplayerWidth = `${val.size}px`),
                  configPaths: ["settings.css.currentMiniplayerWidth"],
                },
                {
                  id: "modesMiniplayerHeight",
                  label: "Height",
                  widget: "input",
                  inputs: [{ name: "size", label: "px", type: "number", required: true, min: "90", max: () => String(getClientWH(plug.media.container.parentElement).clientHeight), value: () => Math.round(parseFloat(plug.settings.css.currentMiniplayerHeight as string) || plug.media.container.clientHeight) }],
                  getValue: () => formatMenuPx(Math.round(parseFloat(plug.settings.css.currentMiniplayerHeight as string) || plug.media.container.clientHeight), true),
                  onChange: (val: any) => (plug.settings.css.currentMiniplayerHeight = `${val.size}px`),
                  configPaths: ["settings.css.currentMiniplayerHeight"],
                },
                {
                  id: "modesMiniplayerReset",
                  label: "Reset",
                  widget: "button",
                  getValue: () => "",
                  onChange: () => {
                    const sache = plug.ctlr.plug("settings.css")?._cache;
                    if (sache) (plug.settings.css.currentMiniplayerWidth = sache.currentMiniplayerWidth!), (plug.settings.css.currentMiniplayerHeight = sache.currentMiniplayerHeight!), (plug.settings.css.currentMiniplayerX = sache.currentMiniplayerX!), (plug.settings.css.currentMiniplayerY = sache.currentMiniplayerY!);
                  },
                },
              ],
            },
            { id: "modesMiniplayerMinWidth", label: "Min window width", widget: "range", getValue: () => formatMenuPx(plug.config.miniplayer.minWindowWidth, true), getRange: () => ({ min: 160, max: plug.ctlr.state.dimensions.window.width, step: 10, formatTooltip: formatMenuPx }), onChange: (val: number) => (plug.config.miniplayer.minWindowWidth = val), configPaths: ["settings.modes.miniplayer.minWindowWidth"] },
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
