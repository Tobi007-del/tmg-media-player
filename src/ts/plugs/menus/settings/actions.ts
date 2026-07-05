import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { Controller } from "@core/controller";
import { TOAST_FORM_INPUTS } from "./toasts";
import { capitalize, camelize } from "@utils/str";
import type { Action, ActionLogic, ActionOp } from "@defs/actions";
import { getPaths, getPath, isLeafPath } from "sia-reactor/utils";
import { isFunc, isStr } from "@utils/obj";
import { requestAnimationFrame } from "@utils/fn";

const fmt = (s: string) =>
  capitalize(
    s
      .replace(/([A-Z])/g, " $1")
      .replace(/[._]/g, " ")
      .trim()
  );
const toId = (label: string) =>
  camelize(
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
  ) || "";
const OPS: ActionOp[] = ["set", "increment", "decrement", "toggle"];

const confirmDelete = (label: string, ctlr: Controller) =>
  t007.confirm(`Delete "${label}"? This cannot be undone.`, {
    id: `${ctlr.config.id}-delete-confirm`,
    rootElement: ctlr.plug("settings.settingsView")?.menu.el ?? ctlr.media.container,
    confirmText: "Delete",
    title: "Confirm Delete",
  });

const NAV_ROOT_ID = (actionId: string, stepTag: string) => `actions-${actionId}-logic-nav-${stepTag}`;
const NAV_NODE_ID = (actionId: string, stepTag: string, path: string) => `actions-${actionId}-logic-nav-${stepTag}-${path.replace(/\./g, "-")}`;

