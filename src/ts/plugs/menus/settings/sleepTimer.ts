import type { SleepTimerPlug } from "@plugs/settings/sleepTimer";
import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { formatUITime } from "@utils/time";

export const getSettingsSleepTimerMenu = (plug: SleepTimerPlug): SettingsMenuItem => ({
  id: "sleepTimer",
  label: "Sleep timer",
  icon: "timer",
  widget: "select",
  getValue: () => (plug.state.ms === -1 ? `End of ${plug.media.type}` : formatUITime(plug.state.ms || false, true, false)),
  getOptions: () => [
    { display: "Off", value: 0 },
    { display: "10 minutes", value: 10 * 60 * 1000 },
    { display: "15 minutes", value: 15 * 60 * 1000 },
    { display: "20 minutes", value: 20 * 60 * 1000 },
    { display: "30 minutes", value: 30 * 60 * 1000 },
    { display: "45 minutes", value: 45 * 60 * 1000 },
    { display: "1 hour", value: 60 * 60 * 1000 },
    { display: `End of ${plug.media.type}`, value: -1, infoText: formatUITime((plug.media.status.duration - plug.media.state.currentTime) * 1000, true, false) },
  ],
  onChange: (value: number | string) => plug.setTimer(Number(value)),
  onWire: (syncUI, signal) => plug.state.on("ms", syncUI, { signal }),
  mediaPaths: ["type", "state.currentTime"],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.sleepTimer": typeof getSettingsSleepTimerMenu;
  }
}
