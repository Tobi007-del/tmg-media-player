import { BasePlug } from "../../base";
import { ERRORS_BUILD } from "./build";
import type { ErrorsConfig } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { silence } from "sia-reactor/modules";
import { TechConstructor } from "@techs/base";
import { Controller } from "@core/controller";
import { ErrorPlaceholder } from "@components/holders/errorPlaceholder";
import { ComponentRegistry } from "@core/registries";

export class ErrorsPlug extends BasePlug<ErrorsConfig> {
  public static readonly plugName = "errors";
  public static readonly BUILD = ERRORS_BUILD;
  protected placeholder: ErrorPlaceholder | null = null;

  constructor(ctlr: Controller, config = ctlr.config.settings.errors) {
    super(ctlr, config, { message: "" });
  }

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("status.error", this.handleErrorStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.learn("reload", { fn: this.reloadTech }, this.signal), super.wire();
  }

  protected async handleErrorStatus({ value }: REvent<CtlrMedia, "status.error">): Promise<void> {
    if (!value) return (this.state.code = this.state.message = null), this.ctlr.plug("disabled")?.reactivate();
    this.ctlr.log(value, "error"); // no `.notice` since that's our job, no "swallow" since we breaking the player anyways
    let { code = 5, message = "" } = value;
    code = this.state.code = code > 5 ? (!message.includes(`${code}`) || this.config[code] ? code : 5) : code;
    message = this.state.message = this.config[code]?.replace(/media/g, this.media.type) || message || "";
    this.placeholder ??= ComponentRegistry.init("errorPlaceholder", this.ctlr);
    if (this.ctlr.state.readyState < 3) return this.ctlr.plug("disabled")?.deactivate(); // #PATIENT: only after first play
    const id = `${this.ctlr.config.id}-error-dialog`;
    if (!t007.dialog?.isActive(id)) (await t007.confirm?.(message, { id, rootElement: this.ctlr.DOM.containerContent, confirmText: "Try Again", cancelText: "Dismiss" })) ? this.reloadTech() : this.ctlr.plug("disabled")?.deactivate();
  }

  public reloadTech(): void {
    const time = this.media.state.currentTime;
    this.ctlr.useTech(this.media.tech.constructor as TechConstructor, true), silence(() => ((this.media.intent.currentTime = time), (this.media.intent.paused = false)));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.errors": typeof ErrorsPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    errors: ErrorsConfig;
  }
}
