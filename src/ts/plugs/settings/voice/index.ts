import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import { force, getPath, setPath } from "sia-reactor/utils";
import { limited } from "@utils/fn";
import type { VoiceStage, VoiceConfig, VoiceState } from "./types";
import { VOICE_BUILD } from "./build";
import { capitalize, camelize, uncamelize, fuzzyBlobMatch, fuzzyChunkMatch, getLevenshteinSimilarity, luid } from "@utils/str";
import { formatActionForDisplay } from "@utils/keys";
import { type ToastOptions } from "@t007/toast";
import { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { tutorialOpts } from "../toasts";
import { Action } from "@defs/action";
import { IconRegistry } from "@core/registries";
import { isArr } from "@utils/obj";

export class VoicePlug extends BasePlug<VoiceConfig, VoiceState> {
  public static readonly plugName = "voice";
  public static readonly BUILD = VOICE_BUILD;
  protected recognition?: any;
  protected teachBasics = limited((_id?: string) => (_id = this.view?.(`Follow the guides at the ${(this.config.toasts.helper.position || "bottom-left").replace("-", " ")}. Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: `${luid()}_voice_basics`, maxTimes: 6, perSession: 2 });
  protected snublist: Array<Action["id"]> = ["voiceToggleOn", "voiceToggleOff"] as const;
  protected readonly IDS = { ROUTER: `tmg-media-voice-router-for-${this.ctlr.config.id}`, HELPER: `tmg-media-voice-helper-for-${this.ctlr.config.id}` };
  protected history: string[] = ["*"];
  protected historyIdx: number = 0;

  constructor(ctlr: Controller, config = ctlr.settings.voice) {
    super(ctlr, config, { ctx: "*", routing: false });
  }

  public override mount(): void {
    // Variables Assignment
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    Object.assign(this.recognition, { continuous: true, interimResults: true, onresult: this.onResult, onend: this.onEnd, onerror: this.onError });
  }

  public override wire(): void {
    // Event Listeners
    ["click", "click", "keydown", "mousemove", "touchmove", "wheel"].forEach((ev, i) => this.container?.addEventListener(ev, !i ? this.handleClick : i < 3 ? this.handleInput : this.stayWoke, { passive: i > 3, signal: this.signal }));
    // State Watchers
    this.state.watch("ctx", this.onCtx, { signal: this.signal });
    // ----- Listeners
    this.state.on("routing", ({ value }) => (this.media.container.classList.toggle("tmg-media-voice-routing", value), (this.config.toasts.router.autoClose = value || this.config.toasts.behavior.value === "persistent" ? false : true)), { signal: this.signal });
    // Ctlr Config Setters
    this.ctlr.config.set("settings.voice.active.value", (v) => (v === "passive" && !this.config.commands.voiceWake.length ? false : v), { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", () => this.media.tech.polyfill("voice", true), { init: true, signal: this.signal }); // falls back to tap routing
    // ---- State Listeners
    this.ctlr.state.on("mediaIntersecting", () => this.ctlr.debounce("syncingVoiceListener", this.syncListener, 500, false, this.signal), { signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.voice.active.value", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", ({ value }) => this.config.active.value && (value && this.recognition?.abort(), this.start()), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.behavior.value", ({ value }) => (this.config.toasts.router.autoClose = this.state.routing || value === "persistent" ? false : true), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.router", ({ type, value, target: { key } }) => this.view?.update(this.IDS.ROUTER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.helper", ({ type, value, target: { key } }) => this.view?.update(this.IDS.HELPER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.voiceWake", ({ value }) => !this.state.routing && (value.length ? this.config.active.value && this.start() : (this.config.active.value = false)), { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListener, { signal: this.signal });
    this.ctlr.learn("voiceWake", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("voiceSleep", undefined, this.signal);
    this.ctlr.learn("voiceQuit", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceMute", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceSubmit", { fn: () => this.submit(), voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceCtxPrevious", { fn: this.goBack, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("voiceCtxNext", { fn: this.goForward, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("voiceCtxClear", { fn: () => this.clearCtx(false) }, this.signal);
    this.ctlr.flags.wired ? this.syncListener() : this.ctlr.state.wonce("readyState", this.syncListener, { signal: this.signal }); // #HEAVY: waits for !lightState. If wake word is enabled, start the engine immediately in "sleep" mode
    super.wire();
  }

  protected onResult(e: any): void {
    this.snooze();
    let transcript = "";
    if (!this.config.muted) for (let i = e.resultIndex, len = e.results.length; i < len; ++i) transcript += e.results[i][0].transcript;
    if (`${e.resultIndex}-${(transcript = transcript.trim().toLowerCase())}` === this.prevRes) return; // Block the interim/final duplicate fire
    this.prevRes = `${e.resultIndex}-${transcript}`;
    !this.config.muted && (this.state.routing || this.config.toasts.behavior.value !== "strict") && this.view?.(transcript ? `${transcript}${!this.state.routing ? `... Say "${this.linked(this.config.commands.voiceWake[0] || "")}"!` : ""}` : this.getRouterSpeech(this.state.routing ? "Didn't catch that..." : undefined, this.state.routing ? "" : undefined), this.getRouterOptions());
    const pathInput = this.container?.querySelector<HTMLInputElement>(".tmg-media-voice-path-input");
    if (pathInput) pathInput.value = transcript.trim(); // Update the Text UI
    transcript && this.ctlr.debounce("voiceProcessing", () => this.process(transcript), 500, false, this.signal); // Process after delay
  }
  private prevRes = "";
  protected onEnd(): void {
    this.config && this.config.active.value && this.shouldListen() && this.start();
  }
  protected onError(e: any): void {
    if (e.error.endsWith("not-allowed")) this.config.muted ? this.start() : (this.config.active.value = false), this.view?.error("Microphone access revoked. Please check your settings.", { tag: "tmg-mard" });
  }

  protected handleActive({ value }: REvent<CtlrConfig, "settings.voice.active.value">): void {
    if (value === false) (this.state.routing = false), this.recognition?.abort(), Object.keys(this.IDS).forEach((k) => t007.toast?.dismiss(this.IDS[k as keyof typeof this.IDS]));
    else if (this.shouldListen()) value === "passive" ? this.sleep() : this.wakeUp(), this.start();
  }
  public syncListener(): void {
    if (!this.shouldListen()) (this.state.routing = false), this.recognition?.abort(), Object.keys(this.IDS).forEach((k) => t007.toast?.dismiss(this.IDS[k as keyof typeof this.IDS]));
    else if (this.config.active.value) this.config.active.value === true && this.wakeUp(), this.start();
  }
  protected shouldListen(): boolean {
    return this.ctlr.flags.wired && (this.ctlr.state.mediaIntersecting || this.config.muted) && !this.ctlr.config.disabled;
  }

  protected async request(): Promise<"granted" | "denied" | "cancelled"> {
    const state = (await navigator.permissions?.query({ name: "microphone" }).catch(() => null))?.state ?? "prompt";
    if (state === "granted" || state === "denied") return state;
    // prettier-ignore
    return t007.toast?.dismiss(this.IDS.HELPER), new Promise((res, _, req?: () => void, i = 0) => ((req = () => this.view?.info("Voice control requires mic access", { id: this.IDS.ROUTER,...this.config.toasts.router, autoClose: false,  actions: { OK: () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => (s.getTracks().forEach((t) => t.stop()), res("granted"))).catch(async (e) => (await navigator.permissions?.query({ name: "microphone" as any }).then(p => p?.state === "denied", () => e.message === "Permission denied")) || ++i > 3 ? res("cancelled") : this.view?.warn("Grant permission to use microphone", { id: this.IDS.ROUTER, autoClose: false, actions: { Retry: req! } })), ...this.getRouterActions() }, onClose: () => res("cancelled") }) || res("cancelled"))())); // #EXTRA-MILE: doing the most with the least
  }
  public async start(): Promise<void> {
    let state = this.config.muted ? "granted" : await this.request();
    if (!this.signal || this.signal?.aborted) return;
    state === "granted" && (this.config.toasts.behavior.value === "persistent" || t007.toast.isActive(this.IDS.ROUTER)) && this.view?.(this.getRouterSpeech(), this.getRouterOptions());
    this.state.routing && this.goTo();
    try {
      state === "granted" ? !this.config.muted && this.recognition?.start() : this.onError({ error: "not-allowed" });
    } catch (e) {} // Silence the InvalidStateError since we might call when already on due to wake word
  }

  protected wakeUp(): void {
    if (this.state.routing) return;
    this.state.routing = true;
    this.clearCtx(), this.teachBasics();
    this.view?.(this.getRouterSpeech(), this.getRouterOptions()), this.snooze();
  } // #STANDALONE: needs scoped behavior
  protected sleep(): void {
    if (!this.state.routing) return;
    this.state.routing = false;
    this.clearCtx(), t007.toast?.dismiss(this.IDS.HELPER);
    !this.config.active.value || this.config.toasts.behavior.value !== "persistent" ? t007.toast?.dismiss(this.IDS.ROUTER) : this.view?.(this.getRouterSpeech(), this.getRouterOptions());
  } // #STANDALONE: needs scoped behavior

  protected trigger(transcript: string, stage: VoiceStage = this.config.process.stage.value): boolean {
    for (const act of Object.values(this.ctlr.actions.entries)) {
      const cmd = this.config.commands[act.id];
      if (!cmd?.length || (act.id !== "voiceWake" && !this.config.process.allowCommands) || this.snublist.includes(act.id) || (act.voice?.stage || this.config.process.stage.value) !== stage || (act.id === "voiceWake" && this.state.routing)) continue;
      if (((act.voice?.match || this.config.process.match.value) === "chunk" ? fuzzyChunkMatch : fuzzyBlobMatch)(cmd, transcript, this.config.process.accuracy)) return this.ctlr.perform(act.id) && this.view?.success(`Triggered <i>${act.label ?? capitalize(uncamelize(act.id))}</i>`, { id: this.IDS.ROUTER, icon: true, autoClose: this.config.toasts.router.autoClose }), true;
    }
    return false;
  }
  protected process(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isSubmit = false, dormant = !this.state.routing): boolean {
    if (this.trigger(transcript, "anytime") || dormant) return !dormant;
    // --- 1. PRE-ROUTE STAGE ---
    if (this.trigger(transcript, "pre-route")) return true;
    // --- 2. PATH|LEAF EXECUTION (PRIORITY) ---
    if (!this.ctlr.isLogical(this.state.ctx, true)) {
      const paths = this.ctlr.getLogicPaths(this.state.ctx);
      // prettier-ignore
      let match: string | null = null, highest = 0, len = paths.length;
      if (len)
        for (let i = 0; i < len; i++) {
          const leaf = paths[i].split(".").pop()!.toLowerCase();
          // prettier-ignore
          if (cleaned === leaf) { match = paths[i]; break; }
          const score = getLevenshteinSimilarity(leaf, transcript);
          if (score > this.config.process.accuracy && score > highest) (highest = score), (match = paths[i]);
        } // Fuzzy Match: Check if the user said the last word of any valid path
      if (match && this.ctlr.isLogical(this.goTo(match), true) && this.execute(transcript, match, true)) return true; // If a S.I.A path strongly matches what they said, TAKE IT. Bypasses commands completely.
      else if (isSubmit) {
        const path = this.state.ctx === "*" ? transcript : `${this.state.ctx}.${camelize(transcript)}`,
          val = this.ctlr.isLogical(path) ? getPath(this.ctlr.logicRoot as any, path) : undefined;
        if (val !== undefined && this.ctlr.isLogical(this.goTo(path), true, val) && this.execute(transcript, path, true)) return true; // Hey dev or explorer, here u go!
      }
    } else if (this.execute(transcript, undefined, false)) return true;
    // --- 4. POST-ROUTE STAGE ---
    return this.trigger(transcript, "post-route");
  }
  protected parse(transcript: string, path = this.state.ctx, isNav = false, value = getPath(this.ctlr.logicRoot as any, path as any), type = isArr(value) ? "array" : typeof value): any {
    if (type === "boolean") return isNav && this.config.routing.autoToggles ? !value : fuzzyChunkMatch(this.config.commands.voiceToggleOn, transcript, this.config.process.accuracy) ? true : fuzzyChunkMatch(this.config.commands.voiceToggleOff, transcript, this.config.process.accuracy) ? false : null;
    if (isNav) return null;
    if (type === "number") {
      const match = transcript.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    } else if (type === "string" || type === "array") return transcript ? (type === "string" ? transcript : transcript.split(/\s*(?:,|and)\s*/i).filter(Boolean)) : null;
    return null;
  }
  protected execute(transcript: string, path = this.state.ctx, isNav = false, isSubmit = false, value = this.parse(transcript, path, isNav), type = isArr(value) ? "array" : typeof value): boolean {
    if (value === null) return false;
    if ((this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")) && !isSubmit) {
      const input = this.container?.querySelector<HTMLInputElement>(clame("exact-input"));
      if (input) input.value = type === "array" ? value.join(", ") : String(value);
      return this.view?.update(this.IDS.ROUTER, { render: transcript || String(value), ...this.getRouterOptions(false) }), true;
    } // Auto-Strict: Blocks execution for strings only (or everything if true)
    return setPath(this.ctlr.logicRoot as any, path as any, value), this.view?.success(`<i>${path.split(".").map(uncam).join(" > ")}</i> -> ${isArr(value) ? `[${value.join(", ")}]` : value}`, { id: this.IDS.ROUTER, icon: true, autoClose: this.config.toasts.router.autoClose }), this.goBack(), true;
  }
  protected submit(render = this.container?.querySelector<HTMLInputElement>(clame("exact-input"))?.value.trim(), process = false): void {
    if (render) this.view?.update(this.IDS.ROUTER, { render, ...this.getRouterOptions(false) }), !process ? this.execute(render, undefined, false, true) : this.process(render, undefined, true); // Execute with isSubmit = true
  }
  protected predict(): void {
    const crumbHtml = this.history.length < 2 ? "" : `<div class="tmg-media-voice-sticky-crumb">` + this.history.map((p, idx, _, active = idx === this.historyIdx) => `<small><i style="${active ? "font-weight: bold;" : "opacity: 0.8;"}">${this.linked(p === "*" ? "Root" : uncam(p.split(".").pop()!), p, true)}</i></small>`).join(" <span style='opacity: 0.4;'><small>></small></span> ") + `</div>`,
      actions: Record<string, () => void> = {};
    if (this.media.features.voiceItems) {
      actions[`<span title='Reset Ctx${formatActionForDisplay(this.settings.keys.shortcuts.voiceCtxClear, this.config.commands.voiceCtxClear)}'>↻</span>`] = () => this.clearCtx(false);
      actions[`<span title='Go Back${formatActionForDisplay(this.settings.keys.shortcuts.voiceCtxPrevious, this.config.commands.voiceCtxPrevious)}' ${this.media.features.previousVoiceItem ? "" : "disabled"}>‹</span>`] = this.goBack;
      actions[`<span title='Go Forward${formatActionForDisplay(this.settings.keys.shortcuts.voiceCtxNext, this.config.commands.voiceCtxNext)}'${this.media.features.nextVoiceItem ? "" : " disabled"}>›</span>`] = this.goForward;
    }
    if (this.ctlr.isLogical(this.state.ctx, true)) {
      const value = getPath(this.ctlr.logicRoot as any, this.state.ctx as any),
        type = isArr(value) ? "array" : typeof value,
        showInput = this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type !== "boolean"),
        showSubmit = this.media.tech.polyfill("voiceSubmit", this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")),
        display = type === "array" ? value.join(", ") : value ?? "",
        inputHtml = showInput ? `<div class="tmg-media-voice-input-wrap"><input name="voice_value" type="${type === "number" ? "number" : "text"}" class="tmg-media-voice-exact-input" placeholder="${display || "Type value..."}" value="${display}"/>${showSubmit ? `<button type="button" title='Submit ${formatActionForDisplay(this.settings.keys.shortcuts.voiceSubmit, this.config.commands.voiceSubmit)}' class="tmg-media-voice-exact-submit">↳</button>` : ""}</div>` : "",
        // prettier-ignore
        hints = type === "boolean" ? `${this.config.commands.voiceToggleOn.slice(0, 2).map((v) => this.linked(v)).join(", ")} or ${this.config.commands.voiceToggleOff.slice(0, 2).map((v) => this.linked(v)).join(", ")} ${inputHtml}` : type === "number" ? `a number (like ${this.linked("0")}, ${this.linked("50")}) ${inputHtml}` : type === "array" ? `comma-separated values ${inputHtml}` : `the exact text ${inputHtml}`;
      return void this.view?.(`${crumbHtml}Try saying ${hints}`, this.getHelperOptions(actions));
    }
    const paths = this.ctlr.getLogicPaths(this.state.ctx);
    if (!paths.length) return;
    const inputHtml = `<input name="voice_path" type="text" class="tmg-media-voice-path-input" placeholder="...text"/>`;
    this.view?.(`${crumbHtml}<small style="font-weight: 500;"><i>Try these:</i></small><br>${inputHtml} • ${paths.map((p) => this.linked(uncam(p.split(".").pop()!))).join(" • ")}`, this.getHelperOptions(actions));
  }

  protected linked(text: string, value = text.toLowerCase(), isGoto = false): string {
    return `<u class="tmg-media-voice-link" ${isGoto ? "data-goto" : "data-cmd"}="${value}" title="${isGoto ? "Go to" : "Say"} ${value}" tabindex="0" style="cursor:pointer; text-decoration-color: rgb(from var(--tmg-media-brand-${isGoto ? "accent-" : ""}color) r g b / 0.75);">${text}</u>`;
  }
  protected stayWoke(e: Event): void {
    this.state.routing && this.ctlr.throttle("voiceWaking", () => e.composedPath().some((el) => (el as HTMLElement)?.matches?.(`:is([id="${this.IDS.HELPER}"],[id="${this.IDS.ROUTER}"])`)) && this.snooze(), 500);
  }
  protected handleClick(e: MouseEvent, t = e.target as HTMLElement): void {
    if (!t?.matches?.(clame("link"))) return;
    e.preventDefault(), e.stopPropagation();
    if (t.dataset.goto) return void this.goTo(t.dataset.goto);
    this.view?.update(this.IDS.ROUTER, { render: t.dataset.cmd, ...this.getRouterOptions(false) }); // Instantly update the router toast to show they "clicked/said" it
    this.process(t.dataset.cmd || ""); // Pipe it straight into the processor as if they spoke it!
  }
  protected handleInput(e: Event, t = e.target as HTMLInputElement, isEnter = e.type === "keydown" && (e as KeyboardEvent).key === "Enter", isClick = e.type === "click"): void {
    if (!t?.tagName) return;
    this.stayWoke(e);
    if ((isEnter && t.matches(clame("exact-input"))) || (isClick && t.matches(clame("exact-submit")))) e.preventDefault(), e.stopPropagation(), this.submit(t.closest(clame("input-wrap"))?.querySelector<HTMLInputElement>(clame("exact-input"))?.value);
    else if (isEnter && t.matches(clame("path-input"))) e.preventDefault(), e.stopPropagation(), this.submit(t.value, true);
  }
  public snooze(): void {
    this.ctlr.debounce("voiceSleeping", this.snoozeCb, this.config.routing.timeout, false, this.signal);
  }
  private snoozeCb = () => (this.config.active.value = "passive");

  protected onCtx(value: string): void {
    if (this.history[this.historyIdx] !== this.state.ctx) {
      const idx = this.history.indexOf(this.state.ctx);
      idx === -1 && this.history.splice(this.historyIdx + 1, this.history.length, value), (this.historyIdx = idx !== -1 ? idx : this.history.length - 1);
    }
    this.media.tech.polyfill("voiceSubmit", false), this.media.tech.polyfill("voiceItems", this.history.length > 1);
    this.media.tech.polyfill("previousVoiceItem", this.historyIdx > 0), this.media.tech.polyfill("nextVoiceItem", this.historyIdx < this.history.length - 1);
    this.state.routing && this.predict(); // The single source of truth for rendering the UI
  }
  protected goTo(path = this.state.ctx, useForce = path === this.state.ctx): string {
    return force(() => (this.state.ctx = path), useForce);
  }
  protected goBack(): void {
    this.media.features.previousVoiceItem && this.goTo(this.history[--this.historyIdx]);
  }
  protected goForward(): void {
    this.media.features.nextVoiceItem && this.goTo(this.history[++this.historyIdx]);
  }
  protected clearCtx(direct = this.config.routing.direct): void {
    (this.history = direct ? ["*", "media", "media.intent"] : ["*"]), this.goTo(direct ? "media.intent" : "*", true);
  }

  protected getHelperOptions(actions: ToastOptions["actions"]): ToastOptions {
    return { id: this.IDS.HELPER, actions, onClose: (_, clicked) => clicked && (this.config.active.value = "passive"), signal: this.signal, ...this.config.toasts.helper };
  }
  protected getRouterOptions(full = true): ToastOptions {
    return full ? { id: this.IDS.ROUTER, actions: this.getRouterActions(), onClose: (_, clicked) => clicked && (this.config.active.value = false), signal: this.signal, ...this.config.toasts.router, ...this.getRouterOptions(false) } : { icon: this.config.toasts.router.icon, type: this.config.muted ? "warning" : this.config.toasts.router.type };
  }
  protected getRouterActions(): Record<string, () => void> {
    return { [`<span title='${this.config.muted ? "Unmute" : "Mute"} my Voice${formatActionForDisplay(this.settings.keys.shortcuts.voiceMute, this.config.commands.voiceMute)}'>${IconRegistry.get(this.config.muted ? "volumeMuted" : "volumeHigh", true)}</span>`]: () => (this.config.muted = !this.config.muted) };
  }
  protected getRouterSpeech(firstHalf = this.config.muted ? "Snubbing..." : "Listening...", secondHalf = `${this.config.muted ? "Tap" : "Say"} ${!this.state.routing ? `${this.config.commands.voiceWake.map((c = "") => `"${this.linked(c)}"`).join(" or ")} to wake me up!` : "a path or command!"}`): string {
    return `${firstHalf} ${secondHalf}`;
  }
  protected get container() {
    return this.ctlr.plug("settings.toasts")?.container;
  }
  protected get view() {
    return this.ctlr.toast;
  }

  public override onDestroy(): void {
    this.recognition?.abort(), super.onDestroy();
  }
}
const uncam = (str: string) => capitalize(uncamelize(str)),
  clame = (sfx: string) => `.tmg-media-voice-${sfx}`;

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.voice": typeof VoicePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    voice: VoiceConfig;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    voice: boolean;
    voiceItems: boolean;
    voiceSubmit: boolean;
    nextVoiceItem: boolean;
    previousVoiceItem: boolean;
  }
}
