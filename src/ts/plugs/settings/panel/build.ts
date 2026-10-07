import { DeepPartial } from "sia-reactor";
import { PanelConfig } from "./types";

export const SETTINGS_BUILD: DeepPartial<PanelConfig> = {
  autoPause: true,
  menu: {
    disabled: false,
    showMore: true,
    blacklist: [],
  },
};

export let MENU_FOCUS_SELECTOR = ":is([tabindex='0'], button, input:not([type='checkbox'], [type='radio'])):not(.tmg-media-smenu-back-btn, .tmg-media-range-container)";
