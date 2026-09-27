import type { SleepTimerPlug } from "@plugs/settings/sleepTimer";
import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import { formatUITime } from "@utils/time";
import { globalState } from "@tools/runtime";
import { safeNum } from "@utils/num";

const getRem = (c: SleepTimerPlug["config"]) => formatUITime(!c.ms ? false : Math.max(0, c.target ? c.target - Date.now() : c.ms), false, false),
  getMins = (m: number, v = m >= 60 ? m / 60 : m) => `${v} ${m >= 60 ? "hour" : "minute"}${v === 1 ? "" : "s"}`;

export const getSettingsSleepTimerMenu = (plug: SleepTimerPlug): SettingsMenuItem => ({
  id: "sleepTimer",
  label: "Sleep timer",
  icon: "timer",
  widget: "select",
  feature: "sleepTimer",
  getValue: () => (plug.config.ms === -1 ? `End of ${plug.media.type}` : getRem(plug.config)),
  getOptions: () => [
    { display: "Off", value: 0 },
    ...plug.config.minutes.map((m, _, __, ms = m * 60 * 1000, active = plug.config.ms === ms, rem = active ? Math.max(0, plug.config.target ? plug.config.target - Date.now() : ms) : 0) => ({
      display: active ? getRem(plug.config) : getMins(m),
      value: ms,
      infoText: active ? getMins(m) : undefined,
      progress: active ? Math.round(((ms - rem) / ms) * 100) : 0,
    })),
    {
      display: `End of ${plug.media.type}`,
      value: -1,
      infoText: formatUITime(Math.max(0, plug.media.status.duration - plug.media.state.currentTime) * 1000, false, false),
      progress: plug.config.ms === -1 && plug.media.status.duration ? Math.round((plug.media.state.currentTime / plug.media.status.duration) * 100) : 0,
    },
  ],
  onChange: (value: number) => (plug.config.ms = value),
  configPaths: ["settings.sleepTimer.ms"],
  mediaPaths: ["type", "state.currentTime"],
  onWire: (syncUI, signal) => globalState.on("clock", () => safeNum(plug.config.ms) > 0 && syncUI(), { signal }),
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.sleepTimer": typeof getSettingsSleepTimerMenu;
  }
}
