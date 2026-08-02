import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { Controller } from "@core/controller";
import { TOAST_FORM_INPUTS } from "./toasts";
import { capitalize, camelize, uncamelize } from "@utils/str";
import type { Action, ActionLogic, ActionLogicOp } from "@defs/actions";
import { getPaths, getPath, isLeafPath } from "sia-reactor/utils";
import { isFunc, isStr, getBoolOrStr } from "@utils/obj";
import { requestAnimationFrame } from "@utils/fn";
import { formatAction } from "@utils/keys";
import { NOOP } from "sia-reactor";

const fmt = (s: string) => uncamelize(s).replace(/[._-]/g, " ").trim(); // .split(" ").map(capitalize).join(" ")
const toId = (label: string) =>
  camelize(
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
  ) || "";
const OPS: ActionLogicOp[] = ["set", "increment", "decrement", "toggle"];

const confirmDelete = (label: string, ctlr: Controller) =>
  t007.confirm?.(`Delete "${label}"? This cannot be undone.`, {
    id: `${ctlr.config.id}-delete-confirm`,
    rootElement: ctlr.plug("settings.settingsView")?.menu.el ?? ctlr.media.container,
    confirmText: "Delete",
  });

const NAV_ROOT_ID = (actionId: string, stepTag: string) => `actions-${actionId}-logic-nav-${stepTag}`;
const NAV_NODE_ID = (actionId: string, stepTag: string, path: string) => `actions-${actionId}-logic-nav-${stepTag}-${path.replace(/\./g, "-")}`;

function buildPathNavNode(actionId: string, stepTag: string, path: string, root: any, ctlr: Controller, onConfirm: (step: ActionLogic) => void, existingStep?: ActionLogic): SettingsMenuItem {
  const label = path === "__root__" ? "Choose Key" : fmt(path.split(".").pop()!),
    val = path === "__root__" ? root : getPath(root, path as any),
    isLeaf = path !== "__root__" && (Array.isArray(val) || isLeafPath(root, path as any, undefined, val));
  if (isLeaf) {
    const type = Array.isArray(val) ? "array" : typeof val,
      displayVal = Array.isArray(val) ? `[${val.join(", ")}]` : String(val),
      tempStep: ActionLogic = { path, op: existingStep?.path === path && existingStep?.op ? existingStep?.op : type === "boolean" ? "toggle" : "set", value: existingStep?.path === path ? existingStep?.value : undefined };
    return {
      id: NAV_NODE_ID(actionId, stepTag, path),
      label,
      widget: "group",
      getValue: () => path,
      getTipHTML: () => `Path: <code>${path}</code>, current value: <code>${displayVal}</code>`,
      items: [
        { id: `${NAV_NODE_ID(actionId, stepTag, path)}-op`, label: "Operation", widget: "select", getValue: () => tempStep.op ?? "set", getOptions: () => OPS.map((o) => ({ value: o, display: capitalize(o) })), onChange: (v: ActionLogicOp) => (tempStep.op = v) },
        ...(type !== "boolean"
          ? [
              {
                id: `${NAV_NODE_ID(actionId, stepTag, path)}-value`,
                label: "Value",
                widget: "input" as const,
                inputs: [
                  {
                    name: "value",
                    label: "Value",
                    type: type === "number" ? "number" : "text",
                    placeholder: type === "number" ? "e.g. 80" : type === "array" ? "e.g. a, b, c" : "e.g. hello",
                    value: () => (tempStep.value !== undefined ? String(tempStep.value) : ""),
                    helperText: { info: type === "number" ? "Enter a number" : type === "array" ? "Comma-separated values" : "Text value, leave blank for increment/decrement" },
                  },
                ],
                getValue: () => (tempStep.value !== undefined ? String(tempStep.value) : ""),
                onChange: (v: Record<string, string>) => {
                  const raw = String(v.value ?? "").trim();
                  tempStep.value = raw === "" ? undefined : type === "number" || !isNaN(+raw) ? +raw : type === "array" ? raw.split(",").map((s) => s.trim()) : getBoolOrStr(raw);
                  ctlr.plug("settings.settingsView")?.menu.syncUI(NAV_NODE_ID(actionId, stepTag, path));
                },
              },
            ]
          : []),
        {
          id: `${NAV_NODE_ID(actionId, stepTag, path)}-confirm`,
          label: "Confirm step",
          widget: "button",
          getValue: () => "",
          onChange: () => {
            onConfirm({ ...tempStep });
            const menu = ctlr.plug("settings.settingsView")?.menu;
            if (!menu) return;
            const target = actionId === "new" ? "actions-add" : `actions-logic-${actionId}`;
            while (menu.navStack.length > 1 && menu.navStack[menu.navStack.length - 1] !== target) menu.goBack();
            menu.syncUI(`actions-logic-${actionId}`);
          },
        },
      ],
    };
  }
  const childPaths =
      path === "__root__"
        ? ["media", "settings"]
        : getPaths(root, path as any, { depth: 1 })
            .filter((p) => ctlr.isLogicPath(p))
            .sort((a, b) => a.localeCompare(b)),
    childNodes = childPaths.map((p) => buildPathNavNode(actionId, stepTag, p, root, ctlr, onConfirm, existingStep)),
    directInputId = `${path === "__root__" ? NAV_ROOT_ID(actionId, stepTag) : NAV_NODE_ID(actionId, stepTag, path)}-direct`;
  const directInput: SettingsMenuItem = {
    id: directInputId,
    label: "Type key",
    widget: "input",
    inline: true,
    inputs: [
      {
        name: "path",
        label: "Path",
        type: "text",
        placeholder: childPaths.map((p) => p.split(".").pop()).join(", "),
        helperText: { info: "Type the exact property name to navigate directly, or just pick from the list above." },
      },
    ],
    getValue: () => "",
    onChange: (v: Record<string, string>) => {
      const typed = String(v.path ?? "").trim(),
        match = typed ? childPaths.find((p) => p.split(".").pop()?.toLowerCase() === typed.toLowerCase()) : null;
      if (match) return void requestAnimationFrame(() => ctlr.plug("settings.settingsView")?.menu.goTo(NAV_NODE_ID(actionId, stepTag, match)), ctlr.signal);
      const fullPath = path === "__root__" ? typed : `${path}.${typed}`,
        val = ctlr.isLogicPath(fullPath) ? getPath(root, fullPath as any) : undefined,
        id = NAV_NODE_ID(actionId, stepTag, fullPath),
        menu = ctlr.plug("settings.settingsView")?.menu;
      if (typed && val !== undefined && menu) !menu.getItem(id) && menu.register(buildPathNavNode(actionId, stepTag, fullPath, root, ctlr, onConfirm, existingStep)), requestAnimationFrame(() => menu.goTo(id), ctlr.signal);
    },
  };
  return {
    id: path === "__root__" ? NAV_ROOT_ID(actionId, stepTag) : NAV_NODE_ID(actionId, stepTag, path),
    label,
    widget: "group",
    getValue: () => (path === "__root__" ? "Pick a path" : path),
    getTipHTML: () => (path === "__root__" ? "<code>media</code> controls the player (volume, fullscreen, etc.). <code>settings</code> controls configuration values." : `Drilling into <code>${path}</code>, pick a sub-property or type its name above.`),
    items: [...childNodes, directInput],
  };
}

