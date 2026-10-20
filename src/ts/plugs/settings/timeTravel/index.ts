import { BasePlug } from "../../base";
import { TIME_TRAVEL_BUILD, TIME_TRAVEL_DOCKLIST } from "./build";
import type { TimeTravelConfig } from "./types";
import { createReactorSync, fanout } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule } from "sia-reactor/modules";
import { TimeTravelConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIdx } from "@tools/player";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";
import { isArr } from "@utils/obj";
import { IconRegistry } from "@core/registries";
import { limited } from "@utils/fn";
import { luid } from "@utils/str";
import { tutorialOpts } from "../toasts";
import { IS_MOBILE } from "@utils/env";

export class TimeTravelPlug extends BasePlug<TimeTravelConfig> {
  public static readonly plugName = "timeTravel";
  public static readonly BUILD = TIME_TRAVEL_BUILD;
  public module!: TimeTravelModule<any>;
  public console?: TimeTravelConsole | undefined;
  public docklist = TIME_TRAVEL_DOCKLIST;
  public teachBasics = limited(() => this.ctlr.toast?.(`Undo your actions ${!IS_MOBILE && this.teachBasics.left > 3 ? "with <b>Ctrl</b>+<b>Z</b>" : "in settings"}`, { ...tutorialOpts(this.teachBasics.block, { [`<span title='Open history'>${IconRegistry.get("settings")}</span>`]: (_, __, menu = this.ctlr.plug("settings.panel")?.menu) => (menu?.open(), menu?.goTo("timeTravelHistory")) }), tag: "tmg-untr", signal: this.signal }), { key: `${luid()}_undo_basics`, maxTimes: 8, perSession: 2 });

  public override mount(): void {
    // Variables Assignment
    this.module = new TimeTravelModule({ beforeEntry: createTxPathMerger(), ...this.config.module });
    const pmdle = this.ctlr.plug("settings.persist")?.module;
    // Utility Injection
    pmdle?.attach(this.module.state, "timeTravel.state");
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config"), pmdle && !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
  }

  public override wire(): void {
    // Utility Injection
    createReactorSync(this.module.config, this.ctlr.config, "", "settings.timeTravel.module", this.signal);
    // Ctlr Media Listeners
    for (const p of this.docklist) this.media.on(p as any, ({ value }) => this.redock(value), { signal: this.signal }); // if dev didn't hardcode
    // ---- Config --------
    this.ctlr.config.on("settings.timeTravel.console.disabled", this.handleConsoleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.persist", this.handlePersist, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.console", (e) => this.console && fanout(this.console.config, e.currentTarget.value), { signal: this.signal }); // #FLEX: needs no standard stress
    this.ctlr.config.on("settings.css.brandColor", ({ value }) => this.console && (this.console.config.color = value as string), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("timeTravelUndo", { fn: () => this.module.undo() }, this.signal), this.ctlr.learn("timeTravelRedo", { fn: () => this.module.redo() }, this.signal);
    super.wire();
  }

  protected handleConsoleDisabled(e: REvent<CtlrConfig, "settings.timeTravel.console.disabled">): void {
    if (e.value) this.console?.destroy(), (this.console = undefined);
    else this.console ||= new TimeTravelConsole(this.module, { title: `TMG Controller ${getCtlrIdx(this.ctlr) + 1} Tape`, color: this.ctlr.settings.css.brandColor as string, container: this.media.state.fullscreen ? this.media.container : undefined, ...(this.config.console as Partial<TimeTravelConfig["console"]>) });
  }

  protected handlePersist(e: REvent<CtlrConfig, "settings.timeTravel.persist">, pmdle = this.ctlr.plug("settings.persist")?.module): void {
    if (!pmdle) return;
    isArr(pmdle.config.whitelist) ? (pmdle.config.whitelist = { "0": pmdle.config.whitelist } as any) : (pmdle.config.whitelist ||= {} as any);
    (pmdle.config.whitelist as Record<string, string[]>)["timeTravel.state"] = e.value ? ["*"] : [];
  }

  public redock(scoped = false) {
    if (this.console && !this.ctlr.build.settings.timeTravel.console.container) this.console.config.container = scoped ? this.media.container : undefined;
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
