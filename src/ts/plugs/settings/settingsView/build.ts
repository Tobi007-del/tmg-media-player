import { DeepPartial } from "sia-reactor";
import { SettingsViewConfig } from "./types";

export const SETTINGS_BUILD: DeepPartial<SettingsViewConfig> = {
  autoPause: true,
  menu: {
    disabled: false,
    showView: true,
    viewLabel: "See More",
    blacklist: [],
  },
};
