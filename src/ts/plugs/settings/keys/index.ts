import { BasePlug } from "../../base";
import type { KeyMod, KeyPhase, KeysConfig, KeyMods } from "./types";
import { KEYS_BUILD } from "./build";
import { keyEventAllowed as allowed } from "@utils/keys";

export class KeysPlug extends BasePlug<KeysConfig> {
  public static readonly plugName = "keys";
  public static readonly BUILD = KEYS_BUILD;
  public playKeySeq = 0;

  public override wire(): void {
    // Ctlr Media Listeners
    this.ctlr.media.on("state.locked", this.syncListeners, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaIntersecting", this.syncListeners, { signal: this.signal });
    // ---- Config --------
    for (const p of ["disabled", "settings.keys.disabled"] as const) this.ctlr.config.on(p, this.syncListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.flags.wired ? this.syncListeners() : this.ctlr.state.wonce("readyState", this.syncListeners, { signal: this.signal }); // #HEAVY: waits for !light
    this.ctlr.learn("playPause", { fn: this.handlePlayKeyDown, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn(" ", { fn: this.handlePlayKeyDown, keyboard: { phase: "keydown" }, system: true, label: "Playback: Play or Pause" }, this.signal);
    this.ctlr.learn("arrowleft", { fn: this.handleArrowLeft, keyboard: { phase: "keydown" }, notify: "bwd", system: true, label: "Time: Skip backward" }, this.signal);
    this.ctlr.learn("arrowright", { fn: this.handleArrowRight, keyboard: { phase: "keydown" }, notify: "fwd", system: true, label: "Time: Skip forward" }, this.signal);
    super.wire();
  }

  protected handleKeyDown(e: KeyboardEvent, action = allowed(e, this.config)): void {
    action !== false && this.ctlr.throttle("keyDown", () => (this.config.showOverlay && this.ctlr.plug("settings.overlay")?.show(), this.ctlr.perform(this.getHook("keydown", action), e, this.getMod(e))), 30);
  }
  protected handleKeyUp(e: KeyboardEvent, action = allowed(e, this.config)): void {
    if (action !== false) this.config.showOverlay && this.ctlr.plug("settings.overlay")?.show(), this.ctlr.perform(this.getHook("keyup", action), e, this.getMod(e));
  }

  protected handlePlayKeyDown(e?: KeyboardEvent | MouseEvent): void {
    if (!e || e.type !== "keydown") return void ((this.media.intent.paused = !this.media.state.paused), this.ctlr.notify?.(this.media.intent.paused ? "mediaPause" : "mediaPlay"));
    this.playKeySeq++;
    this.playKeySeq === 1 && (e.currentTarget as Window)?.addEventListener("keyup", this.handlePlayKeyUp, { signal: this.signal });
    this.playKeySeq === 2 && this.settings.fastPlay.key && this.ctlr.plug("settings.fastPlay")?.speedUp(e.shiftKey ? "backwards" : "forwards");
  }

  protected handlePlayKeyUp(e: KeyboardEvent, action = allowed(e, this.config)): void {
    action && this.config.showOverlay && this.ctlr.plug("settings.overlay")?.show();
    if (action !== false && /^( |playPause)$/.test(action)) e.stopImmediatePropagation(), this.playKeySeq === 1 && this.handlePlayKeyDown();
    const fastPlug = this.ctlr.plug("settings.fastPlay");
    if (this.playKeySeq > 1 && fastPlug?.state.active && !fastPlug.state.ptrActive) fastPlug.slowDown();
    (this.playKeySeq = 0), (e.currentTarget as Window)?.removeEventListener("keyup", this.handlePlayKeyUp);
  }

  protected handleArrowLeft(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.ctlr.plug("settings.time")?.skip(-this.getModded("timeSkip", mod, 5));
  }
  protected handleArrowRight(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.ctlr.plug("settings.time")?.skip(this.getModded("timeSkip", mod, 5));
  }

  public setListeners(action: "add" | "remove" = "add", windows = this.getWindows()): void {
    for (const w of windows) w.removeEventListener("keydown", this.handleKeyDown), w.removeEventListener("keyup", this.handleKeyUp);
    if (action === "remove" || !this.shouldListen()) return;
    for (const w of windows) w.addEventListener("keydown", this.handleKeyDown, { signal: this.signal }), w.addEventListener("keyup", this.handleKeyUp, { signal: this.signal });
  }
  public syncListeners(): void {
    this.setListeners(this.shouldListen() ? "add" : "remove");
  }
  protected shouldListen(): boolean {
    return this.ctlr.flags.wired && this.ctlr.state.mediaIntersecting && !this.ctlr.config.disabled && !this.config.disabled && !this.media.state.locked;
  }

  protected getHook(phase: KeyPhase = this.config.phase.value, action: string, entry = this.ctlr.actions.entries[action]): string | undefined {
    return (entry?.keyboard?.phase || this.config.phase.value) === phase ? action : undefined;
  }
  public getMod(e: KeyboardEvent): KeyMod {
    return this.config.mods.disabled ? "" : e.ctrlKey || e.metaKey ? "ctrl" : e.altKey ? "alt" : e.shiftKey ? "shift" : "";
  }
  public getModded(action: keyof KeyMods, mod: KeyMod, base: number): number {
    return mod ? this.config.mods[action]?.[mod] ?? base : base;
  }
  public getWindows(): Window[] {
    const floater = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
    return floater ? [window, floater] : [window];
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.keys": typeof KeysPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    keys: KeysConfig;
  }
}
