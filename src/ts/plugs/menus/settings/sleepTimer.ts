import type { SleepTimerPlug } from "@plugs/settings/sleepTimer";
import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { formatMediaTime } from "@utils/time";

export const getSettingsSleepTimerMenu = (plug: SleepTimerPlug): SettingsMenuItem => {
  const getEndDisplay = () => {
    const timeLeft = plug.media.status.duration - plug.media.state.currentTime;
    return Number.isFinite(timeLeft) && timeLeft > 0 ? `End of video (${Math.floor(timeLeft / 60)} minutes)` : "End of video";
  };
  return {
    id: "sleepTimer",
    label: "Sleep timer",
    icon: "timer",
    widget: "select",
    getValue: () => (plug.state.ms ? (plug.state.ms === -1 ? getEndDisplay() : formatMediaTime({ time: plug.state.ms / 1000, format: "long" })) : "Off"),
    getOptions: () => [
      { display: "Off", value: 0 },
      { display: "10 minutes", value: 10 * 60 * 1000 },
      { display: "15 minutes", value: 15 * 60 * 1000 },
      { display: "20 minutes", value: 20 * 60 * 1000 },
      { display: "30 minutes", value: 30 * 60 * 1000 },
      { display: "45 minutes", value: 45 * 60 * 1000 },
      { display: "60 minutes", value: 60 * 60 * 1000 },
      { display: getEndDisplay(), value: -1 },
    ],
    onChange: (value: number | string) => plug.setTimer(Number(value)),
  };
};

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.sleepTimer": typeof getSettingsSleepTimerMenu;
  }
}
