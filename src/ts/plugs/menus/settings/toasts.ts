import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ToastsPlug } from "@plugs/settings/toasts";
import { capitalize } from "@utils/str";
import { isStr } from "@utils/obj";
import { TOAST_UI_POSITIONS, TOAST_UI_ANIMATIONS, TOAST_UI_TYPES, TOAST_UI_DRAG_OPTIONS, TOAST_UI_DRAG_DIRECTIONS } from "@t007/toast";

export const TOAST_BOOLEAN_OPTS = [
  { option: "Default", value: "default" },
  { option: "Yes", value: "yes" },
  { option: "No", value: "no" },
];
export const toToastFormOpts = (opts: any[]) => [{ option: "Default", value: "default" }, ...opts.map((o) => ({ option: o.display, value: o.value }))];

export const TOAST_FORM_INPUTS = [
  { label: "Type", type: "select", options: toToastFormOpts(TOAST_UI_TYPES) },
  { label: "Position", type: "select", options: toToastFormOpts(TOAST_UI_POSITIONS) },
  { label: "Animation", type: "select", options: toToastFormOpts(TOAST_UI_ANIMATIONS) },
  { label: "Close Button", type: "select", options: TOAST_BOOLEAN_OPTS },
  { label: "Hide Progress Bar", type: "select", options: TOAST_BOOLEAN_OPTS },
  { label: "Close On Click", type: "select", options: TOAST_BOOLEAN_OPTS },
  { label: "Drag To Close", type: "select", options: toToastFormOpts(TOAST_UI_DRAG_OPTIONS) },
  { label: "Drag Direction", type: "select", options: toToastFormOpts(TOAST_UI_DRAG_DIRECTIONS) },
  { label: "Auto Close (ms)", type: "number", helperText: { info: "Blank for Default, -1 for None" }, min: "-1" },
] as any[];

const getActionOpts = (plug: ToastsPlug) =>
  [
    { option: "None", value: "none" },
    ...Object.keys(plug.ctlr.actions)
      .filter((k) => !plug.ctlr.actions[k]?.private)
      .map((k) => ({ value: k, option: plug.ctlr.actions[k]?.label || capitalize(k.replace(/([A-Z])/g, " $1").toLowerCase()) })),
  ] as const;

