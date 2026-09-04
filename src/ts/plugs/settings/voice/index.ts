import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import { force, getPath, setPath } from "sia-reactor/utils";
import { limited } from "@utils/fn";
import type { VoiceStage, VoiceConfig, VoiceState } from "./types";
import { VOICE_BUILD } from "./build";
import { capitalize, uncamelize, fuzzyBlobMatch, fuzzyChunkMatch, getLevenshteinSimilarity, luid } from "@utils/str";
import { formatActionForDisplay as formatAction } from "@utils/keys";
import { type ToastOptions } from "@t007/toast";
import { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { tutorialOpts } from "../toasts";
import { Action } from "@defs/actions";
import { IconRegistry } from "@core/registries";
import { isArr } from "@utils/obj";

export class VoicePlug extends BasePlug<VoiceConfig, VoiceState> {
  public static readonly plugName = "voice";
  public static readonly BUILD = VOICE_BUILD;
  protected recognition?: any;
  protected teachBasics = limited((_id?: string) => (_id = this.ctlr.plug("settings.toasts")?.toast?.(`Follow the predictor guides at the ${this.config.toasts.predictorPos.value.replace("-", " ")}. Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: `${luid()}_voice_basics`, maxTimes: 6, perSession: 2 });
  protected snublist: Array<Action["id"]> = ["voiceToggleOn", "voiceToggleOff"] as const;
  protected readonly IDS = { LISTENER: `tmg-media-voice-listener-for-${this.ctlr.config.id}`, PREDICTOR: `tmg-media-voice-predictor${this.ctlr.config.id}` };

  constructor(ctlr: Controller, config = ctlr.settings.voice) {
    super(ctlr, config, { ctx: "*", listening: false });
  }

  public override mount(): void {
    // Variables Assignment
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognitn;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    Object.assign(this.recognition, { continuous: true, interimResults: true, onresult: this.handleResult, onend: this.handleEnd, onerror: this.handleError });
  }

  public override wire(): void {
    // Event Listeners
    ["click", "click", "keydown", "mousemove", "touchmove", "wheel"].forEach((ev, i) => this.ctlr.plug("settings.toasts")?.container.addEventListener(ev, !i ? this.handleLinkClick : i < 3 ? this.handleInputEvent : this.stayWoke, { passive: i > 3, signal: this.signal }));
    // State Watchers
    this.state.watch("ctx", this.onCtx, { signal: this.signal });
    // ----- Listeners
    this.state.on("listening", ({ value }) => this.media.container.classList.toggle("tmg-media-voice-listening", value), { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.voice ||= !this.recognition), { init: true, signal: this.signal });
    // ---- State Listeners
    this.ctlr.state.on("mediaIntersecting", () => this.ctlr.debounce("syncingIntersectingVoiceListeners", this.syncListeners, 500, false, this.signal), { signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.voice.active", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", ({ value }, { type, icon, autoClose, actions } = this.getListenerOptions()) => this.config.active.value && (value ? this.recognition?.abort() : this.start(), this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, this.asking ? { render: this.getListenerSpeech(), type, icon, autoClose, actions } : { type, actions })), { signal: this.signal });
    this.ctlr.config.on("settings.voice.wakeWord", ({ value }) => !this.state.listening && (value ? this.config.active.value && (this.start(), this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: this.getListenerSpeech() })) : this.stop()), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.behavior", ({ value }) => this.config.active.value && (value === "persistent" ? this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(), this.getListenerOptions()) : t007.toast?.dismiss(this.IDS.LISTENER)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.listenerPos.value", ({ value }) => this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { position: value }), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.predictorPos.value", ({ value }) => this.ctlr.plug("settings.toasts")?.toast?.update(this.state.listening ? this.IDS.PREDICTOR : this.IDS.LISTENER, { position: value }), { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("voiceQuit", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceMute", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceSleep", { fn: this.sleep }, this.signal);
    this.ctlr.learn("voiceSubmit", { fn: () => this.submit(), voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceCtxFirst", { fn: () => this.goTo("*") }, this.signal);
    this.ctlr.learn("voiceCtxPrevious", { fn: this.goBack }, this.signal);
    this.ctlr.learn("voiceCtxNext", { fn: this.goForward }, this.signal);
    this.ctlr.learn("voiceCtxLast", { fn: () => this.goTo(this.history[this.history.length - 1]) }, this.signal);
    this.ctlr.learn("voiceCtxReset", { fn: () => this.resetCtx(false) }, this.signal);
    this.ctlr.payload.wired ? this.syncListeners() : this.ctlr.state.wonce("readyState", this.syncListeners, { signal: this.signal }); // #HEAVY: waits for !lightState. If wake word is enabled, start the engine immediately in "sleep" mode
    super.wire();
  }

  protected handleResult(e: any): void {
    this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal);
    let transcript = "";
    if (!this.config.muted) for (let i = e.resultIndex; i < e.results.length; ++i) transcript += e.results[i][0].transcript;
    if (`${e.resultIndex}-${(transcript = transcript.trim().toLowerCase())}` === this.prevRes) return; // Block the interim/final duplicate fire
    this.prevRes = `${e.resultIndex}-${transcript}`;
    // 1. Wake Word Detection
    if (transcript && !this.state.listening) {
      const token = fuzzyChunkMatch([this.config.wakeWord.toLowerCase()], transcript, this.config.inputs.accuracy);
      if (token) {
        this.wakeUp();
        const idx = transcript.indexOf(token);
        transcript = idx !== -1 ? transcript.substring(idx + token.length).trim() : ""; // Remove the wake word from the transcript
      }
      if ((!token || !transcript) && this.config.toasts.behavior.value === "strict") return;
    }
    // 2. Update the Text UI
    !this.config.muted && this.ctlr.plug("settings.toasts")?.toast?.(transcript ? `${transcript}${!this.state.listening ? `... Say "${this.linked(this.config.wakeWord)}"!` : ""}` : this.getListenerSpeech(undefined, this.state.listening ? "Didn't catch that..." : undefined), this.getListenerOptions(true, true));
    const pathInput = this.ctlr.plug("settings.toasts")?.container.querySelector<HTMLInputElement>(".tmg-media-voice-path-input");
    if (pathInput) pathInput.value = transcript.trim();
    // 3. Process after delay
    transcript && this.ctlr.debounce("voiceProcessing", () => this.process(transcript), 500, false, this.signal);
  }
  private prevRes = "";
  protected handleEnd(): void {
    this.config && this.config.active.value && this.start();
  }
  protected handleError(e: any): void {
    if (e.error.endsWith("not-allowed")) this.config.muted ? this.start() : (this.config.active.value = false), this.ctlr.plug("settings.toasts")?.toast?.error("Microphone access revoked. Please check your settings.");
  }
  protected handleActive({ value }: REvent<CtlrConfig, "settings.voice.active">): void {
    if (value === false) {
      this.state.listening = false;
      this.recognition?.abort(), t007.toast?.dismiss(this.IDS.PREDICTOR), t007.toast?.dismiss(this.IDS.LISTENER);
    } else if (this.shouldListen()) value === "passive" ? (this.sleep(), this.start()) : (this.wakeUp(), this.start());
  }

  public syncListeners(): void {
    if (!this.shouldListen()) (this.state.listening = false), this.recognition?.abort(), t007.toast?.dismiss(this.IDS.PREDICTOR), t007.toast?.dismiss(this.IDS.LISTENER);
    else this.config.active.value === true ? (this.wakeUp(), this.start()) : this.config.active.value === "passive" && this.start();
  }
  protected shouldListen(): boolean {
    return this.ctlr.payload.wired && !this.ctlr.config.disabled && (this.config.muted || this.ctlr.state.mediaIntersecting);
  }

  protected async askPermission(): Promise<"granted" | "denied" | "cancelled"> {
    const state = (await navigator.permissions?.query({ name: "microphone" }).catch(() => null))?.state ?? "prompt";
    if (state === "granted" || state === "denied") return state;
    // prettier-ignore
    return new Promise((res, _, req?: () => void, i = 0) => ((req = () => this.ctlr.plug("settings.toasts")?.toast?.info("Voice control requires mic access", { id: this.IDS.LISTENER, autoClose: false, closeButton: true, actions: { OK: () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => (s.getTracks().forEach((t) => t.stop()), res("granted"))).catch(async (e) => (await navigator.permissions?.query({ name: "microphone" as any }).then(p => p?.state === "denied", () => e.message === "Permission denied")) || ++i > 3 ? res("cancelled") : this.ctlr.plug("settings.toasts")?.toast?.warn("Grant permission to use microphone", { id: this.IDS.LISTENER, autoClose: false, actions: { Retry: req! } })), ...this.getListenerActions() }, onClose: () => res("cancelled") }))())); // #EXTRA-MILE: doing the most with the least
  }
  private asking = false;
  public async start(): Promise<void> {
    let state = this.config.muted ? "granted" : ((this.asking = true), await this.askPermission());
    if (!this.signal || this.signal?.aborted) return;
    if (this.config.muted || (state === "granted" && !this.state.listening)) this.config.toasts.behavior.value === "persistent" ? (!this.config.muted || !t007.toast.isActive(this.IDS.LISTENER)) && this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(), this.getListenerOptions()) : t007.toast?.dismiss(this.IDS.LISTENER);
    try {
      (this.asking = false), state === "granted" ? !this.config.muted && this.recognition?.start() : this.handleError({ error: "not-allowed" });
    } catch (e) {} // Silence the InvalidStateError since we might call when already on due to wake word
  }
  public stop(): void {
    this.sleep(), this.recognition?.abort();
  }
  public wakeUp(): void {
    if (this.config.active.value !== true) return void (this.config.active.value = true);
    if (this.state.listening) return;
    this.state.listening = true;
    this.resetCtx(), this.teachBasics();
    this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(false), this.getListenerOptions());
    this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal);
  }
  public sleep(): void {
    if (this.config.active.value === false) return;
    if (this.config.active.value !== "passive") return void (this.config.active.value = this.config.wakeWord ? "passive" : false);
    this.state.listening = false;
    this.resetCtx(), t007.toast?.dismiss(this.IDS.PREDICTOR);
    !this.config.active.value || this.config.toasts.behavior.value !== "persistent" ? t007.toast?.dismiss(this.IDS.LISTENER) : this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(), this.getListenerOptions(true, true));
  }

  protected trigger(stage: VoiceStage, transcript: string): boolean {
    const acc = this.config.inputs.accuracy;
    for (const action of Object.values(this.ctlr.actions.entries)) {
      const cmds = this.config.commands[action.id];
      if (cmds?.length && !this.snublist.includes(action.id) && (action.voice?.stage ?? "post-route") === stage && fuzzyBlobMatch(cmds, transcript, acc)) return this.ctlr.perform(action.id) && this.ctlr.plug("settings.toasts")?.toast?.success(`Triggered <i>${action.label ?? capitalize(uncamelize(action.id))}</i>`, { id: this.IDS.LISTENER, icon: true, autoClose: this.config.toasts.behavior.value !== "persistent" }), true;
    }
    return false;
  }
  protected process(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isSubmit = false, dormant = !this.state.listening): boolean {
    if ((this.config.inputs.allowCommands && this.trigger("anytime", transcript)) || dormant) return !dormant;
    // --- 1. PRE-ROUTE STAGE ---
    if (this.config.inputs.allowCommands && this.trigger("pre-route", transcript)) return true;
    // --- 2. PATH|LEAF EXECUTION (PRIORITY) ---
    if (!this.ctlr.isLogical(this.state.ctx, true)) {
      const paths = this.ctlr.getLogicPaths(this.state.ctx);
      let match: string | null = null,
        highest = 0;
      if (paths.length)
        for (let i = 0; i < paths.length; i++) {
          const leaf = paths[i].split(".").pop()!.toLowerCase();
          if (cleaned === leaf) {
            match = paths[i];
            break;
          }
          const score = getLevenshteinSimilarity(leaf, transcript);
          if (score > this.config.inputs.accuracy && score > highest) (highest = score), (match = paths[i]);
        } // Fuzzy Match: Check if the user said the last word of any valid path
      if (match && this.ctlr.isLogical(this.goTo(match), true) && this.execute(match, transcript, true)) return true; // If a S.I.A path strongly matches what they said, TAKE IT. Bypasses commands completely.
      else if (isSubmit) {
        const path = this.state.ctx === "*" ? transcript : `${this.state.ctx}.${transcript}`,
          val = this.ctlr.isLogical(path) ? getPath(this.ctlr.logicRoot as any, path) : undefined;
        if (val !== undefined && this.ctlr.isLogical(this.goTo(path), true, val) && this.execute(path, transcript, true)) return true; // Hey dev or explorer, here u go!
      }
    } else if (this.execute(this.state.ctx, transcript, false)) return true;
    // --- 4. POST-ROUTE STAGE ---
    return this.config.inputs.allowCommands ? this.trigger("post-route", transcript) : false;
  }
  protected predict(): void {
    const crumbHtml = this.history.length < 2 ? "" : `<div class="tmg-media-voice-sticky-crumb">` + this.history.map((p, idx, _, active = idx === this.historyIdx) => `<small><i style="${active ? "font-weight: bold;" : "opacity: 0.8;"}">${this.linked(p === "*" ? "Root" : uncap(p.split(".").pop()!), p, true)}</i></small>`).join(" <span style='opacity: 0.4;'><small>></small></span> ") + `</div>`,
      actions: Record<string, () => void> = {};
    if (this.media.features.voiceItems) actions[`<span title='Reset Ctx${formatAction(this.settings.keys.shortcuts.voiceCtxReset, this.config.commands.voiceCtxReset)}'>↻</span>`] = () => this.resetCtx(false);
    if (this.media.features.previousVoiceItem) actions[`<span title='Go Back${formatAction(this.settings.keys.shortcuts.voiceCtxPrevious, this.config.commands.voiceCtxPrevious)}'>‹</span>`] = this.goBack;
    if (this.media.features.nextVoiceItem) actions[`<span title='Go Forward${formatAction(this.settings.keys.shortcuts.voiceCtxNext, this.config.commands.voiceCtxNext)}'>›</span>`] = this.goForward;
    if (this.ctlr.isLogical(this.state.ctx, true)) {
      const value = getPath(this.ctlr.logicRoot as any, this.state.ctx as any),
        type = isArr(value) ? "array" : typeof value,
        showInput = this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && type !== "boolean"),
        showSubmit = (this.media.features.voiceSubmit = this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && type === "string")),
        display = type === "array" ? value.join(", ") : value ?? "",
        inputHtml = showInput ? `<div class="tmg-media-voice-input-wrap"><input name="voice_value" type="${type === "number" ? "number" : "text"}" class="tmg-media-voice-exact-input") placeholder="${display || "Type value..."}" value="${display}"/>${showSubmit ? `<button type="button" title='Submit ${formatAction(this.settings.keys.shortcuts.voiceSubmit, this.config.commands.voiceSubmit)}' class="tmg-media-voice-exact-submit")>↳</button>` : ""}</div>` : "",
        // prettier-ignore
        hints = type === "boolean" ? `${this.config.commands.voiceToggleOn.slice(0, 2).map((v) => this.linked(v)).join(", ")} or ${this.config.commands.voiceToggleOff.slice(0, 2).map((v) => this.linked(v)).join(", ")} ${inputHtml}` : type === "number" ? `a number (like ${this.linked("0")}, ${this.linked("50")}) ${inputHtml}` : type === "array" ? `comma-separated values ${inputHtml}` : `the exact text ${inputHtml}`;
      return void this.ctlr.plug("settings.toasts")?.toast?.(`${crumbHtml}Try saying ${hints}`, this.getPredictorOptions(actions));
    }
    const paths = this.ctlr.getLogicPaths(this.state.ctx);
    if (!paths.length) return;
    const inputHtml = `<input name="voice_path" type="text" class="tmg-media-voice-path-input") placeholder="...text"/>`;
    this.ctlr.plug("settings.toasts")?.toast?.(`${crumbHtml}<small style="font-weight: 500;"><i>Say these:</i></small><br>${inputHtml} • ${paths.map((p) => this.linked(uncap(p.split(".").pop()!))).join(" • ")}`, this.getPredictorOptions(actions));
  }
  protected execute(path: string, transcript: string, isNav = false, isSubmit = false, value = this.parse(transcript, path, isNav), type = isArr(value) ? "array" : typeof value): boolean {
    if (value === null) return false;
    if ((this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && type === "string")) && !isSubmit) {
      const input = this.ctlr.plug("settings.toasts")?.container.querySelector<HTMLInputElement>(clame("exact-input"));
      if (input) input.value = type === "array" ? value.join(", ") : String(value);
      return this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: transcript || String(value), ...this.getListenerOptions(false) }), true;
    } // Auto-Strict: Blocks execution for strings only (or everything if true)
    return setPath(this.ctlr.logicRoot as any, path as any, value), this.ctlr.plug("settings.toasts")?.toast?.success(`<i>${path.split(".").map(uncap).join(" > ")}</i> -> ${isArr(value) ? `[${value.join(", ")}]` : value}`, { id: this.IDS.LISTENER, icon: true, autoClose: this.config.toasts.behavior.value !== "persistent" }), this.goBack(), true;
  }
  protected parse(transcript: string, path: string, isNav = false, value = getPath(this.ctlr.logicRoot as any, path as any), type = isArr(value) ? "array" : typeof value): any {
    if (type === "boolean") return isNav && this.config.inputs.autoToggles ? !value : fuzzyChunkMatch(this.config.commands.voiceToggleOn, transcript, this.config.inputs.accuracy) ? true : fuzzyChunkMatch(this.config.commands.voiceToggleOff, transcript, this.config.inputs.accuracy) ? false : null;
    if (isNav) return null;
    if (type === "number") {
      const match = transcript.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    } else if (type === "string" || type === "array") return transcript ? (type === "string" ? transcript : transcript.split(/\s*(?:,|and)\s*/i).filter(Boolean)) : null;
    return null;
  }

  protected linked(text: string, value = text.toLowerCase(), isGoto = false): string {
    return `<u class="tmg-media-voice-link" ${isGoto ? "data-goto" : "data-cmd"}="${value}" tabindex="0" style="cursor:pointer; text-decoration-color: currentColor;">${text}</u>`;
  }
  protected handleLinkClick(e: MouseEvent, t = e.target as HTMLElement): void {
    if (!t?.matches?.(clame("link"))) return;
    e.preventDefault(), e.stopPropagation();
    if (t.dataset.goto) return void this.goTo(t.dataset.goto);
    this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: t.dataset.cmd, ...this.getListenerOptions(false) }); // Instantly update the listener toast to show they "clicked/said" it
    t.dataset.cmd === this.config.wakeWord.toLowerCase() ? this.wakeUp() : this.process(t.dataset.cmd || ""); // Pipe it straight into the process engine as if they spoke it!
  }
  protected handleInputEvent(e: Event, t = e.target as HTMLInputElement, isEnter = e.type === "keydown" && (e as KeyboardEvent).key === "Enter", isClick = e.type === "click"): void {
    if (!t?.tagName) return;
    this.stayWoke(e);
    if ((isEnter && t.matches(clame("exact-input"))) || (isClick && t.matches(clame("exact-submit")))) e.preventDefault(), e.stopPropagation(), this.submit(t.closest(clame("input-wrap"))?.querySelector<HTMLInputElement>(clame("exact-input"))?.value);
    else if (isEnter && t.matches(clame("path-input"))) e.preventDefault(), e.stopPropagation(), this.submit(t.value, true);
  }
  protected submit(render = this.ctlr.plug("settings.toasts")?.container.querySelector<HTMLInputElement>(clame("exact-input"))?.value.trim(), process = false): void {
    if (render) this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render, ...this.getListenerOptions(false) }), !process ? this.execute(this.state.ctx, render, false, true) : this.process(render, undefined, true); // Execute with isSubmit = true
  }
  protected stayWoke(e: Event): void {
    this.state.listening && this.ctlr.throttle("voiceWaking", () => e.composedPath().some((el) => (el as HTMLElement)?.matches?.(`:is([id="${this.IDS.PREDICTOR}"],[id="${this.IDS.LISTENER}"])`)) && this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal), 500);
  }

  protected history: string[] = ["*"];
  protected historyIdx: number = 0;
  protected resetCtx(direct = this.config.inputs.direct): void {
    (this.history = direct ? ["*", "media", "media.intent"] : ["*"]), this.goTo(direct ? "media.intent" : "*", true);
  }
  protected onCtx(value: string): void {
    if (this.history[this.historyIdx] !== this.state.ctx) {
      const idx = this.history.indexOf(this.state.ctx);
      idx === -1 && this.history.splice(this.historyIdx + 1, this.history.length, value), (this.historyIdx = idx !== -1 ? idx : this.history.length - 1);
    }
    (this.media.features.voiceSubmit = false), (this.media.features.voiceItems = this.history.length > 1);
    (this.media.features.previousVoiceItem = this.historyIdx > 0), (this.media.features.nextVoiceItem = this.historyIdx < this.history.length - 1);
    this.state.listening && this.predict(); // The single source of truth for rendering the UI
  }
  protected goTo(path: string, useForce = false): string {
    return force(() => (this.state.ctx = path), useForce);
  }
  protected goBack(): void {
    this.media.features.previousVoiceItem && this.goTo(this.history[--this.historyIdx]);
  }
  protected goForward(): void {
    this.media.features.nextVoiceItem && this.goTo(this.history[++this.historyIdx]);
  }

  protected getPredictorOptions(actions: ToastOptions["actions"]): ToastOptions {
    return { id: this.IDS.PREDICTOR, icon: "✨", position: this.config.toasts.predictorPos.value, autoClose: false, closeButton: true, dragToClose: false, animation: "fade", actions, onClose: (elapsed) => !elapsed && this.sleep(), signal: this.signal };
  }
  protected getListenerOptions(full = true, transient = false): ToastOptions {
    return full ? { id: this.IDS.LISTENER, ...this.getListenerOptions(false), position: this.state.listening ? this.config.toasts.listenerPos.value : this.config.toasts.predictorPos.value, autoClose: transient && this.config.toasts.behavior.value !== "persistent" ? this.config.timeout : false, closeButton: true, dragToClose: false, actions: this.getListenerActions(), onClose: (elapsed) => !elapsed && (this.config.active.value = false), signal: this.signal } : { type: this.config.muted ? "warning" : undefined, icon: "🎙️" };
  }
  protected getListenerSpeech(full = !this.state.listening, firstHalf = "Listening...", secondHalf = `Say "${this.linked(this.config.wakeWord)}" to wake me up!`, first = true): string {
    return full ? `${firstHalf} ${secondHalf}` : first ? firstHalf : secondHalf;
  }
  protected getListenerActions(): Record<string, () => void> {
    return { [this.config.muted ? `<span title='Unmute my Voice'>${IconRegistry.get("volumeMuted", true)}</span>` : `<span title='Mute my Voice${formatAction(this.settings.keys.shortcuts.voiceMute, this.config.commands.voiceMute)}'>${IconRegistry.get("volumeHigh", true)}</span>`]: () => (this.config.muted = !this.config.muted) };
  }

  public override onDestroy(): void {
    this.stop(), super.onDestroy();
  }
}
const uncap = (str: string) => capitalize(uncamelize(str)),
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
  interface MediaExtraFeatures {
    voice: boolean;
    voiceItems: boolean;
    voiceSubmit: boolean;
    nextVoiceItem: boolean;
    previousVoiceItem: boolean;
  }
}