function buildPathNavNode(actionId: string, stepTag: string, path: string, root: any, ctlr: Controller, onConfirm: (step: ActionLogic) => void, existingStep?: ActionLogic): SettingsMenuItem {
  const label =
      path === "__root__"
        ? "Choose Path"
        : capitalize(
            path
              .split(".")
              .pop()!
              .replace(/([A-Z])/g, " $1")
          ),
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
      tipHTML: `Path: <code>${path}</code>, current value: <code>${displayVal}</code>`,
      items: [
        {
          id: `${NAV_NODE_ID(actionId, stepTag, path)}-op`,
          label: "Operation",
          widget: "select",
          getValue: () => tempStep.op ?? "set",
          getOptions: () => OPS.map((o) => ({ value: o, display: capitalize(o) })),
          onChange: (v: ActionOp) => (tempStep.op = v),
        },
        ...(type !== "boolean"
          ? [
              {
                id: `${NAV_NODE_ID(actionId, stepTag, path)}-value`,
                label: "Value",
                widget: "input" as const,
                inputs: [
                  {
                    label: "Value",
                    type: type === "number" ? "number" : "text",
                    placeholder: type === "number" ? "e.g. 80" : type === "array" ? "e.g. a, b, c" : "e.g. hello",
                    value: () => (tempStep.value !== undefined ? String(tempStep.value) : ""),
                    helperText: { info: type === "number" ? "Enter a number" : type === "array" ? "Comma-separated values" : "Text value, leave blank for increment/decrement" },
                  },
                ],
                getValue: () => (tempStep.value !== undefined ? String(tempStep.value) : ""),
                onChange: (v: Record<string, string>) => {
                  const raw = String(v["Value"] ?? "").trim();
                  tempStep.value = raw === "" ? undefined : raw === "true" ? true : raw === "false" ? false : type === "number" || !isNaN(+raw) ? +raw : type === "array" ? raw.split(",").map((s) => s.trim()) : raw;
                  ctlr.plug("settings.settingsView")?.menu.syncUI(NAV_NODE_ID(actionId, stepTag, path));
                },
              },
            ]
          : []),
        {
          id: `${NAV_NODE_ID(actionId, stepTag, path)}-confirm`,
          label: "Confirm Step",
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
            .sort(),
    childNodes = childPaths.map((p) => buildPathNavNode(actionId, stepTag, p, root, ctlr, onConfirm, existingStep)),
    directInputId = `${path === "__root__" ? NAV_ROOT_ID(actionId, stepTag) : NAV_NODE_ID(actionId, stepTag, path)}-direct`;
  const directInput: SettingsMenuItem = {
    id: directInputId,
    label: "Type path",
    widget: "input",
    inline: true,
    inputs: [
      {
        label: "Path",
        type: "text",
        placeholder: childPaths.map((p) => p.split(".").pop()).join(", "),
        helperText: { info: "Type the exact property name to navigate directly, or just pick from the list above." },
      },
    ],
    getValue: () => "",
    onChange: (v: Record<string, string>) => {
      const typed = String(v["Path"] ?? "").trim(),
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
    tipHTML: path === "__root__" ? "<code>media</code> controls the player (volume, fullscreen, etc.). <code>settings</code> controls configuration values." : `Drilling into <code>${path}</code>, pick a sub-property or type its name above.`,
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
      const a = ctlr.actions[actionId] as Action;
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
    liveLogic = () => (ctlr.actions[action.id] as Action).logic ?? [];
  return {
    id: `actions-logic-${action.id}`,
    label: "Logic Steps",
    widget: "drag-select",
    getValue: () => {
      if (!hasLogicSupport) return "Internal";
      const len = liveLogic().length;
      return len ? `${len} step${len !== 1 ? "s" : ""}` : "None";
    },
    getDisabled: () => !hasLogicSupport,
    getOptions: () => liveLogic().map((step, i) => ({ value: String(i), display: stepLabel(step), title: step.value !== undefined ? `Value: ${step.value}` : undefined })),
    onReorder: (from: number, to: number) => {
      const steps = [...liveLogic()];
      steps.splice(to, 0, ...steps.splice(from, 1));
      (ctlr.actions[action.id] as Action).logic = steps;
      logicItems.splice(0, logicItems.length, ...steps.map((s, i) => makeLogicStepView(s, i, action.id, ctlr, logicItems)));
      ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
    },
    onEdit: (i: number) => ctlr.plug("settings.settingsView")?.menu.goTo(liveLogic()[i].path ? NAV_NODE_ID(action.id, String(i), liveLogic()[i].path) : NAV_ROOT_ID(action.id, String(i))),
    onDelete: async (i: number) => {
      if (!(await confirmDelete("this logic step", ctlr))) return;
      const steps = [...liveLogic()];
      steps.splice(i, 1), ((ctlr.actions[action.id] as Action).logic = steps);
      logicItems.splice(0, logicItems.length, ...steps.map((s, j) => makeLogicStepView(s, j, action.id, ctlr, logicItems))), ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
    },
    actions: hasLogicSupport
      ? [
          {
            id: "add",
            getLabel: () => "Add Step",
            icon: "add",
            onClick: () => {
              const a = ctlr.actions[action.id] as Action;
              if (!a.logic) a.logic = [];
              const tag = `new-${ctlr.config.id}-${Math.random().toString(36).slice(2, 9)}`,
                navTree = makeLogicNavTree(action.id, tag, ctlr, (newStep) => {
                  const act = ctlr.actions[action.id] as Action;
                  act.logic = [...(act.logic ?? []), newStep];
                  logicItems.splice(0, logicItems.length, ...act.logic.map((s, j) => makeLogicStepView(s, j, action.id, ctlr, logicItems))), ctlr.plug("settings.settingsView")?.menu.syncUI(`actions-logic-${action.id}`);
                }),
                placeholder: SettingsMenuItem = { id: `actions-${action.id}-logic-${tag}`, label: "New Step", widget: "group", getValue: () => "New", items: [navTree] };
              logicItems.push(placeholder), ctlr.plug("settings.settingsView")?.menu.goTo(NAV_ROOT_ID(action.id, tag));
            },
          },
        ]
      : undefined,
    items: logicItems,
    tipHTML: hasLogicSupport ? "Logic runs top-to-bottom when triggered. Use + to add a step. Drag to reorder." : "This action runs native code. Logic steps are not supported.",
  };
}

function makeActionContent(action: Action, ctlr: Controller, logicItems: SettingsMenuItem[]): SettingsMenuItem[] {
  const live = () => ctlr.actions[action.id] as Action,
    parseBool = (v: any) => (v === "default" ? undefined : v === "yes" ? true : v === "no" ? false : !isNaN(Number(v)) && isStr(v) ? Number(v) : v);
  return [
    {
      id: `actions-key-${action.id}`,
      label: "Keyboard Shortcut",
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
      getValue: () => {
        const s = ctlr.settings.keys.shortcuts[action.id];
        const val = Array.isArray(s) ? s.join(", ") : String(s ?? "");
        return val ? `⌨️ ${val}` : "None";
      },
      onChange: (val: Record<string, string>) => {
        const keys = val["Key"]
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          obj = ctlr.settings.keys.shortcuts;
        if (obj) obj[action.id] = keys.length > 1 ? keys : keys[0] ?? "";
        live().keyboard = { ...live().keyboard, phase: val["Phase"] as any };
      },
      configPaths: [`settings.keys.shortcuts.${action.id}` as any],
    },
    {
      id: `actions-voice-${action.id}`,
      label: "Voice Triggers",
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
            { option: "Always", value: "always" },
            { option: "Pre-Process", value: "pre-process" },
            { option: "Post-Process", value: "post-process" },
          ],
          value: () => live().voice?.stage ?? "post-process",
        },
      ],
      getValue: () => {
        const t = ctlr.settings.voice.commands[action.id] ?? "";
        const val = Array.isArray(t) && t.length > 0 ? t.join(", ") : String(t);
        return val ? `🎙️ ${val}` : "None";
      },
      onChange: (val: Record<string, string>) => {
        const triggers = val["Phrases"]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          obj = ctlr.settings.voice.commands;
        if (obj) obj[action.id] = triggers.length > 0 ? triggers : [];
        live().voice = { ...live().voice, stage: val["Stage"] as any };
      },
      configPaths: [`actions.${action.id}.voice` as any, `settings.voice.commands.${action.id}` as any],
    },
    makeLogicGroup(action, ctlr, logicItems),
    {
      id: `actions-notify-${action.id}`,
      label: "Pop-up",
      widget: "select",
      getOptions: () => [{ value: "", display: "None" }, ...Array.from(new Set<string>(ctlr.plug<any>("settings.notifiers")?.state.events ?? [])).map((n) => ({ value: n, display: n }))],
      getValue: () => live().notify || "None",
      onChange: (val: string) => (live().notify = val || undefined),
      configPaths: [`actions.${action.id}.notify` as any],
    },
    {
      id: `actions-toast-${action.id}`,
      label: "Notification",
      widget: "input",
      getValue: () => {
        const r = live().toast?.render;
        return r ? (typeof r === "function" ? "Dynamic text" : String(r)) : "None";
      },
      inputs: [
        { label: "Message", type: "text", value: () => (isFunc(live().toast?.render) ? (live().toast!.render as Function)?.() : live().toast?.render) ?? "", placeholder: "Action triggered!", helperText: { info: "The message to display in the notification" } },
        ...TOAST_FORM_INPUTS.map((input) => {
          const map = {
            Type: "type",
            Position: "position",
            Animation: "animation",
            "Close Button": "closeButton",
            "Hide Progress Bar": "hideProgressBar",
            "Close On Click": "closeOnClick",
            "Drag To Close": "dragToClose",
            "Drag Direction": "dragToCloseDir",
            "Auto Close (ms)": "autoClose",
          } as const;
          const key = map[input.label as keyof typeof map];
          return {
            ...input,
            value:
              key === "autoClose"
                ? () => (live().toast?.autoClose === false ? -1 : (live().toast?.autoClose as number | undefined))
                : () => {
                    const val = live().toast?.[key];
                    return val === undefined ? "default" : val === true ? "yes" : val === false ? "no" : val;
                  },
          };
        }),
      ],
      onChange: (val: any) => {
        if (!val.Message) return void (live().toast = undefined);
        const rawOpts = { render: val.Message, type: parseBool(val.Type), position: parseBool(val.Position), animation: parseBool(val.Animation), closeButton: parseBool(val["Close Button"]), hideProgressBar: parseBool(val["Hide Progress Bar"]), closeOnClick: parseBool(val["Close On Click"]), dragToClose: parseBool(val["Drag To Close"]), dragToCloseDir: parseBool(val["Drag Direction"]), autoClose: val["Auto Close (ms)"] === -1 ? false : val["Auto Close (ms)"] === "" ? undefined : parseBool(val["Auto Close (ms)"]) };
        live().toast = Object.fromEntries(Object.entries(rawOpts).filter(([, v]) => v !== undefined)) as any;
      },
    },
    {
      id: `actions-zen-${action.id}`,
      label: "Zen",
      widget: "toggle",
      getValue: () => (live().zen ? "On" : "Off"),
      onChange: (val: boolean) => (live().zen = val),
      configPaths: [`actions.${action.id}.zen` as any],
      title: () => `Run even while ${ctlr.zenlist.map(fmt).join(" / ")} is open`,
    },
  ];
}

function makeActionDetail(action: Action, ctlr: Controller, onDeleteAction: () => void): SettingsMenuItem {
  const live = () => ctlr.actions[action.id] as Action,
    canDelete = !!action.userCreated,
    logicItems: SettingsMenuItem[] = [];
  logicItems.push(...(action.logic ?? []).map((step, i) => makeLogicStepView(step, i, action.id, ctlr, logicItems)));
  return {
    id: `actions-detail-${action.id}`,
    label: action.label ?? fmt(action.id),
    widget: "group",
    getValue: () => {
      const s = ctlr.settings.keys.shortcuts[action.id] ?? "",
        allKeys = Array.isArray(s) ? s.join(", ") : String(s),
        v = ctlr.settings.voice.commands[action.id] ?? "",
        allVoice = Array.isArray(v) && v.length > 0 ? v.join(", ") : String(v);
      return [allKeys ? `⌨️ ${allKeys}` : "", allVoice ? `🎙️ ${allVoice}` : ""].filter(Boolean).join(" · ") || "None";
    },
    configPaths: [`actions.${action.id}` as any, `settings.keys.shortcuts.${action.id}` as any],
    actions: canDelete
      ? [
          {
            id: "delete",
            getLabel: () => "Delete",
            icon: "delete",
            onClick: async () => {
              if (!(await confirmDelete(live().label ?? fmt(action.id), ctlr))) return;
              delete ctlr.actions[action.id], onDeleteAction(), ctlr.plug("settings.settingsView")?.menu.goBack();
            },
          },
        ]
      : undefined,
    items: makeActionContent(action, ctlr, logicItems),
  };
}

function makeActionForm(ctlr: Controller, onAdd: () => void): SettingsMenuItem {
  return {
    id: "actions-add",
    label: "Create Action",
    widget: "input",
    hidden: true,
    inputs: [
      { label: "Label", type: "text", placeholder: "My Custom Action", required: true, helperText: { info: "Give it a name. The ID is auto-generated from it." } },
      { label: "Keyboard Shortcut", type: "text", placeholder: "f, Shift+f", helperText: { info: "Optional, you can add or change this later." } },
      { label: "Voice Triggers", type: "text", placeholder: "play, start playing", helperText: { info: "Optional, you can add or change this later. After creating, go add logic steps." } },
    ],
    getValue: () => "",
    onChange: (vals: Record<string, string>) => {
      const label = vals["Label"].trim(),
        id = toId(label);
      if (!id || ctlr.actions[id]) return;
      const triggers = vals["Voice Triggers"]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        keys = vals["Keyboard Shortcut"]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      ctlr.registerAction(id, { label, fn: () => {}, logic: [], userCreated: true });
      const voiceObj = ctlr.settings.voice.commands,
        keysObj = ctlr.settings.keys.shortcuts;
      if (voiceObj && triggers.length) voiceObj[id] = triggers;
      if (keysObj && keys.length) keysObj[id] = keys.length > 1 ? keys : keys[0];
      onAdd(), ctlr.plug("settings.settingsView")?.menu.goBack(), requestAnimationFrame(() => ctlr.plug("settings.settingsView")?.menu.goTo(`actions-detail-${id}`), ctlr.signal);
    },
  };
}

export const getSettingsActionsMenu = (ctlr: Controller): SettingsMenuItem => {
  const visibleActions = () => (Object.values(ctlr.actions) as Action[]).filter((a) => !a.private).sort((a, b) => (a.label ?? a.id).localeCompare(b.label ?? b.id)),
    actionItems: SettingsMenuItem[] = [],
    rebuildActionItems = () => actionItems.splice(0, actionItems.length, addForm, ...visibleActions().map((a) => makeActionDetail(a, ctlr, rebuildActionItems))),
    addForm = makeActionForm(ctlr, rebuildActionItems);
  let lastSig = "";
  const getSig = () =>
    visibleActions()
      .map((a) => a.id + (a.label ?? ""))
      .join(",");
  rebuildActionItems();
  lastSig = getSig();
  return {
    id: "general",
    label: "General",
    icon: "settings",
    widget: "group",
    getValue: () => "",
    items: [
      {
        id: "actions",
        label: "Actions",
        widget: "group",
        getValue: () => {
          const all = visibleActions(),
            user = all.filter((a) => a.userCreated).length;
          return user ? `${all.length} (${user} custom)` : String(all.length);
        },
        tipHTML: "Actions are player-wide commands. Use + to create your own, pair them with keyboard shortcuts, voice triggers, or chain logic steps.",
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
    "settings.actions": typeof getSettingsActionsMenu;
  }
}
