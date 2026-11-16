import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { TemporalPlug } from "@plugs/settings/temporal";
import { isArr } from "@t007/utils";
import { fpath, fvalue } from "@utils/str";
import type { Controller } from "@core/controller";
import type { MediaFeatures } from "@defs/contract";
import type { TemporalModule } from "sia-reactor/modules";

const formatEntry = (entry: any, index: number) => ({ display: `${index + 1}) ${!entry ? "Unknown" : entry.nodes ? entry.label || `Batch of ${entry.nodes.length}` : fpath(entry.rid === "media" ? `media.${entry.path}` : entry.path)}`, infoText: !entry || entry.nodes ? "" : fvalue(entry.to) });

export interface TemporalHistoryMenuOptions {
  id?: string;
  label?: string;
  feature?: keyof MediaFeatures;
  signal?: AbortSignal;
  getBadge?: () => { label?: string; value?: string } | string | undefined;
}

export const getTemporalHistoryMenu = (ctlr: Controller, mdle: TemporalModule<any>, options: TemporalHistoryMenuOptions = {}): SettingsMenuItem => {
  const { id = "temporalHistory", label = "History", feature, signal = ctlr.signal, getBadge } = options;
  return {
    id,
    label,
    ...(feature ? { feature } : {}),
    ...(getBadge ? { getBadge } : {}),
    widget: "select",
    closeOnSelect: false,
    getValue: () => (mdle.state.history.length ? `(${mdle.state.currentFrame}) of ${mdle.state.history.length}` : "Empty"),
    getDisabled: () => false,
    getOptions() {
      const h = mdle.state.history,
        centerIdx = Math.max(0, (mdle.state.currentFrame ?? 0) - 1),
        startIdx = Math.max(0, centerIdx - 3); // 7's my favorite
      return h
        .slice(startIdx, Math.min(h.length, centerIdx + 4))
        .map((entry, i, _, actualIdx = startIdx + i, formatted = formatEntry(entry, actualIdx)) => ({ value: `(${actualIdx + 1}) of ${mdle.state.history.length}`, display: formatted.display, infoText: formatted.infoText }))
        .reverse();
    },
    onChange: (val: string, match = val.match(/\((\d+)\)/)) => match && mdle.jumpTo(Number(match[1])),
    onWire: (syncUI, sig, _tk = `tt_${id}_${Math.random()}`, _sync = () => ctlr.throttle(_tk, () => (syncUI(), ctlr.plug("settings.panel")?.menu?.syncUI(id)), 30, false, sig || signal)) => {
      for (const k of ["currentFrame", "history", "tracking", "paused"]) mdle.state.on(k as any, _sync, { signal: sig || signal });
      ctlr.config.on("devMode", _sync, { signal: sig || signal }), mdle.config.on("whitelist", _sync, { signal: sig || signal });
    },
    actions: [
      { id: "undo", icon: "returnBack", getLabel: () => "Undo", onClick: mdle.undo, getDisabled: () => !mdle.canUndo },
      { id: "redo", icon: "returnBack", getLabel: () => "Redo", onClick: mdle.redo, getDisabled: () => !mdle.canRedo },
    ],
    footerActions: [
      { id: "prune", getLabel: () => "Prune", onClick: mdle.prune, getDisabled: () => !mdle.canRedo },
      { id: "reset", getLabel: () => "Reset", onClick: mdle.reset, getDisabled: () => !mdle.state.history.length },
      { id: "playPause", getLabel: () => (mdle.state.paused ? "Play" : "Pause"), onClick: () => (mdle.state.paused ? mdle.play() : mdle.pause()), getDisabled: () => !mdle.canRedo },
      { id: "rewind", getLabel: () => "Rewind", onClick: mdle.rewind, getDisabled: () => !mdle.state.paused || !mdle.state.currentFrame },
      {
        id: "toggleWhitelist",
        getLabel: (w = mdle.config.whitelist as any) => ((isArr(w) ? w[0] : w?.media?.[0] || w?.[0]) === "state" ? "Intents" : "States"),
        onClick: (w = mdle.config.whitelist as any) => {
          const isState = (isArr(w) ? w[0] : w?.media?.[0] || w?.[0]) === "state",
            next = [isState ? "intent" : "state"];
          mdle.config.whitelist = isArr(w) ? next : { ...w, ...(w?.media ? { media: next } : { 0: next }) };
        },
        hidden: () => !ctlr.config.devMode,
      },
    ],
  };
};

export const getSettingsTemporalMenu = (plug: TemporalPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "temporal",
      label: "Time travel",
      getBadge: () => ({ label: "beta" }),
      widget: "group",
      getValue: () => (plug.config.module.limit ? "On" : "Off"),
      configPaths: ["settings.temporal.module.limit"],
      getTipHTML: () => "🌌 Step through the space-time continuum. Rewind your mistakes, replay interactions.",
      actions: [{ id: "toggleConsole", getLabel: () => (plug.config.console.disabled ? "Show console" : "Hide console"), onClick: () => (plug.config.console.disabled = !plug.config.console.disabled), hidden: () => !plug.ctlr.config.devMode }],
      onWire: (syncUI, signal, _sync = () => (syncUI(), plug.ctlr.plug("settings.panel")?.menu?.syncUI("temporal"))) => {
        for (const k of ["devMode", "settings.temporal.console.disabled"]) plug.ctlr.config.on(k as any, _sync, { signal });
      },
      items: [{ id: "temporalPersist", label: "Persistence", widget: "toggle", getValue: () => plug.config.persist, getBadge: () => ({ label: "labs" }), onChange: (val: boolean) => (plug.config.persist = val), configPaths: ["settings.temporal.persist"], title: "Save your state history across page reloads" }, getTemporalHistoryMenu(plug.ctlr, plug.module, { id: "temporalHistory", label: "History", signal: plug.signal })],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.temporal": typeof getSettingsTemporalMenu;
  }
}
