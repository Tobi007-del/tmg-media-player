import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import type { TimeTravelPlug } from "@plugs/settings/timeTravel";
import { isArr } from "@t007/utils";
import { fpath, fvalue } from "@utils/str";

const formatEntry = (entry: any, index: number) => ({ display: `${index + 1}) ${!entry ? "Unknown" : entry.nodes ? entry.label || `Batch of ${entry.nodes.length}` : fpath(entry.rid === "media" ? `media.${entry.path}` : entry.path)}`, infoText: !entry || entry.nodes ? "" : fvalue(entry.to) });

export const getSettingsTimeTravelMenu = (plug: TimeTravelPlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "timeTravel",
      label: "Time travel",
      getBadge: () => ({ label: "beta" }),
      widget: "group",
      getValue: () => (plug.config.module.limit ? "On" : "Off"),
      configPaths: ["settings.timeTravel.module.limit"],
      getTipHTML: () => "🌌 Step through the space-time continuum. Rewind your mistakes, replay interactions.",
      actions: [{ id: "toggleConsole", getLabel: () => (plug.config.console.disabled ? "Show console" : "Hide console"), onClick: () => (plug.config.console.disabled = !plug.config.console.disabled), hidden: () => !plug.ctlr.config.devMode }],
      onWire: (syncUI, signal, _sync = () => (syncUI(), plug.ctlr.plug("settings.panel")?.menu?.syncUI("timeTravel"))) => {
        for (const k of ["devMode", "settings.timeTravel.console.disabled"]) plug.ctlr.config.on(k as any, _sync, { signal });
      },
      items: [
        {
          id: "timeTravelHistory",
          label: "History",
          widget: "select",
          closeOnSelect: false,
          getValue: () => (plug.module.state.history.length ? `(${plug.module.state.currentFrame}) of ${plug.module.state.history.length}` : "Empty"),
          getDisabled: () => false,
          getOptions() {
            const h = plug.module.state.history,
              centerIdx = Math.max(0, (plug.module.state.currentFrame ?? 0) - 1),
              startIdx = Math.max(0, centerIdx - 3); // 7's my favorite
            return h
              .slice(startIdx, Math.min(h.length, centerIdx + 4))
              .map((entry, i, _, actualIdx = startIdx + i, formatted = formatEntry(entry, actualIdx)) => ({ value: `(${actualIdx + 1}) of ${plug.module.state.history.length}`, display: formatted.display, infoText: formatted.infoText }))
              .reverse();
          },
          onChange: (val: string, match = val.match(/\((\d+)\)/)) => match && plug.module.jumpTo(Number(match[1])),
          onWire: (syncUI, signal, _tk = "tt_" + Math.random(), _sync = () => plug.ctlr.throttle(_tk, () => (syncUI(), plug.ctlr.plug("settings.panel")?.menu?.syncUI("timeTravelHistory")), 30, false, plug.signal)) => {
            for (const k of ["currentFrame", "history", "tracking", "paused"]) plug.module.state.on(k as any, _sync, { signal });
            for (const k of ["devMode", "settings.timeTravel.module.whitelist"]) plug.ctlr.config.on(k as any, _sync, { signal });
          },
          actions: [
            { id: "undo", icon: "returnBack", getLabel: () => "Undo", onClick: () => plug.module.undo(), getDisabled: () => !plug.module.canUndo },
            { id: "redo", icon: "returnBack", getLabel: () => "Redo", onClick: () => plug.module.redo(), getDisabled: () => !plug.module.canRedo },
          ],
          footerActions: [
            { id: "prune", getLabel: () => "Prune", onClick: () => plug.module.prune(), getDisabled: () => !plug.module.canRedo },
            { id: "reset", getLabel: () => "Reset", onClick: () => plug.module.reset(), getDisabled: () => !plug.module.state.history.length },
            { id: "playPause", getLabel: () => (plug.module.state.paused ? "Play" : "Pause"), onClick: () => (plug.module.state.paused ? plug.module.play() : plug.module.pause()), getDisabled: () => !plug.module.canRedo },
            { id: "rewind", getLabel: () => "Rewind", onClick: () => plug.module.rewind(), getDisabled: () => !plug.module.state.paused || !plug.module.state.currentFrame },
            {
              id: "toggleWhitelist",
              getLabel: (w = plug.config.module.whitelist as any) => ((isArr(w) ? w[0] : w?.media?.[0] || w?.[0]) === "state" ? "Intents" : "States"),
              onClick: (w = plug.config.module.whitelist as any) => {
                const isState = (isArr(w) ? w[0] : w?.media?.[0] || w?.[0]) === "state",
                  next = [isState ? "intent" : "state"];
                plug.config.module.whitelist = isArr(w) ? next : { ...w, ...(w?.media ? { media: next } : { 0: next }) };
              },
              hidden: () => !plug.ctlr.config.devMode,
            },
          ],
        },
        { id: "timeTravelPersist", label: "Persistence", widget: "toggle", getValue: () => plug.config.persist, getBadge: () => ({ label: "labs" }), onChange: (val: boolean) => (plug.config.persist = val), configPaths: ["settings.timeTravel.persist"], title: "Save your state history across page reloads" },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.timeTravel": typeof getSettingsTimeTravelMenu;
  }
}
