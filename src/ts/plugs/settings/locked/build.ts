import { IS_MOBILE } from "@utils/env";
import { LockedConfig } from "./types";

export const LOCKED_BUILD: Partial<LockedConfig> = {
  disabled: !IS_MOBILE,
};
