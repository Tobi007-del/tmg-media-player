import { BasePlug } from "../../base";
import { TIME_TRAVEL_BUILD } from "./build";
import type { TimeTravelConfig } from "./types";
import { createReactorSync, fanout } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule } from "sia-reactor/modules";
import { TimeTravelConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIdx } from "@tools/player";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";

export class TimeTravelPlug extends BasePlug<TimeTravelConfig> {
  public static readonly plugName = "timeTravel";
  public static readonly BUILD = TIME_TRAVEL_BUILD;
  public module!: TimeTravelModule<any>;
  public console?: TimeTravelConsole | undefined;

  public override mount(): void {
    // Variables Assignment
    this.module = new TimeTravelModule({ beforeEntry: createTxPathMerger(), ...this.config.module });
    const pmdle = this.ctlr.plug("settings.persist")?.module;
    // Utility Injection
    pmdle?.attach(this.module.state, "timeTravel.state");
    this.media.use(this.module), pmdle && !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
  }

  public override wire(): void {
    // ---- Media Listeners
    this.media.on("state.fullscreen", ({ value }) => this.console && !this.ctlr._build.settings.timeTravel.console.container && (this.console.config.container = value ? this.media.container : undefined), { signal: this.signal }); // if dev didn't hardcode
    // ----------- Listeners
    createReactorSync(this.module.config, this.ctlr.config, "", "settings.timeTravel.module", this.signal);
    this.ctlr.config.on("settings.timeTravel.console.disabled", this.handleConsoleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.persist", this.handlePersist, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.console", (e) => this.console && fanout(this.console.config, e.currentTarget.value), { signal: this.signal }); // #FLEX: needs no standard stress
    this.ctlr.config.on("settings.css.brandColor", ({ value }) => this.console && (this.console.config.color = value as string), { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("timeTravelUndo", { fn: () => this.module.undo() }), this.ctlr.registerAction("timeTravelRedo", { fn: () => this.module.redo() });
    super.wire();
  }

  protected handleConsoleDisabled(e: REvent<CtlrConfig, "settings.timeTravel.console.disabled">): void {
    if (e.value) this.console?.destroy(), (this.console = undefined);
    else this.console ||= new TimeTravelConsole(this.module, { title: `TMG Controller ${getCtlrIdx(this.ctlr) + 1} Tape`, color: this.ctlr.config.settings.css.brandColor as string, container: this.media.state.fullscreen ? this.media.container : undefined, ...(this.config.console as Partial<TimeTravelConfig["console"]>) });
  }

  protected handlePersist(e: REvent<CtlrConfig, "settings.timeTravel.persist">, pmdle = this.ctlr.plug("settings.persist")?.module): void {
    if (pmdle?.config) Array.isArray(pmdle.config.whitelist) ? (pmdle.config.whitelist = { "0": pmdle.config.whitelist } as any) : !pmdle.config.whitelist && (pmdle.config.whitelist = {} as any);
    if (pmdle?.config) (pmdle.config.whitelist as Record<string, string[]>)["timeTravel.state"] = e.value ? ["*"] : [];
  }

  protected override onDestroy(): void {
    this.console?.destroy(), this.module.destroy(), super.onDestroy();
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
    timeTravel: TimeTravelConfig;
  }
}