export const getSettingsToastsMenu = (plug: ToastsPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
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
        {
          id: "toastsCustomReminders",
          label: "Custom Reminders",
          widget: "group",
          getValue: () => (plug.state.reminders.length ? `${plug.state.reminders.length} Active` : ""),
          items: [
            {
              id: "toastsCreateReminder",
              label: "Create Reminder",
              widget: "input",
              getValue: () => "",
              inputs: [{ label: "Message", placeholder: "Take a break!", helperText: { info: "The message to display in the reminder" }, required: true }, { label: "Delay (ms)", type: "number", helperText: { info: "0 for Immediate" }, required: true, min: "0", value: 0 }, { label: "Action", type: "select", options: getActionOpts(plug) as unknown as { option: string; value: string }[] }, ...TOAST_FORM_INPUTS],
              onChange: (val: any) => {
                const parse = (v: any) => (v === "default" ? undefined : v === "yes" ? true : v === "no" ? false : v === "none" ? false : !isNaN(Number(v)) && isStr(v) ? Number(v) : v);
                plug.addReminder({ message: val.Message, delay: val["Delay (ms)"], actionId: val.Action, type: parse(val.Type), position: parse(val.Position), animation: parse(val.Animation), closeButton: parse(val["Close Button"]), hideProgressBar: parse(val["Hide Progress Bar"]), closeOnClick: parse(val["Close On Click"]), dragToClose: parse(val["Drag To Close"]), dragToCloseDir: parse(val["Drag Direction"]), autoClose: val["Auto Close (ms)"] === -1 ? false : val["Auto Close (ms)"] } as Parameters<typeof plug.addReminder>[0]);
                plug.ctlr.plug("settings.settingsView")?.menu.syncUI();
              },
            },
            {
              id: "toastsActiveReminders",
              label: "Active",
              widget: "drag-select",
              getValue: () => "",
              getOptions: () => plug.state.reminders.map((r) => ({ value: r.id, display: r.message, infoText: (r.delay ? `${Math.floor(r.delay / 1000 / 60)} minutes` : "Immediately") + (r.actionId && r.actionId !== "none" ? ` -> ${plug.ctlr.actions[r.actionId]?.label || capitalize(r.actionId.replace(/([A-Z])/g, " $1").toLowerCase())}` : "") })),
              onDelete: (idx: number) => {
                const id = plug.state.reminders[idx]?.id;
                id && (plug.removeReminder(id), plug.ctlr.plug("settings.settingsView")?.menu.syncUI());
              },
            },
          ],
        },
        {
          id: "toastsDisabled",
          label: "Disable",
          widget: "toggle",
          getValue: () => (plug.config.disabled ? "On" : "Off"),
          onChange: (val: boolean) => ((plug.config.disabled = val), !val && plug.toast?.("Notifications enabled!", { tag: "tmg-tsts", type: "success", renotify: true })),
          configPaths: ["settings.toasts.disabled"],
        },

        {
          id: "toastsPosition",
          label: "Position",
          widget: "select",
          getOptions: () => TOAST_UI_POSITIONS,
          getValue: () => TOAST_UI_POSITIONS.find((o) => o.value === plug.config.position)?.display,
          onChange: (val: string) => ((plug.config.position = val as typeof plug.config.position), plug.toast?.("Position updated!", { tag: "tmg-tsts", position: val as typeof plug.config.position, type: "success", renotify: true })),
          configPaths: ["settings.toasts.position"],
          tipHTML: "Where the toasts should appear on the screen",
        },
        {
          id: "toastAnimation",
          label: "Animation",
          widget: "select",
          getOptions: () => TOAST_UI_ANIMATIONS,
          getValue: () => TOAST_UI_ANIMATIONS.find((o) => o.value === (isStr(plug.config.animation) ? plug.config.animation : "slide"))?.display,
          onChange: (val: string) => ((plug.config.animation = val as typeof plug.config.animation), plug.toast?.("Animation updated!", { tag: "tmg-tsts", animation: val as typeof plug.config.animation, type: "success", renotify: true })),
          configPaths: ["settings.toasts.animation"],
        },
        {
          id: "toastsLimit",
          label: "Max Visible",
          widget: "range",
          getValue: () => String(plug.config.limit),
          getRange: () => ({ min: 1, max: 30, step: 1, formatTooltip: (v: number) => String(Math.round(v)) }),
          onChange: (val: number) => (plug.config.limit = val),
          configPaths: ["settings.toasts.limit"],
        },
        {
          id: "toastsNewestOnTop",
          label: "Newest on Top",
          widget: "toggle",
          getValue: () => (plug.config.newestOnTop ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.newestOnTop = val),
          configPaths: ["settings.toasts.newestOnTop"],
        },
        {
          id: "toastsProgressBar",
          label: "Hide Progress Bar",
          widget: "toggle",
          getValue: () => (plug.config.hideProgressBar ? "On" : "Off"),
          onChange: (val: boolean) => ((plug.config.hideProgressBar = val), plug.toast?.("Progress bar visibility updated!", { tag: "tmg-tsts", hideProgressBar: val, type: "info", renotify: true })),
          configPaths: ["settings.toasts.hideProgressBar"],
        },
        {
          id: "toastsCloseButton",
          label: "Show Close Button",
          widget: "toggle",
          getValue: () => (plug.config.closeButton ? "On" : "Off"),
          onChange: (val: boolean) => ((plug.config.closeButton = val), plug.toast?.("Close button visibility updated!", { tag: "tmg-tsts", closeButton: val, type: "info", renotify: true })),
          configPaths: ["settings.toasts.closeButton"],
        },
        {
          id: "toastsCloseOnClick",
          label: "Close on Click",
          widget: "toggle",
          getValue: () => (plug.config.closeOnClick ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.closeOnClick = val),
          configPaths: ["settings.toasts.closeOnClick"],
        },
        {
          id: "toastsPauseOnHover",
          label: "Pause on Hover",
          widget: "toggle",
          getValue: () => (plug.config.pauseOnHover ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.pauseOnHover = val),
          configPaths: ["settings.toasts.pauseOnHover"],
        },
        {
          id: "toastsPauseOnFocusLoss",
          label: "Pause on Focus Loss",
          widget: "toggle",
          getValue: () => (plug.config.pauseOnFocusLoss ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.pauseOnFocusLoss = val),
          configPaths: ["settings.toasts.pauseOnFocusLoss"],
        },
        {
          id: "toastsDragToClose",
          label: "Drag to Close",
          widget: "toggle",
          getValue: () => TOAST_UI_DRAG_OPTIONS.find((o) => o.value === plug.config.dragToClose)?.display,
          onChange: (val: boolean) => (plug.config.dragToClose = val),
          configPaths: ["settings.toasts.dragToClose"],
        },
        {
          id: "toastsDragToCloseDir",
          label: "Drag Direction",
          widget: "select",
          getValue: () => TOAST_UI_DRAG_DIRECTIONS.find((o) => o.value === plug.config.dragToCloseDir)?.display,
          getOptions: () => TOAST_UI_DRAG_DIRECTIONS,
          onChange: (val: string) => (plug.config.dragToCloseDir = val as typeof plug.config.dragToCloseDir),
          configPaths: ["settings.toasts.dragToCloseDir"],
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
