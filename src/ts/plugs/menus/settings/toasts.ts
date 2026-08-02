import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ToastsPlug } from "@plugs/settings/toasts";
import { capitalize, uncamelize } from "@utils/str";
import { isStr } from "@utils/obj";
import { TOAST_UI_POSITIONS, TOAST_UI_ANIMATIONS, TOAST_UI_TYPES, TOAST_UI_DRAG_OPTIONS, TOAST_UI_DRAG_DIRECTIONS } from "@t007/toast";
import { formatMenuMs } from "@utils/time";

export const TOAST_BOOLEAN_OPTS = [
  { option: "Default", value: "" },
  { option: "Yes", value: "yes" },
  { option: "No", value: "no" },
];
export const toToastFormOpts = (opts: any[]) => [{ option: "Default", value: "" }, ...opts.map((o) => ({ option: o.display, value: o.value }))];

export const TOAST_FORM_INPUTS = [
  { name: "type", label: "Type", type: "select", options: toToastFormOpts(TOAST_UI_TYPES) },
  { name: "closeButton", label: "Close button", type: "select", options: TOAST_BOOLEAN_OPTS },
  { name: "hideProgressBar", label: "Hide progress bar", type: "select", options: TOAST_BOOLEAN_OPTS },
  { name: "position", label: "Position", type: "select", options: toToastFormOpts(TOAST_UI_POSITIONS) },
  { name: "autoClose", label: "Auto close (ms)", type: "number", helperText: { info: "Blank for Default, -1 for None" }, min: "-1" },
] as const;

const getActionLogicOpts = (plug: ToastsPlug) =>
  [
    { option: "None", value: "none" },
    ...Object.keys(plug.ctlr.actions.entries)
      .filter((k) => !plug.ctlr.actions.entries[k]?.private)
      .map((k) => ({ value: k, option: plug.ctlr.actions.entries[k]?.label || capitalize(uncamelize(k)) })),
  ] as const;

