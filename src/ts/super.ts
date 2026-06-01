export * from "@core/controllable";
export * from "@core/controller";
export * from "@core/registries";
export * from "@tools/player";
export * from "@tools/queue";
export * from "@tools/runtime";
export * as techs from "./super/techs";
export * as plugs from "./super/plugs";
export * as comps from "./super/components";
export * as consts from "./super/consts";
export * as utils from "./super/utils";

import "./init";
import * as _s from "./super";

// vite dev
import "@t007/toast/style.css";
import "@t007/dialog/style.css";
import "@t007/input/style.css";
import "sia-reactor/styles/time-travel-console.css";
import "@t007/toast";
import "@t007/dialog";
import "@t007/input";
(tmg.Player = _s.Player), (tmg.Controllers = _s.Controllers);
