import { BasePlug } from "../../base";
import { TIME_TRAVEL_BUILD } from "./build";
import type { TimeTravel } from "./types";
import { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { fanout } from "sia-reactor/utils";
import { TimeTravelModule } from "sia-reactor/modules";
import { TimeTravelConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIndex } from "@tools/player";

export class TimeTravelPlug extends BasePlug<TimeTravel> {
  public static readonly plugName = "timeTravel";
  public static readonly BUILD = TIME_TRAVEL_BUILD;
  public module!: TimeTravelModule<any>;
  public overlay!: TimeTravelConsole;

  public override mount(): void {
    // Variables Assignment
    this.module = new TimeTravelModule(this.config.module);
    this.overlay = new TimeTravelConsole(this.module, { title: `TMG Controller Tape ${getCtlrIndex(this.ctlr) + 1}`, ...(this.config.overlay as Partial<TimeTravel["overlay"]>) });
    const pmdle = this.ctlr.plug("settings.persist")?.module;
    // Utility Injection
    pmdle?.attach(this.module.state, "timeTravel.state");
    this.media.use(this.module), pmdle && !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
  }

  public override wire(): void {
    // Ctlr Config Watchers
    this.ctlr.config.watch("settings.css.brandColor", (v) => (this.overlay.config.color = v as string), { init: true, signal: this.signal });
    // ---------- Listeners
    this.ctlr.config.on("settings.timeTravel.module", this.handleModule, { signal: this.signal, init: false, depth: 1 });
    this.ctlr.config.on("settings.timeTravel.overlay", this.handleOverlay, { signal: this.signal, init: false, depth: 1 });
  }

  protected handleModule(e: REvent<CtlrConfig, "settings.timeTravel.module", 1>): void {
    e.type === "update" ? (this.module.config[e.target.key] = e.value as never) : fanout(this.module.config, e.value); // plugin's config is non-volatile
  }
  protected handleOverlay(e: REvent<CtlrConfig, "settings.timeTravel.overlay", 1>): void {
    e.type === "update" ? (this.overlay.config[e.target.key] = e.value as never) : fanout(this.overlay.config, e.value); // plugin's config is non-volatile
  }

  protected override onDestroy(): void {
    this.overlay.destroy(), this.module.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.timeTravel": typeof TimeTravelPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    timeTravel: TimeTravel;
  }
}
