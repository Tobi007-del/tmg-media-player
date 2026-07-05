import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { FramePlug } from "@plugs/settings/frame";
import { isBool } from "@utils/obj";

export const getSettingsFrameMenu = (plug: FramePlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "frameCapture",
      label: "Frame Capture",
      widget: "group",
      getValue: () => (plug.config.disabled ? "Off" : "On"),
      configPaths: ["settings.frame.disabled"],
      items: [
        {
          id: "frameDisabled",
          label: "Disable",
          widget: "toggle",
          getValue: () => (plug.config.disabled ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.disabled = val),
          configPaths: ["settings.frame.disabled"],
        },
        {
          id: "frameCaptureAutoClose",
          label: "Notification Timeout (ms)",
          widget: "input",
          inputs: [{ label: "Timeout (ms)", type: "number", min: "0", step: "1" as const, value: () => (isBool(plug.config.captureAutoClose) ? -1 : plug.config.captureAutoClose), helperText: { info: "How long the captured image preview stays on screen before disappearing, -1 for None" } }],
          getValue: () => String(plug.config.captureAutoClose),
          onChange: (val: any) => (plug.config.captureAutoClose = val["Timeout (ms)"] === -1 ? false : val["Timeout (ms)"]),
          configPaths: ["settings.frame.captureAutoClose"],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.frame": typeof getSettingsFrameMenu;
  }
}
