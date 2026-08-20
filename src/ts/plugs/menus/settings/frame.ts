import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { FramePlug } from "@plugs/settings/frame";
import { isBool } from "@utils/obj";
import { formatUITime } from "@utils/time";

export const getSettingsFrameMenu = (plug: FramePlug): SettingsMenuItem => ({
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
          id: "frameCapture",
          label: "Frame capture",
          widget: "group",
          getValue: () => (plug.config.disabled ? "Off" : "On"),
          configPaths: ["settings.frame.disabled"],
          items: [
            { id: "frameDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.disabled = val), configPaths: ["settings.frame.disabled"] },
            { id: "frameCaptureAutoClose", label: "Notification auto close", widget: "input", inputs: [{ name: "time", label: "Timeout (ms)", type: "number", min: "-1", step: "1" as const, value: () => (isBool(plug.config.captureAutoClose) ? -1 : plug.config.captureAutoClose), helperText: { info: "How long the captured image preview stays on screen before disappearing. Blank for Default, -1 for None." } }], getValue: () => formatUITime(plug.config.captureAutoClose!), onChange: (val: any) => (plug.config.captureAutoClose = val.time === -1 ? false : val.time), configPaths: ["settings.frame.captureAutoClose"] },
          ],
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
