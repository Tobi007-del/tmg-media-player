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
            { id: "modesFullscreenPseudo", label: "Pseudo (Full Window)", widget: "toggle", getValue: () => (plug.config.fullscreen.pseudo ? "On" : "Off"), onChange: (val: boolean) => (plug.config.fullscreen.pseudo = val), configPaths: ["settings.modes.fullscreen.pseudo"], title: "Fill the browser window instead, useful when the real deal is unavailable or restricted" },
            {
              id: "modesFullscreenOrientation",
              label: "Orientation",
              widget: "group",
              getValue() {
                const opts = this.items![0].getOptions!() as UITuple<string>[];
                return opts.find((o) => o.value === (plug.media.state.autoFullscreenOrientation ? "auto" : plug.media.state.fullscreenOrientation))?.display || "";
              },
              mediaPaths: ["state.fullscreenOrientation", "state.autoFullscreenOrientation"],
              onWire: (syncUI, signal) => plug.ctlr.state.on("screenOrientation.type", syncUI, { signal }),
              items: [
                {
                  id: "modesFullscreenOrientationSelect",
                  label: "Options",
                  widget: "select",
                  feature: "fullscreenOrientation",
                  inline: true,
                  getValue: () => (plug.media.state.autoFullscreenOrientation ? "auto" : String(plug.media.state.fullscreenOrientation)),
                  getOptions: () =>
                    plug.config.fullscreen.orientation.options!.map((o, _, __, opt = parseUIOpt(o), d = "") => {
                      if (opt.value === "auto" && plug.media.state.autoFullscreenOrientation) return plug.config.fullscreen.orientation.options!.find((o, _, __, parsed = parseUIOpt(o)) => parsed.value === plug.media.state.fullscreenOrientation && ((d = parsed.display), true)), { ...opt, display: `${opt.display}${d ? ` (${d})` : ""}` };
                      if (opt.value === false && !plug.media.state.fullscreenOrientation) return plug.config.fullscreen.orientation.options!.find((o, _, __, parsed = parseUIOpt(o)) => parsed.value === plug.ctlr.state.screenOrientation.type && ((d = parsed.display), true)), { ...opt, display: `${opt.display}${d ? ` (${d})` : ""}` };
                      return opt;
                    }),
                  onChange: (val: string) => (val === "auto" ? (plug.media.intent.autoFullscreenOrientation = true) : (plug.media.intent.fullscreenOrientation = val as typeof plug.media.intent.fullscreenOrientation)),
                  mediaPaths: ["state.fullscreenOrientation", "state.autoFullscreenOrientation"],
                  onWire: (syncUI, signal) => plug.ctlr.state.on("screenOrientation.type", syncUI, { signal }),
                },
                { id: "modesFullscreenAllowMediaOverride", label: "Allow media override", widget: "toggle", getValue: () => (plug.config.fullscreen.orientation.allowMediaOverride ? "On" : "Off"), onChange: (val: boolean) => (plug.config.fullscreen.orientation.allowMediaOverride = val), configPaths: ["settings.modes.fullscreen.orientation.allowMediaOverride"] },
                {
                  id: "modesFullscreenRotation",
                  label: "Rotation toggle",
                  widget: "group",
                  getValue: () => (plug.config.fullscreen.orientation.rotationToggle.on.value !== false || plug.config.fullscreen.orientation.rotationToggle.off.value !== false ? "On" : "Off"),
                  configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.on.value", "settings.modes.fullscreen.orientation.rotationToggle.off.value"],
                  getTipHTML: () => "Automatically toggle fullscreen when the device is rotated to a specific orientation",
                  items: [
                    { id: "modesFullscreenOnRotate", label: "Auto-enter", widget: "select", getValue: () => getUIOpt(plug.config.fullscreen.orientation.rotationToggle.on.options, plug.config.fullscreen.orientation.rotationToggle.on.value), getOptions: () => plug.config.fullscreen.orientation.rotationToggle.on.options!, onChange: (val: any) => (plug.config.fullscreen.orientation.rotationToggle.on.value = val), configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.on.value"] },
                    { id: "modesFullscreenOffRotate", label: "Auto-exit", widget: "select", getValue: () => getUIOpt(plug.config.fullscreen.orientation.rotationToggle.off.options, plug.config.fullscreen.orientation.rotationToggle.off.value), getOptions: () => plug.config.fullscreen.orientation.rotationToggle.off.options!, onChange: (val: any) => (plug.config.fullscreen.orientation.rotationToggle.off.value = val), configPaths: ["settings.modes.fullscreen.orientation.rotationToggle.off.value"] },
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
                { id: "modesPipFloatingDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.pictureInPicture.floatingPlayer.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.disabled = val), configPaths: ["settings.modes.pictureInPicture.floatingPlayer.disabled"], title: "The floating player allows keeping the custom player UI in the Picture-in-Picture window" },
                { id: "modesPipFloatingDisallowReturn", label: "Disallow return to opener", widget: "toggle", getValue: () => (plug.config.pictureInPicture.floatingPlayer.disallowReturnToOpener ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.disallowReturnToOpener = val), configPaths: ["settings.modes.pictureInPicture.floatingPlayer.disallowReturnToOpener"], title: "Hide the 'Back to tab' button in the floating window on next open" },
                { id: "modesPipFloatingPreferInitial", label: "Prefer initial placement", widget: "toggle", getValue: () => (plug.config.pictureInPicture.floatingPlayer.preferInitialWindowPlacement ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pictureInPicture.floatingPlayer.preferInitialWindowPlacement = val), configPaths: ["settings.modes.pictureInPicture.floatingPlayer.preferInitialWindowPlacement"], title: "Don't open the floating window in the same screen position & size it was previously closed" },
                {
                  id: "modesPipFloatingSize",
                  label: "Initial size (W x H)",
                  widget: "input",
                  inputs: [
                    { name: "w", label: "Width (px)", type: "number", required: true, min: "160", max: () => String(plug.ctlr.state.dimensions.window.width), value: () => plug.config.pictureInPicture.floatingPlayer.width },
                    { name: "h", label: "Height (px)", type: "number", required: true, min: "90", max: () => String(plug.ctlr.state.dimensions.window.height), value: () => plug.config.pictureInPicture.floatingPlayer.height }
                  ],
                  getValue: () => `${formatMenuPx(plug.config.pictureInPicture.floatingPlayer.width, true)} × ${formatMenuPx(plug.config.pictureInPicture.floatingPlayer.height, true)}`,
                  onChange: (val: any) => (val.w !== undefined && (plug.config.pictureInPicture.floatingPlayer.width = val.w), val.h !== undefined && (plug.config.pictureInPicture.floatingPlayer.height = val.h)),
                  configPaths: ["settings.modes.pictureInPicture.floatingPlayer.width", "settings.modes.pictureInPicture.floatingPlayer.height"]
                }
              ],
            },
          ],
        },
        { id: "modesTheater", label: "Theater", widget: "group", getValue: () => (plug.config.theater.disabled ? "Off" : "On"), configPaths: ["settings.modes.theater.disabled"], items: [{ id: "modesTheaterDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.theater.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.theater.disabled = val), configPaths: ["settings.modes.theater.disabled"] }] },
        {
          id: "modesMiniplayer",
          label: "Miniplayer",
          widget: "group",
          getValue: () => (plug.config.miniplayer.disabled ? "Off" : "On"),
          configPaths: ["settings.modes.miniplayer.disabled"],
          items: [
            { id: "modesMiniplayerDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.miniplayer.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.miniplayer.disabled = val), configPaths: ["settings.modes.miniplayer.disabled"] },
            { id: "modesMiniplayerLock", label: "Lock to window", widget: "toggle", getValue: () => (plug.config.miniplayer.lockToWindow ? "On" : "Off"), onChange: (val: boolean) => (plug.config.miniplayer.lockToWindow = val), configPaths: ["settings.modes.miniplayer.lockToWindow"], title: "Prevent dragging the miniplayer outside the browser boundaries" },
            {
              id: "modesMiniplayerPos",
              label: "Position (X, Y)",
              widget: "input",
              inputs: [
                { name: "x", label: "X (%)", type: "number", required: true, min: "0", max: "100", value: () => safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerX as string)), 100) },
                { name: "y", label: "Y (%)", type: "number", required: true, min: "0", max: "100", value: () => safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerY as string)), 100) }
              ],
              getValue: () => `${safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerX as string)), 100)}%, ${safeNum(Math.round(parseFloat(plug.settings.css.currentMiniplayerY as string)), 100)}%`,
              onChange: (val: any) => (val.x !== undefined && (plug.settings.css.currentMiniplayerX = `${val.x}%`), val.y !== undefined && (plug.settings.css.currentMiniplayerY = `${val.y}%`)),
              configPaths: ["settings.css.currentMiniplayerX", "settings.css.currentMiniplayerY"]
            },
            {
              id: "modesMiniplayerSize",
              label: "Size (W x H)",
              widget: "input",
              inputs: [
                { name: "w", label: "Width (px)", type: "number", required: true, min: "160", max: () => String(getClientWH(plug.media.container.parentElement).clientWidth), value: () => Math.round(parseFloat(plug.settings.css.currentMiniplayerWidth as string) || plug.media.container.clientWidth) },
                { name: "h", label: "Height (px)", type: "number", required: true, min: "90", max: () => String(getClientWH(plug.media.container.parentElement).clientHeight), value: () => Math.round(parseFloat(plug.settings.css.currentMiniplayerHeight as string) || plug.media.container.clientHeight) }
              ],
              getValue: () => `${formatMenuPx(Math.round(parseFloat(plug.settings.css.currentMiniplayerWidth as string) || plug.media.container.clientWidth), true)} × ${formatMenuPx(Math.round(parseFloat(plug.settings.css.currentMiniplayerHeight as string) || plug.media.container.clientHeight), true)}`,
              onChange: (val: any) => (val.w !== undefined && (plug.settings.css.currentMiniplayerWidth = `${val.w}px`), val.h !== undefined && (plug.settings.css.currentMiniplayerHeight = `${val.h}px`)),
              configPaths: ["settings.css.currentMiniplayerWidth", "settings.css.currentMiniplayerHeight"]
            },
            { id: "modesMiniplayerMinWidth", label: "Min window width", widget: "range", getValue: () => formatMenuPx(plug.config.miniplayer.minWindowWidth, true), getRange: () => ({ min: 160, max: plug.ctlr.state.dimensions.window.width, step: 10, formatTooltip: formatMenuPx }), onChange: (val: number) => (plug.config.miniplayer.minWindowWidth = val), configPaths: ["settings.modes.miniplayer.minWindowWidth"], getTipHTML: () => "The minimum width the browser must be to allow the miniplayer to appear" },
          ],
        },
        {
          id: "modesCast",
          label: "Chromecast",
          widget: "group",
          getValue: () => (plug.config.cast?.disabled ? "Off" : "On"),
          getTipHTML: () => "Stream media to compatible TVs and devices on your network. Requires a supported browser.",
          configPaths: ["settings.modes.cast.disabled"],
          items: [
            {
              id: "modesCastDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.cast?.disabled ? "On" : "Off"),
              onChange: (val: boolean) => {
                if (plug.config.cast) plug.config.cast.disabled = val;
              },
              configPaths: ["settings.modes.cast.disabled"],
            },
          ],
        },
        {
          id: "modesAirPlay",
          label: "AirPlay",
          widget: "group",
          getValue: () => (plug.config.airplay?.disabled ? "Off" : "On"),
          getTipHTML: () => "Stream media to an Apple TV, HomePod, or AirPlay-enabled device on your network.",
          configPaths: ["settings.modes.airplay.disabled"],
          items: [
            {
              id: "modesAirPlayDisabled",
              label: "Disable",
              widget: "toggle",
              getValue: () => (plug.config.airplay?.disabled ? "On" : "Off"),
              onChange: (val: boolean) => {
                if (plug.config.airplay) plug.config.airplay.disabled = val;
              },
              configPaths: ["settings.modes.airplay.disabled"],
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
