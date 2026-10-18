import { DeepPartial } from "sia-reactor";
import { PanelConfig } from "./types";
import { ZENLIST } from "@consts/config";
import { OVERLAY_WHITELIST } from "@plugs/settings/overlay/build";

export const SETTINGS_BUILD: DeepPartial<PanelConfig> = {
  autoPause: true,
  menu: {
    disabled: false,
    showMore: true,
    blacklist: [],
  },
};

ZENLIST.push("moreSettings");
OVERLAY_WHITELIST.push("moreSettings", "menuSettings");

export let MENU_FOCUS_SELECTOR = ":is([tabindex='0'], button, input:not([type='checkbox'], [type='radio'])):not(.tmg-media-smenu-back-btn, .tmg-media-range-container)";
