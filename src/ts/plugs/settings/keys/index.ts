import { BasePlug } from "../../base";
import type { KeyHandler, KeyMod, KeyPhase, KeyRegOptions, Keys, KeyHook, KeyShortcutMods } from "./types";
import { KEYS_BUILD } from "./build";
import { isArr } from "@t007/utils";
import { keyEventAllowed as allowed } from "@utils/keys";

export class KeysPlug extends BasePlug<Keys> {
  public static readonly plugName = "keys";
  public static readonly BUILD = KEYS_BUILD;
  protected readonly handlers: Record<KeyPhase, Record<string, KeyHook>> = { keydown: {}, keyup: {} };
  protected playTriggerSeq = 0;

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.keys.disabled", this.syncEventListeners, { init: true, signal: this.signal });
    this.ctlr.config.on("disabled", this.syncEventListeners, { signal: this.signal });
    this.ctlr.config.on("settings.locked.disabled", this.syncEventListeners, { signal: this.signal });
    // ---- State --------
    !this.ctlr.payload.wired && this.ctlr.state.wonce("readyState", this.syncEventListeners, { signal: this.signal });
    this.ctlr.state.on("mediaIntersecting", this.syncEventListeners, { signal: this.signal });
    // Post Wiring
    this.register(" ", this.handlePlayTriggerDown, { phase: "keydown" });
    this.register("escape", this.handleEscape, { phase: "keydown" });
    this.register("arrowleft", this.handleArrowLeft, { phase: "keydown" });
    this.register("arrowright", this.handleArrowRight, { phase: "keydown" });
    this.register("arrowup", this.handleArrowUp, { phase: "keydown" });
    this.register("arrowdown", this.handleArrowDown, { phase: "keydown" });
    this.register("home", () => (this.media.intent.currentTime = 0), { phase: "keyup" });
    this.register("0", () => (this.media.intent.currentTime = 0), { phase: "keyup" });
    this.register("end", () => (this.media.intent.currentTime = this.media.status.duration), { phase: "keyup" });
    "123456789".split("").forEach((n) => this.register(n, () => (this.media.intent.currentTime = (+n / 10) * this.media.status.duration), { phase: "keyup" }));
    this.register("playpause", this.handlePlayTriggerDown, { phase: "keydown" });
  }

  public register(action: string, handler: KeyHandler, options: KeyRegOptions = {}): void {
    for (const phase of options.phase ? (isArr(options.phase) ? options.phase : [options.phase]) : ["keyup"]) this.handlers[phase as KeyPhase][action] = { fn: handler, zen: !!options.zen };
    if (options.shortcut && ((this.config.shortcuts as any)[action] == null || options.overwrite)) (this.config.shortcuts as any)[action] = options.shortcut;
  }

  public unregister(action: string, phase?: KeyPhase): void {
    if (phase) return void delete this.handlers[phase][action];
    delete this.handlers.keydown[action], delete this.handlers.keyup[action];
  }

  protected handleKeyDown(e: KeyboardEvent, action = allowed(e, this.ctlr.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return;
    action && this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.throttle("keyDown", () => this.handlers.keydown[action]?.fn(e, mod), 30);
  }

  protected handleKeyUp(e: KeyboardEvent, zen = false, action = allowed(e, this.ctlr.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return;
    action && this.ctlr.plug("settings.overlay")?.show();
    const hook = this.handlers.keyup[action];
    hook && (!zen || hook.zen) && hook.fn(e, mod);
  }
  protected handleZenKeyUp(e: KeyboardEvent): void {
    this.handleKeyUp(e, true);
  }

  protected handlePlayTriggerDown(e: KeyboardEvent): void {
    this.playTriggerSeq++;
    this.playTriggerSeq === 1 && (e.currentTarget as Window | null)?.addEventListener("keyup", this.handlePlayTriggerUp, { signal: this.signal });
    this.playTriggerSeq === 2 && this.ctlr.settings.fastPlay.key && this.ctlr.plug("settings.fastPlay")?.fastPlay(e.shiftKey ? "backwards" : "forwards");
  }

  protected handlePlayTriggerUp(e: KeyboardEvent, action = allowed(e, this.ctlr.settings.keys)): void {
    action && this.ctlr.plug("settings.overlay")?.show();
    if (action !== false && [" ", "playpause"].includes(action)) {
      e.stopImmediatePropagation();
      if (this.playTriggerSeq === 1) this.media.intent.paused = !this.media.state.paused;
      this.ctlr.plug("settings.notifiers")?.notify(this.media.state.paused ? "mediapause" : "mediaplay");
    }
    if (this.playTriggerSeq > 1 && this.ctlr.plug("settings.fastPlay")?.speedCheck) this.ctlr.plug("settings.fastPlay")?.slowDown();
    this.playTriggerSeq = 0;
    (e.currentTarget as Window | null)?.removeEventListener("keyup", this.handlePlayTriggerUp);
  }

  protected handleEscape(): void {
    this.ctlr.isUIActive("miniplayer") && (this.media.intent.miniplayer = false);
    (this.ctlr.isUIActive("pictureInPicture") || this.ctlr.isUIActive("floatingPlayer")) && (this.media.intent.pictureInPicture = false);
  }

  protected handleArrowLeft(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.deactivateSkipPersist();
    this.ctlr.plug("settings.time")?.skip(-this.getModded("skip", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify("bwd");
  }
  protected handleArrowRight(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.deactivateSkipPersist();
    this.ctlr.plug("settings.time")?.skip(this.getModded("skip", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify("fwd");
  }
  protected handleArrowUp(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.volume")?.changeAptValue(this.getModded("volume", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify("volumeup");
  }
  protected handleArrowDown(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.volume")?.changeAptValue(-this.getModded("volume", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify(!this.media.state.volume ? "volumemuted" : "volumedown");
  }

  public setEventListeners(action: "add" | "remove" = "add", zen = this.ctlr.isUIActive("settings")): void {
    const ws = this.getWindows();
    ws.forEach((w) => (w.removeEventListener("keydown", this.handleKeyDown), w.removeEventListener("keyup", this.handleKeyUp), w.removeEventListener("keyup", this.handleZenKeyUp)));
    if (action === "remove" || !this.shouldListen()) return;
    !zen && ws.forEach((w) => w.addEventListener("keydown", this.handleKeyDown, { signal: this.signal }));
    ws.forEach((w) => w.addEventListener("keyup", !zen ? this.handleKeyUp : this.handleZenKeyUp, { signal: this.signal }));
  }
  public syncEventListeners(): void {
    this.setEventListeners(this.shouldListen() ? "add" : "remove");
  }
  protected shouldListen(): boolean {
    return this.ctlr.payload.wired && this.ctlr.state.mediaIntersecting && !this.ctlr.config.disabled && !this.config.disabled && this.ctlr.settings.locked.disabled;
  }

  protected getWindows(): Window[] {
    const floating = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
    return floating ? [floating, window] : [window];
  }
  protected getMod(e: KeyboardEvent): KeyMod {
    return this.config.mods.disabled ? "" : e.ctrlKey ? "ctrl" : e.altKey ? "alt" : e.shiftKey ? "shift" : "";
  }
  public getModded(action: keyof KeyShortcutMods, mod: KeyMod, base: number): number {
    return mod ? this.config.mods[action]?.[mod] ?? base : base;
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
    keys: Keys;
  }
}
