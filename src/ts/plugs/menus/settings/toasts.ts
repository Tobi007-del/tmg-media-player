import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { ToastsPlug } from "@plugs/settings/toasts";
import { capitalize, uncamelize } from "@utils/str";
import { TOAST_UI_POSITIONS, TOAST_UI_ANIMATIONS, TOAST_UI_TYPES, TOAST_UI_DRAG_OPTIONS, TOAST_UI_DRAG_DIRECTIONS } from "@t007/toast";
import { formatUITime } from "@utils/time";
import { isBool } from "@utils/obj";
import { globalState } from "@tools/runtime";
import { IconRegistry } from "@core/registries";

const toToastFormOpts = (opts: any[]) => [{ option: "Default", value: "" }, ...opts.map((o) => ({ option: o.display, value: o.value }))],
  getActionOpts = (plug: ToastsPlug) => [{ option: "None", value: "none" }, ...plug.ctlr.logicActions.map((a) => ({ value: a.id, option: a.label || capitalize(uncamelize(a.id)) }))] as const,
  getToastFormVal = (v: any, k?: string) => (k === "autoClose" ? (v === false ? -1 : v == null || v === true ? "" : v / 1000) : k === "icon" && isBool(v) ? "" : k === "hideProgressBar" ? (v == null || v === "" ? "" : v === false ? "yes" : "no") : v == null ? "" : v === true ? "yes" : v === false ? "no" : v),
  parseToastVal = (v: any, k?: string) => (k === "autoClose" ? (v == -1 ? false : v === "" || v == null ? undefined : v * 1000) : k === "icon" ? (v === "" ? undefined : v) : k === "hideProgressBar" ? (v === "" || v === "default" || v == null ? undefined : v === "yes" ? false : true) : v === "" || v === "default" || v == null ? undefined : v === "yes" ? true : v === "no" || v === "none" ? false : v);

const TOAST_BOOLEAN_OPTS = [
  { option: "Default", value: "" },
  { option: "Yes", value: "yes" },
  { option: "No", value: "no" },
];

export const TOAST_FORM_INPUTS = [
  { name: "icon", label: "Icon", type: "text", compact: true, helperText: { info: `👋 Optional icon to display.` } },
  { name: "type", label: "Type", type: "select", compact: true, options: toToastFormOpts(TOAST_UI_TYPES), helperText: { info: "Visual style and tone of the notification" } },
  { name: "hideProgressBar", label: "Progress bar", type: "select", compact: true, options: TOAST_BOOLEAN_OPTS },
  { name: "compact", label: "Compact view", type: "select", compact: true, options: TOAST_BOOLEAN_OPTS },
  { name: "position", label: "Position", type: "select", compact: true, options: toToastFormOpts(TOAST_UI_POSITIONS) },
  { name: "autoClose", label: "Auto close", type: "number", compact: true, helperText: { info: "Blank for default, -1 for none" }, min: "-1", step: "any" },
];

export const syncToastConfig = (val: any, target: any) => {
  for (const key in val) {
    const parsed = parseToastVal(val[key], key);
    parsed === undefined ? delete target[key] : (target[key] = parsed);
  }
  return target;
};
export const getToastMenuInputs = (configObj: any, blacklist?: string[]) => {
  const inputs = [];
  for (const input of TOAST_FORM_INPUTS) !blacklist?.includes(input.name) && inputs.push({ ...input, value: () => getToastFormVal(configObj[input.name], input.name) });
  return inputs;
};

const getReminderInputs = (plug: ToastsPlug, ctx: { editId: string }, isEdit?: boolean) => {
  const getVal = (name: string, fallback?: any) => (isEdit ? () => getToastFormVal((plug.config.reminders[ctx.editId] as any)?.[name], name) : fallback);
  return [
    { name: "message", label: "Message", placeholder: "Take a break!", helperText: { info: "The message to display in the notification" }, required: true, compact: true, value: isEdit ? () => plug.config.reminders[ctx.editId]?.message || "" : undefined },
    { ...TOAST_FORM_INPUTS[0]!, value: getVal("icon", "timer") },
    { name: "after", label: "After (mins)", type: "number", helperText: { info: "0 for Immediate" }, required: true, compact: true, min: "0", step: "any", value: isEdit ? () => (plug.config.reminders[ctx.editId]?.after ?? 0) / 60000 : 0 },
    { name: "repeat", label: "Repeat", type: "select", options: TOAST_BOOLEAN_OPTS, compact: true, value: isEdit ? () => (plug.config.reminders[ctx.editId]?.repeat ? "yes" : "no") : "no", helperText: { info: "Reset and repeat when triggered" } },
    { name: "actionId", label: "Action", type: "select", options: getActionOpts(plug) as unknown as { option: string; value: string }[], compact: true, value: isEdit ? () => plug.config.reminders[ctx.editId]?.actionId || "none" : "none", helperText: { info: "Player-wide command to run when triggered" } },
    ...TOAST_FORM_INPUTS.slice(1).map((inp) => ({ ...inp, value: getVal(inp.name, inp.name === "type" ? "info" : inp.name === "compact" ? "yes" : inp.name === "position" ? "top-center" : inp.name === "autoClose" ? 15 : undefined) })),
  ];
};