export const getSettingsToastsMenu = (plug: ToastsPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "toasts",
      label: "Notifications",
      widget: "group",
      getValue: () => (plug.config.disabled ? "Off" : "On"),
      configPaths: ["settings.toasts.disabled"],
      items: [
        { id: "toastsDisabled", label: "Disable", widget: "toggle", getValue: () => (plug.config.disabled ? "On" : "Off"), onChange: (val: boolean) => ((plug.config.disabled = val), !val && plug.toast?.("Notifications enabled!", { tag: "tmg-tsts", type: "success", renotify: true })), configPaths: ["settings.toasts.disabled"] },
        { id: "toastsCloseButton", label: "Show Close Button", widget: "toggle", getValue: () => (plug.config.closeButton ? "On" : "Off"), onChange: (val: boolean) => ((plug.config.closeButton = val), plug.toast?.("Close button visibility updated!", { tag: "tmg-tsts", closeButton: val, type: "info", renotify: true })), configPaths: ["settings.toasts.closeButton"] },
        { id: "toastsProgressBar", label: "Hide Progress Bar", widget: "toggle", getValue: () => (plug.config.hideProgressBar ? "On" : "Off"), onChange: (val: boolean) => ((plug.config.hideProgressBar = val), plug.toast?.("Progress bar visibility updated!", { tag: "tmg-tsts", hideProgressBar: val, type: "info", renotify: true })), configPaths: ["settings.toasts.hideProgressBar"] },
        { id: "toastsPosition", label: "Position", widget: "select", getOptions: () => TOAST_UI_POSITIONS, getValue: () => TOAST_UI_POSITIONS.find((o) => o.value === plug.config.position)?.display, onChange: (val: string) => ((plug.config.position = val as typeof plug.config.position), plug.toast?.("Position updated!", { tag: "tmg-tsts", position: val as typeof plug.config.position, type: "success", renotify: true })), configPaths: ["settings.toasts.position"], getTipHTML: () => "Where the toasts should appear on the screen" },
        { id: "toastAnimation", label: "Animation", widget: "select", getOptions: () => TOAST_UI_ANIMATIONS, getValue: () => TOAST_UI_ANIMATIONS.find((o) => o.value === (isStr(plug.config.animation) ? plug.config.animation : "slide"))?.display, onChange: (val: string) => ((plug.config.animation = val as typeof plug.config.animation), plug.toast?.("Animation updated!", { tag: "tmg-tsts", animation: val as typeof plug.config.animation, type: "success", renotify: true })), configPaths: ["settings.toasts.animation"] },
        { id: "toastsAutoClose", label: "Auto close (ms)", widget: "input", type: "number", required: false, getValue: () => formatMenuMs(plug.config.autoClose), onChange: (val: any) => (plug.config.autoClose = val === -1 ? false : val), configPaths: ["settings.toasts.autoClose"], title: "Blank for Default, -1 for None", helperText: { info: "Blank for Default, -1 for None" } },
        { id: "toastsCloseOnClick", label: "Close on click", widget: "toggle", getValue: () => (plug.config.closeOnClick ? "On" : "Off"), onChange: (val: boolean) => (plug.config.closeOnClick = val), configPaths: ["settings.toasts.closeOnClick"] },
        { id: "toastsDragToClose", label: "Drag to close", widget: "toggle", getValue: () => TOAST_UI_DRAG_OPTIONS.find((o) => o.value === plug.config.dragToClose)?.display, onChange: (val: boolean) => (plug.config.dragToClose = val), configPaths: ["settings.toasts.dragToClose"] },
        { id: "toastsDragToCloseDir", label: "Drag direction", widget: "select", getValue: () => TOAST_UI_DRAG_DIRECTIONS.find((o) => o.value === plug.config.dragToCloseDir)?.display, getOptions: () => TOAST_UI_DRAG_DIRECTIONS, onChange: (val: string) => (plug.config.dragToCloseDir = val as typeof plug.config.dragToCloseDir), configPaths: ["settings.toasts.dragToCloseDir"] },
        { id: "toastsPauseOnHover", label: "Pause on hover", widget: "toggle", getValue: () => (plug.config.pauseOnHover ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pauseOnHover = val), configPaths: ["settings.toasts.pauseOnHover"] },
        { id: "toastsPauseOnFocusLoss", label: "Pause on focus loss", widget: "toggle", getValue: () => (plug.config.pauseOnFocusLoss ? "On" : "Off"), onChange: (val: boolean) => (plug.config.pauseOnFocusLoss = val), configPaths: ["settings.toasts.pauseOnFocusLoss"] },
        { id: "toastsLimit", label: "Max visible", widget: "range", getValue: () => String(plug.config.limit), getRange: () => ({ min: 1, max: 30, step: 1, formatTooltip: (v: number) => String(Math.round(v)) }), onChange: (val: number) => (plug.config.limit = val), configPaths: ["settings.toasts.limit"] },
        { id: "toastsNewestOnTop", label: "Newest on top", widget: "toggle", getValue: () => (plug.config.newestOnTop ? "On" : "Off"), onChange: (val: boolean) => (plug.config.newestOnTop = val), configPaths: ["settings.toasts.newestOnTop"] },
        {
          id: "toastsCustomReminders",
          label: "Custom reminders",
          widget: "group",
          getValue: () => (plug.state.reminders.length ? `${plug.state.reminders.length} Active` : ""),
          items: [
            {
              id: "toastsCreateReminder",
              label: "Create reminder",
              widget: "input",
              getValue: () => "",
              inputs: [{ name: "message", label: "Message", placeholder: "Take a break!", helperText: { info: "The message to display in the reminder" }, required: true }, { name: "delay", label: "Delay (ms)", type: "number", helperText: { info: "0 for Immediate" }, required: true, min: "0", value: 0 }, { name: "actionId", label: "Action", value: "none", type: "select", options: getActionLogicOpts(plug) as unknown as { option: string; value: string }[] }, ...TOAST_FORM_INPUTS],
              onChange: (val: any) => {
                const parse = (v: any) => (v === "" ? undefined : v === "yes" ? true : v === "no" ? false : v === "none" ? false : !isNaN(Number(v)) && isStr(v) ? Number(v) : v);
                plug.addReminder({ message: val.message, delay: val.delay, actionId: val.actionId, type: parse(val.type), position: parse(val.position), animation: parse(val.animation), closeButton: parse(val.closeButton), hideProgressBar: parse(val.hideProgressBar), closeOnClick: parse(val.closeOnClick), dragToClose: parse(val.dragToClose), dragToCloseDir: parse(val.dragToCloseDir), autoClose: val.autoClose === -1 ? false : val.autoClose.autoClose } as Parameters<typeof plug.addReminder>[0]);
                plug.ctlr.plug("settings.settingsView")?.menu.syncUI();
              },
            },
            {
              id: "toastsActiveReminders",
              label: "Active",
              widget: "drag-select",
              getValue: () => "",
              getOptions: () => plug.state.reminders.map((r) => ({ value: r.id, display: r.message, infoText: (r.delay ? `${Math.floor(r.delay / 1000 / 60)} minutes` : "Immediately") + (r.actionId && r.actionId !== "none" ? ` -> ${plug.ctlr.actions.entries[r.actionId]?.label || capitalize(uncamelize(r.actionId))}` : "") })),
              onDelete: (idx: number) => {
                const id = plug.state.reminders[idx]?.id;
                id && (plug.removeReminder(id), plug.ctlr.plug("settings.settingsView")?.menu.syncUI());
              },
            },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.toasts": typeof getSettingsToastsMenu;
  }
}
