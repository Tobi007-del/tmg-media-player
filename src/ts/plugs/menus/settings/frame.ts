import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { FramePlug } from "@plugs/settings/frame";
import { TOAST_FORM_INPUTS, getToastFormVal, syncToastConfig } from "./toasts";

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
            {
              id: "frameCaptureToast",
              label: "Notification",
              widget: "input",
              getValue: () => "",
              inputs: TOAST_FORM_INPUTS.map((input) => ({ ...input, value: () => getToastFormVal(plug.config.toast[input.name as keyof typeof plug.config.toast], input.name) })),
              onChange: (val: any) => syncToastConfig(val, plug.config.toast),
              configPaths: ["settings.frame.toast"],
            },
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