export const getSettingsToastsMenu = (plug: ToastsPlug, ctx = { editId: "" }, defs = t007.TOAST_DEFAULT_OPTIONS): SettingsMenuItem => {
  !TOAST_FORM_INPUTS[0]!.helperText!.info.includes("keywords") && (TOAST_FORM_INPUTS[0]!.helperText!.info += ` Allows keywords: ${IconRegistry.getKeys().join(", ")}`);
  return {
    id: "advanced",
    label: "Advanced",
    widget: "group",
    getValue: () => "",
    items: [
      {
        id: "toasts",
        label: "Notification",
        widget: "group",
        getValue: () => "On",
        items: [
          {
            id: "toastsCustomReminders",
            label: "Reminders",
            widget: "drag-select",
            getValue: () => `${Object.keys(plug.config.reminders).length}`,
            getTipHTML: () => "Create personalized alerts or automation triggers that fire after a provided delay",
            getDisabled: () => false,
            getOptions: () => Object.values(plug.config.reminders).map((r, _, __, rem = r.target ? Math.max(0, r.target - Date.now()) : r.after) => ({ value: r.id, display: r.message, infoText: formatUITime(rem, false, false), progress: Math.round(((r.after - rem) / r.after) * 100), badge: r.repeat ? "Repeat" : undefined })),
            onDelete: (idx: number, id = Object.keys(plug.config.reminders)[idx], rem = plug.config.reminders[id]) => rem && t007.confirm?.(`Remove "${rem.message}" from your reminders? This cannot be undone.`, { id: `${plug.ctlr.config.id}-reminder-del-confirm`, rootElement: plug.ctlr.plug("settings.panel")?.menu?.el, confirmText: "Delete" })?.then((ok) => ok && delete plug.config.reminders[id]),
            onEdit: (idx: number, id = Object.keys(plug.config.reminders)[idx]) => id && ((ctx.editId = id), plug.ctlr.plug("settings.panel")?.menu.goTo("toastsEditReminder")),
            onWire: (syncUI, signal) => globalState.on("clock", () => Object.keys(plug.config.reminders).length && syncUI(), { signal }),
            actions: [{ id: "add", getLabel: () => "Add", icon: "add", onClick: () => plug.ctlr.plug("settings.panel")?.menu.goTo("toastsCreateReminder") }],
            configPaths: ["settings.toasts.reminders"],
            items: [
              { id: "toastsCreateReminder", label: "Create reminder", widget: "input", getValue: () => "", inputs: getReminderInputs(plug, ctx), onChange: (val: any, id = Date.now().toString()) => (plug.config.reminders[id] = { id, ...syncToastConfig(val, {}), message: val.message, after: val.after * 60000, repeat: val.repeat === "yes" || val.repeat === true, actionId: val.actionId }) },
              { id: "toastsEditReminder", label: "Edit reminder", widget: "input", getValue: () => "", inputs: getReminderInputs(plug, ctx, true), onChange: (val: any, existing = plug.config.reminders[ctx.editId]) => existing && (plug.config.reminders[ctx.editId] = { ...syncToastConfig(val, { ...existing }), message: val.message, after: val.after * 60000, repeat: val.repeat === "yes" || val.repeat === true, actionId: val.actionId }) },
            ],
          },
          { id: "toastsCloseButton", label: "Close button", widget: "toggle", getValue: () => plug.config.closeButton ?? defs.closeButton, onChange: (val: boolean) => ((plug.config.closeButton = val), plug.toast?.success?.("Close button updated!", { tag: "tmg-tstu", closeButton: val })), configPaths: ["settings.toasts.closeButton"] },
          { id: "toastsProgressBar", label: "Progress bar", widget: "toggle", getValue: () => !(plug.config.hideProgressBar ?? defs.hideProgressBar), onChange: (val: boolean) => ((plug.config.hideProgressBar = !val), plug.toast?.success?.("Progress bar updated!", { tag: "tmg-tstu", hideProgressBar: !val })), configPaths: ["settings.toasts.hideProgressBar"] },
          { id: "toastsCompact", label: "Compact view", widget: "toggle", getValue: () => plug.config.compact ?? defs.compact, onChange: (val: boolean) => ((plug.config.compact = val), plug.toast?.success?.("Compact view updated!", { tag: "tmg-tstu", compact: val })), configPaths: ["settings.toasts.compact"] },
          { id: "toastsPosition", label: "Position", widget: "select", getOptions: () => TOAST_UI_POSITIONS, getValue: () => TOAST_UI_POSITIONS.find((o) => o.value === (plug.config.position ?? defs.position))?.display, onChange: (val: string) => ((plug.config.position = val as typeof plug.config.position), plug.toast?.success?.("Position updated!", { tag: "tmg-tstu", position: val as typeof plug.config.position })), configPaths: ["settings.toasts.position"] },
          { id: "toastAnimation", label: "Animation", widget: "select", getOptions: () => TOAST_UI_ANIMATIONS, getValue: () => TOAST_UI_ANIMATIONS.find((o) => o.value === (plug.config.animation ?? defs.animation))?.display, onChange: (val: string) => ((plug.config.animation = val as typeof plug.config.animation), plug.toast?.success?.("Animation updated!", { tag: "tmg-tstu", animation: val as typeof plug.config.animation })), configPaths: ["settings.toasts.animation"] },
          { id: "toastsPauseOnHover", label: "Pause on hover", widget: "toggle", getValue: () => plug.config.pauseOnHover ?? defs.pauseOnHover, onChange: (val: boolean) => (plug.config.pauseOnHover = val), configPaths: ["settings.toasts.pauseOnHover"] },
          { id: "toastsPauseOnFocusLoss", label: "Pause on page hide", widget: "toggle", getValue: () => plug.config.pauseOnFocusLoss ?? defs.pauseOnFocusLoss, onChange: (val: boolean) => (plug.config.pauseOnFocusLoss = val), configPaths: ["settings.toasts.pauseOnFocusLoss"] },
          { id: "toastsCloseOnClick", label: "Close on click", widget: "toggle", getValue: () => plug.config.closeOnClick ?? defs.closeOnClick, onChange: (val: boolean) => (plug.config.closeOnClick = val), configPaths: ["settings.toasts.closeOnClick"] },
          { id: "toastsDragToClose", label: "Drag to close", widget: "select", getOptions: () => TOAST_UI_DRAG_OPTIONS, getValue: () => TOAST_UI_DRAG_OPTIONS.find((o) => o.value === (plug.config.dragToClose ?? defs.dragToClose))?.display, onChange: (val: any) => (plug.config.dragToClose = val as typeof plug.config.dragToClose), configPaths: ["settings.toasts.dragToClose"] },
          { id: "toastsDragToCloseDir", label: "Drag direction", widget: "select", getValue: () => TOAST_UI_DRAG_DIRECTIONS.find((o) => o.value === (plug.config.dragToCloseDir ?? defs.dragToCloseDir))?.display, getOptions: () => TOAST_UI_DRAG_DIRECTIONS, onChange: (val: string) => (plug.config.dragToCloseDir = val as typeof plug.config.dragToCloseDir), configPaths: ["settings.toasts.dragToCloseDir"] },
          { id: "toastsAutoClose", label: "Auto close", widget: "input", type: "number", required: false, min: "-1", step: "any", getValue: () => formatUITime(plug.config.autoClose ?? defs.autoClose), onChange: (val: any) => (plug.config.autoClose = val.secs == -1 ? false : val.secs === "" || val.secs == null ? undefined : val.secs * 1000), configPaths: ["settings.toasts.autoClose"], title: "Blank for default, -1 for none", helperText: { info: "Blank for default, -1 for none" }, inputs: [{ name: "secs", label: "secs", type: "number", min: "-1", step: "any", value: (v = plug.config.autoClose ?? defs.autoClose) => (v === false ? -1 : v == null || v === true ? "" : v / 1000) }] },
          { id: "toastsLimit", label: "Max visible", widget: "range", getValue: () => String(plug.config.limit ?? defs.limit), getRange: () => ({ min: 1, max: 30, step: 1, formatTooltip: (v: number) => String(Math.round(v)) }), onChange: (val: number) => (plug.config.limit = val), configPaths: ["settings.toasts.limit"] },
          { id: "toastsNewestOnTop", label: "Newest on top", widget: "toggle", getValue: () => plug.config.newestOnTop ?? defs.newestOnTop, onChange: (val: boolean) => (plug.config.newestOnTop = val), configPaths: ["settings.toasts.newestOnTop"] },
        ],
      },
    ],
  };
};

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.toasts": typeof getSettingsToastsMenu;
  }
}
