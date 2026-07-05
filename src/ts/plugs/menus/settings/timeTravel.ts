import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { TimeTravelPlug } from "@plugs/settings/timeTravel";
import { capitalize, uncamelize } from "@utils/str";

const formatEntry = (entry: any, index: number) => {
  if (!entry) return { display: `(${index + 1}) Unknown`, infoText: "" };
  if (entry.nodes) return { display: `(${index + 1}) ${entry.label || `Batch (${entry.nodes.length})`}`, infoText: "" };
  const rawPath = entry.path ? String(entry.path) : "change",
    typeStr = rawPath.startsWith("state.") ? " (State)" : rawPath.startsWith("intent.") ? " (Intent)" : rawPath.startsWith("config.") ? " (Config)" : "",
    // prettier-ignore
    p = rawPath.replace(/^(intent|state|config)\./, "").split(".").pop() || rawPath;
  return { display: `(${index + 1}) ${capitalize(uncamelize(p))}${typeStr}`, infoText: entry.to != null ? String(entry.to) : "" };
};

export const getSettingsTimeTravelMenu = (plug: TimeTravelPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "timeTravel",
      label: "Time travel",
      widget: "group",
      getValue: () => (plug.module.config.limit ? "On" : "Off"),
      onWire: (syncUI, signal) => plug.module.config.on("limit", syncUI, { signal }),
      tipHTML: "🌌 Step through the space-time continuum of your player's state. Rewind mistakes, replay interactions, and witness the magic of reactive architecture firsthand.",
      items: [
        {
          id: "timeTravelHistory",
          label: "History",
          widget: "select",
          getValue: () => (plug.module.state.history.length ? `(${plug.module.state.currentFrame}) of ${plug.module.state.history.length}` : "Empty"),
          getOptions: () => {
            const h = plug.module.state.history,
              centerIdx = Math.max(0, (plug.module.state.currentFrame ?? 0) - 1),
              startIdx = Math.max(0, centerIdx - 10);
            return h
              .slice(startIdx, Math.min(h.length, centerIdx + 11))
              .map((entry, i) => {
                const actualIdx = startIdx + i,
                  formatted = formatEntry(entry, actualIdx);
                return { value: `(${actualIdx + 1}) of ${plug.module.state.history.length}`, display: formatted.display, infoText: formatted.infoText };
              })
              .reverse();
          },
          onChange: (val: string) => {
            const match = val.match(/\((\d+)\)/);
            if (match) plug.module.jumpTo(Number(match[1]));
          },
          onWire: (syncUI, signal) => {
            const tk = "tt_" + Math.random();
            for (const k of ["currentFrame", "tracking", "paused"]) plug.module.state.on(k as any, () => plug.ctlr.throttle(tk, () => (syncUI(), plug.ctlr.plug("settings.settingsView")?.menu?.syncUI("timeTravelHistory")), 30, false), { signal });
          },
          configPaths: ["settings.timeTravel.module"],
          actions: [
            {
              id: "toggleWhitelist",
              getLabel: () => {
                const w = plug.module.config.whitelist as string[] | undefined;
                return w?.[0] === "state" || w?.[0]?.[0] === "state" ? "Record Intents" : "Record States";
              },
              onClick: () => {
                const w = plug.module.config.whitelist as any,
                  isState = w?.[0] === "state" || w?.[0]?.[0] === "state";
                plug.config.module.whitelist = Array.isArray(w) ? [isState ? "intent" : "state"] : { ...w, 0: [isState ? "intent" : "state"] };
                plug.ctlr.plug("settings.settingsView")?.menu?.syncUI("timeTravelHistory");
              },
            },
          ],
          footerActions: [
            { id: "undo", getLabel: () => "Undo", onClick: () => plug.module.undo() },
            { id: "redo", getLabel: () => "Redo", onClick: () => plug.module.redo() },
            { id: "playPause", getLabel: () => (plug.module.state.paused ? "Play" : "Pause"), onClick: () => (plug.module.state.paused ? plug.module.play() : plug.module.pause()) },
            { id: "rewind", getLabel: () => "Rewind", onClick: () => plug.module.rewind() },
            { id: "toggleTrack", getLabel: () => (plug.module.state.tracking ? "Untrack" : "Track"), onClick: () => (plug.module.state.tracking ? plug.module.untrack() : plug.module.track()) },
            { id: "clear", getLabel: () => "Clear", onClick: () => plug.module.clear() },
          ],
        },
        {
          id: "timeTravelPersist",
          label: "Persist history",
          widget: "toggle",
          getValue: () => (plug.config.persist ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.persist = val),
          configPaths: ["settings.timeTravel.persist"],
          title: "Save your state history across page reloads",
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.timeTravel": typeof getSettingsTimeTravelMenu;
  }
}