const makeLogicNavTree = (actionId: string, stepTag: string, ctlr: Controller, onConfirm: (step: ActionLogic) => void, existingStep?: ActionLogic): SettingsMenuItem => buildPathNavNode(actionId, stepTag, "__root__", { media: ctlr.media, settings: ctlr.settings }, ctlr, onConfirm, existingStep);

const stepLabel = (step: ActionLogic) => (step.path ? `${step.path} (${step.op ?? "set"}${step.value !== undefined ? ` ${step.value}` : ""})` : "Empty step");

function makeLogicStepView(step: ActionLogic, idx: number, actionId: string, ctlr: Controller, logicItems: SettingsMenuItem[]): SettingsMenuItem {
  const navTree = makeLogicNavTree(
    actionId,
    String(idx),
    ctlr,
    (newStep) => {
      const a = ctlr.actions.entries[actionId] as Action;
      a.logic![idx] = newStep;
      logicItems[idx] = makeLogicStepView(a.logic![idx], idx, actionId, ctlr, logicItems);
      ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${actionId}`);
    },
    step
  );
  return {
    id: `actions-${actionId}-logic-${idx}`,
    label: `Step ${idx + 1}`,
    widget: "group",
    getValue: () => stepLabel(step),
    items: [navTree],
  };
}

function makeLogicGroup(action: Action, ctlr: Controller, logicItems: SettingsMenuItem[]): SettingsMenuItem {
  const hasLogicSupport = action.logic !== undefined || action.userCreated,
    liveLogic = () => (ctlr.actions.entries[action.id] as Action).logic ?? [];
  return {
    id: `actions-logic-${action.id}`,
    label: "Logic steps",
    widget: "drag-select",
    getValue() {
      if (!hasLogicSupport) return "Internal";
      const len = liveLogic().length;
      return len ? `${len} step${len !== 1 ? "s" : ""}` : "None";
    },
    getDisabled: () => !hasLogicSupport,
    getOptions: () => liveLogic().map((step, i) => ({ value: String(i), display: stepLabel(step), title: step.value !== undefined ? `Value: ${step.value}` : undefined })),
    onReorder: (from: number, to: number) => {
      const steps = liveLogic();
      steps.splice(to, 0, ...steps.splice(from, 1));
      logicItems.splice(0, logicItems.length, ...steps.map((s, i) => makeLogicStepView(s, i, action.id, ctlr, logicItems)));
      ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
    },
    onEdit: (i: number) => ctlr.plug("settings.settingsView")?.menu.goTo(liveLogic()[i].path ? NAV_NODE_ID(action.id, String(i), liveLogic()[i].path) : NAV_ROOT_ID(action.id, String(i))),
    onDelete: async (i: number) => {
      if (!(await confirmDelete(stepLabel(liveLogic()[i]), ctlr))) return;
      const steps = liveLogic();
      steps.splice(i, 1);
      logicItems.splice(0, logicItems.length, ...steps.map((s, j) => makeLogicStepView(s, j, action.id, ctlr, logicItems))), ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
    },
    actions: hasLogicSupport
      ? [
          {
            id: "add",
            getLabel: () => "Add Step",
            icon: "add",
            onClick: () => {
              const a = ctlr.actions.entries[action.id] as Action;
              if (!a.logic) a.logic = [];
              const tag = `new-${ctlr.config.id}-${Math.random().toString(36).slice(2, 9)}`,
                navTree = makeLogicNavTree(action.id, tag, ctlr, (newStep) => {
                  const act = ctlr.actions.entries[action.id] as Action;
                  if (!act.logic) act.logic = [];
                  act.logic.push(newStep);
                  logicItems.splice(0, logicItems.length, ...act.logic.map((s, j) => makeLogicStepView(s, j, action.id, ctlr, logicItems))), ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
                }),
                placeholder: SettingsMenuItem = { id: `actions-${action.id}-logic-${tag}`, label: "New step", widget: "group", getValue: () => "New", items: [navTree] };
              logicItems.push(placeholder), ctlr.plug("settings.settingsView")?.menu.goTo(NAV_ROOT_ID(action.id, tag));
            },
          },
        ]
      : undefined,
    items: logicItems,
    getTipHTML: () => (hasLogicSupport ? "Logic runs top-to-bottom when triggered. Use + to add a step. Drag to reorder." : "This action runs native code. Logic steps are not supported."),
  };
}

function makeActionContent(action: Action, ctlr: Controller, logicItems: SettingsMenuItem[]): SettingsMenuItem[] {
  const live = () => ctlr.actions.entries[action.id] as Action,
    parseBool = (v: any) => (v === "default" ? undefined : v === "yes" ? true : v === "no" ? false : !isNaN(Number(v)) && isStr(v) ? Number(v) : v);
  return [
    {
      id: `actions-key-${action.id}`,
      label: "Keyboard shortcut",
      widget: "input",
      inputs: [
        {
          label: "Key",
          type: "text",
          placeholder: "f, Shift+f",
          value: () => {
            const s = ctlr.settings.keys.shortcuts[action.id];
            return Array.isArray(s) ? s.join(", ") : s ?? "";
          },
          helperText: { info: "Comma-separated key combos (e.g. f, Shift+f). Save to apply." },
        },
        {
          label: "Phase",
          type: "select",
          options: [
            { option: "Key Down", value: "keydown" },
            { option: "Key Up", value: "keyup" },
          ],
          value: () => (live().keyboard?.phase as string) ?? "keydown",
        },
      ],
      getValue: () => formatAction(ctlr.settings.keys.shortcuts[action.id]) || "None",
      onChange: (val: Record<string, string>) => {
        const keys = val["Key"]
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        ctlr.settings.keys.shortcuts[action.id] = keys.length > 1 ? keys : keys[0] ?? "";
        live().keyboard = { ...live().keyboard, phase: val["Phase"] as any };
      },
      configPaths: [`settings.keys.shortcuts.${action.id}` as any],
    },
    {
      id: `actions-voice-${action.id}`,
      label: "Voice triggers",
      widget: "input",
      inputs: [
        {
          label: "Phrases",
          type: "text",
          placeholder: "play, start playing",
          value: () => {
            const t = ctlr.settings.voice.commands[action.id] ?? "";
            return Array.isArray(t) ? t.join(", ") : String(t);
          },
          helperText: { info: "Comma-separated phrases. Voice control matches any of them." },
        },
        {
          label: "Stage",
          type: "select",
          options: [
            { option: "Anytime", value: "anytime" },
            { option: "Pre-Route", value: "pre-route" },
            { option: "Post-Route", value: "post-route" },
          ],
          value: () => live().voice?.stage ?? "post-route",
        },
      ],
      getValue() {
        const t = ctlr.settings.voice.commands[action.id] ?? "",
          val = Array.isArray(t) && t.length > 0 ? t.join(", ") : String(t);
        return val ? `🎙️ ${val}` : "None";
      },
      onChange: (val: Record<string, string>) => {
        const triggers = val["Phrases"]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        ctlr.settings.voice.commands[action.id] = triggers.length > 0 ? triggers : [];
        live().voice = { ...live().voice, stage: val["Stage"] as any };
      },
      configPaths: [`actions.entries.${action.id}.voice` as any, `settings.voice.commands.${action.id}` as any],
    },
    makeLogicGroup(action, ctlr, logicItems),

    { id: `actions-notify-${action.id}`, label: "Pop-up", widget: "select", getOptions: () => [{ value: "", display: "None" }, ...Array.from(new Set<string>(ctlr.plug<any>("settings.notifiers")?.state.events ?? [])).map((n) => ({ value: n, display: fmt(n) }))], getValue: () => (live().notify ? fmt(live().notify!) : "None"), onChange: (val: string) => (live().notify = val || undefined), configPaths: [`actions.entries.${action.id}.notify` as any] },
    {
      id: `actions-toast-${action.id}`,
      label: "Notification",
      widget: "input",
      getValue() {
        const r = live().toast?.render;
        return r ? (isFunc(r) ? "Dynamic text" : capitalize(r)) : "None";
      },
      inputs: [
        { name: "message", label: "Message", type: "text", value: () => (isFunc(live().toast?.render) ? (live().toast!.render as Function)?.() : live().toast?.render) ?? "", placeholder: "Action triggered!", required: true, helperText: { info: "The message to display in the notification" } },
        ...TOAST_FORM_INPUTS.map((input) => {
          const key = input.name;
          return {
            ...input,
            value: () => {
              const val = live().toast?.[key];
              return key === "autoClose" ? (val === false ? -1 : val === undefined || val === true ? "" : val) : val === true ? "yes" : val === false ? "no" : val === undefined ? "" : val;
            },
          };
        }),
      ],
      onChange: (val: any) => {
        if (!val.message) return void (live().toast = undefined);
        const rawOpts = { render: val.message, type: parseBool(val.type), position: parseBool(val.position), animation: parseBool(val.animation), closeButton: parseBool(val.closeButton), hideProgressBar: parseBool(val.hideProgressBar), closeOnClick: parseBool(val.closeOnClick), dragToClose: parseBool(val.dragToClose), dragToCloseDir: parseBool(val.dragToCloseDir), autoClose: val.autoClose === -1 ? false : val.autoClose };
        live().toast = Object.fromEntries(Object.entries(rawOpts).filter(([, v]) => v !== undefined)) as any;
      },
    },
    {
      id: `actions-gates-${action.id}`,
      label: "Gates (features)",
      widget: "select",
      getMultiple: () => true,
      getOptions: () =>
        Object.keys(ctlr.media.features)
          .sort((a, b) => a.localeCompare(b))
          .map((f) => ({ value: f, display: fmt(f) })),
      getValue: () => live().gates?.map(fmt) || [],
      onChange: (val: string) => {
        const c = Array.isArray(live().gates) ? live().gates! : (live().gates = []);
        const idx = c.indexOf(val as any);
        idx > -1 ? c.splice(idx, 1) : c.push(val as any);
        if (!c.length) live().gates = undefined;
      },
      configPaths: ["devMode", `actions.entries.${action.id}.gates` as any],
      hidden: () => !ctlr.config.devMode,
    },
    { id: `actions-zen-${action.id}`, label: "Zen (run everywhere)", widget: "toggle", getValue: () => (live().zen ? "On" : "Off"), onChange: (val: boolean) => (live().zen = val), hidden: () => !ctlr.config.devMode, configPaths: ["devMode", `actions.entries.${action.id}.zen` as any], title: `Run even while ${ctlr.zenlist.map(fmt).join(" / ")} is open` },
  ];
}

function makeActionDetail(action: Action, ctlr: Controller, onDeleteAction: () => void): SettingsMenuItem {
  const live = () => ctlr.actions.entries[action.id] as Action,
    logicItems: SettingsMenuItem[] = [];
  logicItems.push(...(action.logic ?? []).map((step, i) => makeLogicStepView(step, i, action.id, ctlr, logicItems)));
  return {
    id: `actions-detail-${action.id}`,
    label: action.label ?? fmt(action.id),
    getBadge: () => (action.userCreated ? { label: "Own" } : undefined),
    widget: "group",
    getValue: () => formatAction(ctlr.settings.keys.shortcuts[action.id], ctlr.settings.voice.commands[action.id]) || "None",
    configPaths: [`actions.entries.${action.id}` as any, `settings.keys.shortcuts.${action.id}` as any],
    actions: [
      { id: "run", getLabel: () => "Run", icon: "play", onClick: () => ctlr.runAction(action.id) },
      ...(action.userCreated
        ? [
            {
              id: "delete",
              getLabel: () => "Delete",
              icon: "delete" as const,
              onClick: async () => {
                if (!(await confirmDelete(live().label ?? fmt(action.id), ctlr))) return;
                delete ctlr.actions.entries[action.id], onDeleteAction(), ctlr.plug("settings.settingsView")?.menu.goBack();
              },
            },
          ]
        : []),
    ],
    items: makeActionContent(action, ctlr, logicItems),
  };
}

function makeActionForm(ctlr: Controller, onAdd: () => void): SettingsMenuItem {
  return {
    id: "actions-add",
    label: "Create action",
    widget: "input",
    hidden: true,
    inputs: [
      { name: "label", label: "Label", type: "text", placeholder: "My Custom Action", required: true, helperText: { info: "Give it a name. The ID is auto-generated from it." } },
      { name: "keys", label: "Keyboard shortcut", type: "text", placeholder: "f, Shift+f", helperText: { info: "Optional, you can add or change this later." } },
      { name: "voice", label: "Voice triggers", type: "text", placeholder: "play, start playing", helperText: { info: "Optional, you can add or change this later. After creating, go add logic steps." } },
    ],
    getValue: () => "",
    onChange: (vals: Record<string, string>) => {
      const label = (vals.label || "").trim(),
        id = toId(label);
      if (!id || ctlr.actions.entries[id]) return;
      const triggers = (vals.voice || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        keys = (vals.keys || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      ctlr.registerAction(id, { label, fn: NOOP, logic: [], userCreated: true });
      if (triggers.length) (ctlr.settings.voice.commands as any)[id] = triggers;
      if (keys.length) (ctlr.settings.keys.shortcuts as any)[id] = keys.length > 1 ? keys : keys[0];
      onAdd(), ctlr.plug("settings.settingsView")?.menu.goBack(), requestAnimationFrame(() => ctlr.plug("settings.settingsView")?.menu.goTo(`actions-detail-${id}`), ctlr.signal);
    },
  };
}

export const getActionsMenu = (ctlr: Controller): SettingsMenuItem => {
  const visibleActions = () => (Object.values(ctlr.actions.entries) as Action[]).filter((a) => !a.private).sort((a, b) => (a.label ?? a.id).localeCompare(b.label ?? b.id)),
    actionItems: SettingsMenuItem[] = [],
    rebuildActionItems = () => actionItems.splice(0, actionItems.length, addForm, ...visibleActions().map((a) => makeActionDetail(a, ctlr, rebuildActionItems))),
    addForm = makeActionForm(ctlr, rebuildActionItems);
  let lastSig = "";
  const getSig = () =>
    visibleActions()
      .map((a) => a.id + (a.label ?? ""))
      .join(", ");
  rebuildActionItems();
  lastSig = getSig();
  return {
    id: "advanced",
    label: "Advanced",
    icon: "settings",
    widget: "group",
    getValue: () => "",
    items: [
      {
        id: "actions",
        label: "Actions",
        getBadge: () => {
          const user = visibleActions().filter((a) => a.userCreated).length;
          return { label: "beta", value: user ? `${user} Own` : undefined };
        },
        widget: "group",
        getValue: () => String(visibleActions().length),
        getTipHTML: () => "Actions are player-wide commands. Use + to create your own, pair them with keyboard shortcuts, voice triggers, or chain logic steps.",
        onWire: (syncUI, signal) =>
          ctlr.config.on(
            "actions" as any,
            () => {
              const sig = getSig();
              if (sig !== lastSig) {
                lastSig = sig;
                rebuildActionItems();
              }
              syncUI();
              ctlr.plug("settings.settingsView")?.menu.syncUI("actions");
            },
            { signal }
          ),
        actions: [{ id: "add", getLabel: () => "Add", icon: "add", onClick: () => ctlr.plug("settings.settingsView")?.menu.goTo("actions-add") }],
        items: actionItems,
      },
    ],
  };
};

declare module "@defs/registries" {
  interface MenuRegistryMap {
    actions: typeof getActionsMenu;
  }
}
