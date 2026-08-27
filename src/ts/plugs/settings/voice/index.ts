import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import { force, getPath, getPaths, isLeafPath, setPath } from "sia-reactor/utils";
import { limited } from "@utils/fn";
import type { VoiceStage, VoiceConfig, VoiceState } from "./types";
import { VOICE_BUILD } from "./build";
import { capitalize, uncamelize, fuzzyMatch as match, getLevenshteinSimilarity } from "@utils/str";
import { formatActionForDisplay } from "@utils/keys";
import { type ToastOptions } from "@t007/toast";
import { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { tutorialOpts } from "../toasts";
import { Action } from "@defs/actions";
import { IconRegistry } from "@core/registries";

export class VoicePlug extends BasePlug<VoiceConfig, VoiceState> {
  public static readonly plugName = "voice";
  public static readonly BUILD = VOICE_BUILD;
  protected recognition?: any;
  protected teachBasics = limited((_id?: string) => ((_id = this.ctlr.plug("settings.toasts")?.toast?.(`Follow the predictor guides at the ${this.config.toasts.predictorPos.value.replace("-", "")}. Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: "tmg_voice_tut_1", maxTimes: 6, perSession: 2 }));
  protected snublist: Array<Action["id"]> = ["voiceToggleOn", "voiceToggleOff"] as const;
  protected readonly IDS = { LISTENER: "tmg-media-voice-listener" + this.ctlr.config.id, PREDICTOR: "tmg-media-voice-predictor" + this.ctlr.config.id };
  protected get root() {
    return { media: this.ctlr.media, settings: this.ctlr.settings };
  }

  constructor(ctlr: Controller, config = ctlr.settings.voice) {
    super(ctlr, config, { context: "*", listening: false });
  }

  public override mount(): void {
    // Variables Assignment
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognitn;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    Object.assign(this.recognition, { continuous: true, interimResults: true, onresult: this.handleResult, onend: this.handleEnd, onerror: this.handleError });
  }

  public override wire(): void {
    // Variables Assignment
    const container = this.ctlr.plug("settings.toasts")?.container;
    // Event Listeners
    container?.addEventListener("click", this.handleLinkClick, { signal: this.signal });
    container?.addEventListener("click", this.handleInputEvent, { signal: this.signal });
    container?.addEventListener("keydown", this.handleInputEvent, { signal: this.signal });
    container?.addEventListener("wheel", this.stayWoke, { signal: this.signal, passive: true });
    container?.addEventListener("mousemove", this.stayWoke, { signal: this.signal });
    container?.addEventListener("touchmove", this.stayWoke, { signal: this.signal, passive: true });
    // State Watchers
    this.state.watch("context", this.onContext, { signal: this.signal });
    // ----- Listeners
    this.state.on("listening", ({ value }) => this.media.container.classList.toggle("tmg-media-voice-listening", value), { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.voice ||= !this.recognition), { init: true, signal: this.signal });
    // ---- State Listeners
    this.ctlr.state.on("mediaIntersecting", () => this.ctlr.debounce("syncingIntersectingVoiceListeners", this.syncListeners, 300, false, this.signal), { signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.voice.active", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", ({ value }, { icon, type, actions, autoClose } = this.getListenerOptions()) => this.config.active.value && (value ? this.recognition?.abort() : this.start(), this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, this.asking ? { type, actions, autoClose, icon, render: this.getListenerSpeech() } : { type, actions })), { signal: this.signal });
    this.ctlr.config.on("settings.voice.wakeWord", ({ value }) => !this.state.listening && (value ? this.config.active.value && (this.start(), this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: this.getListenerSpeech() })) : this.stop()), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.behavior", ({ value }) => this.config.active.value && (value === "persistent" ? this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(), this.getListenerOptions()) : t007.toast?.dismiss(this.IDS.LISTENER)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.listenerPos.value", ({ value }) => this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { position: value }), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.predictorPos.value", ({ value }) => this.ctlr.plug("settings.toasts")?.toast?.update(this.state.listening ? this.IDS.PREDICTOR : this.IDS.LISTENER, { position: value }), { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.addAction("voiceQuit", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.addAction("voiceMute", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.addAction("voiceSleep", { fn: this.sleep }, this.signal);
    this.ctlr.addAction("voiceSubmit", { fn: () => this.submit(), voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.addAction("voiceHistoryFirst", { fn: () => this.goTo("*") }, this.signal);
    this.ctlr.addAction("voiceHistoryPrevious", { fn: this.goBack }, this.signal);
    this.ctlr.addAction("voiceHistoryNext", { fn: this.goForward }, this.signal);
    this.ctlr.addAction("voiceHistoryLast", { fn: () => this.goTo(this.state.context) }, this.signal);
    this.ctlr.addAction("voiceHistoryClear", { fn: () => this.resetContext(false) }, this.signal);
    this.ctlr.payload.wired ? this.syncListeners() : this.ctlr.state.wonce("readyState", this.syncListeners, { signal: this.signal }); // #HEAVY: waits for !lightState. If wake word is enabled, start the engine immediately in "sleep" mode
    super.wire();
  }

  protected handleResult(e: any): void {
    let transcript = "";
    if (!this.config.muted) for (let i = e.resultIndex; i < e.results.length; ++i) transcript += e.results[i][0].transcript;
    transcript = transcript.trim().toLowerCase();
    if (`${e.resultIndex}-${transcript}` === this.prevRes) return; // Block the interim/final duplicate fire
    this.prevRes = `${e.resultIndex}-${transcript}`;
    // 1. Wake Word Detection
    if (transcript && !this.state.listening) {
      const token = match([this.config.wakeWord.toLowerCase()], transcript, this.config.inputs.accuracy);
      if (token) {
        this.wakeUp();
        const idx = transcript.indexOf(token);
        transcript = idx !== -1 ? transcript.substring(idx + token.length).trim() : ""; // Remove the wake word from the transcript
      }
      if ((!token || !transcript) && this.config.toasts.behavior.value === "strict") return;
    }
    // 2. Update the listener UI.
    if (!this.config.muted) this.ctlr.plug("settings.toasts")?.toast?.(transcript ? `${transcript}${!this.state.listening ? `... Say "${this.linked(this.config.wakeWord)}"!` : ""}` : this.getListenerSpeech(undefined, this.state.listening ? "Didn't catch that..." : undefined), this.getListenerOptions(true));
    this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal);
    // 3. Anytime-stage actions (run regardless of listening state)
    transcript && this.process(transcript);
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
    this.resetContext();
    this.teachBasics(), this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(false), this.getListenerOptions());
    this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal);
  }
  public sleep(): void {
    if (this.config.active.value === false) return;
    if (this.config.active.value !== "passive") return void (this.config.active.value = this.config.wakeWord ? "passive" : false);
    this.state.listening = false;
    this.resetContext();
    t007.toast?.dismiss(this.IDS.PREDICTOR), !this.config.active.value || this.config.toasts.behavior.value !== "persistent" ? t007.toast?.dismiss(this.IDS.LISTENER) : this.ctlr.plug("settings.toasts")?.toast?.(this.getListenerSpeech(), this.getListenerOptions(true));
  }

  protected trigger(stage: VoiceStage, transcript: string): boolean {
    const acc = this.config.inputs.accuracy;
    for (const action of Object.values(this.ctlr.actions.entries)) {
      const triggers = this.config.commands[action.id];
      if (!this.snublist.includes(action.id) && (action.voice?.stage ?? "post-route") === stage && triggers?.length && match(triggers, transcript, acc)) return this.ctlr.perform(action.id), this.ctlr.plug("settings.toasts")?.toast?.success(`Executed <i>${action.label || action.id}</i>`, { id: this.IDS.LISTENER, icon: true, autoClose: this.config.toasts.behavior.value !== "persistent" }), true;
    }
    return false;
  }
  protected process(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isSubmit = false, dormant = !this.state.listening): void {
    if ((this.config.inputs.allowCommands && this.trigger("anytime", transcript)) || dormant) return;
    // --- 1. PRE-ROUTE STAGE ---
    if (this.config.inputs.allowCommands && this.trigger("pre-route", transcript)) return;
    // --- 2. LEAF EXECUTION ---
    if (this.isLeaf(this.state.context)) return this.execute(this.state.context, transcript, cleaned, false);
    // --- 3. PATH EXTRACTION (PRIORITY) ---
    const paths = this.getValidPaths();
    let matched: string | null = null,
      highest = 0;
    if (paths.length)
      for (let i = 0; i < paths.length; i++) {
        const leaf = paths[i].split(".").pop()!.toLowerCase();
        if (cleaned === leaf) {
          matched = paths[i];
          break;
        }
        const score = getLevenshteinSimilarity(leaf, transcript);
        if (score > this.config.inputs.accuracy && score > highest) (highest = score), (matched = paths[i]);
      } // Fuzzy Match: Check if the user said the last word of any valid path
    if (matched) return void ((this.state.context = matched), this.isLeaf(matched) && this.execute(matched, transcript, cleaned, true)); // If a S.I.A path strongly matches what they said, TAKE IT. Bypasses commands completely.
    else if (isSubmit) {
      const path = this.state.context === "*" ? transcript : `${this.state.context}.${transcript}`,
        val = this.ctlr.isLogical(path) ? getPath(this.root as any, path) : undefined;
      if (val !== undefined) return void ((this.state.context = path), this.isLeaf(path, val) && this.execute(path, transcript, cleaned, true)); // Hey dev or explorer, here u go!
    }
    if (paths.length) {
      const pathInput = this.ctlr.plug("settings.toasts")?.container?.querySelector<HTMLInputElement>(".tmg-media-voice-path-input");
      if (pathInput) pathInput.value = transcript.trim();
    }
    // --- 4. POST-ROUTE STAGE ---
    if (this.config.inputs.allowCommands) this.trigger("post-route", transcript);
  }
  protected predict(): void {
    const crumbHtml = this.history.length < 2 ? "" : `<div class="tmg-media-voice-sticky-crumb">` + this.history.map((p, idx, _, active = idx === this.historyIdx) => `<small><i style="${active ? "font-weight: bold;" : "opacity: 0.8;"}">${this.linked(p === "*" ? "Root" : uncap(p.split(".").pop()!), p, true)}</i></small>`).join(" <span style='opacity: 0.4;'><small>></small></span> ") + `</div>`,
      actions: Record<string, () => void> = {};
    if (this.history.length > 1) actions[`<span title='Reset Context${formatActionForDisplay(this.settings.keys.shortcuts.voiceHistoryClear, this.config.commands.voiceHistoryClear)}'>↻</span>`] = () => this.resetContext(false);
    if (this.historyIdx > 0) actions[`<span title='Go Back${formatActionForDisplay(this.settings.keys.shortcuts.voiceHistoryPrevious, this.config.commands.voiceHistoryPrevious)}'>‹</span>`] = this.goBack;
    if (this.historyIdx < this.history.length - 1) actions[`<span title='Go Forward${formatActionForDisplay(this.settings.keys.shortcuts.voiceHistoryNext, this.config.commands.voiceHistoryNext)}'>›</span>`] = this.goForward;
    if (this.isLeaf(this.state.context)) {
      const value = getPath(this.root as any, this.state.context as any),
        isArray = Array.isArray(value),
        type = isArray ? "array" : typeof value,
        showInput = this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && type !== "boolean"),
        showSubmit = this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && type === "string"),
        display = isArray ? value.join(", ") : value ?? "",
        inputHtml = showInput ? `<div class="tmg-media-voice-input-wrap"><input type="${type === "number" ? "number" : "text"}" class="tmg-media-voice-exact-input") placeholder="${display || "Type value..."}" value="${display}"/>${showSubmit ? `<button type="button" title='Submit ${formatActionForDisplay(this.settings.keys.shortcuts.voiceSubmit, this.config.commands.voiceSubmit)}' class="tmg-media-voice-exact-submit")>↳</button>` : ""}</div>` : "",
        // prettier-ignore
        hints = type === "boolean" ? `${this.config.commands.voiceToggleOn?.slice(0, 2).map((v) => this.linked(v)).join(", ")} or ${this.config.commands.voiceToggleOff?.slice(0, 2).map((v) => this.linked(v)).join(", ")} ${inputHtml}` : type === "number" ? `a number (like ${this.linked("0")}, ${this.linked("50")}) ${inputHtml}` : isArray ? `comma-separated values ${inputHtml}` : `the exact text ${inputHtml}`;
      return void this.ctlr.plug("settings.toasts")?.toast?.(`${crumbHtml}Try saying ${hints}`, this.getPredictorOptions(actions));
    }
    const paths = this.getValidPaths();
    if (!paths.length) return;
    const inputHtml = `<input type="text" class="tmg-media-voice-path-input") placeholder="...text"/>`;
    this.ctlr.plug("settings.toasts")?.toast?.(`${crumbHtml}<small style="font-weight: 500;"><i>Say these:</i></small><br>${inputHtml} • ${paths.map((p) => this.linked(uncap(p.split(".").pop()!))).join(" • ")}`, this.getPredictorOptions(actions));
  }
  protected execute(path: string, transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isNav = false, isSubmit = false): void {
    const value = this.parse(transcript, cleaned, path, isNav);
    if (value === null) return;
    const strict = this.config.inputs.strict.value === true || (this.config.inputs.strict.value === "auto" && typeof value === "string");
    if (strict && !isSubmit) {
      const input = this.ctlr.plug("settings.toasts")?.container?.querySelector<HTMLInputElement>(clame("exact-input"));
      if (input) input.value = Array.isArray(value) ? value.join(", ") : String(value);
      return void this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: transcript || String(value), type: this.config.muted ? "warning" : undefined, icon: "🎙️" });
    } // Auto-Strict: Blocks execution for strings only (or everything if true)
    setPath(this.root as any, path as any, value), this.ctlr.plug("settings.toasts")?.toast?.success(`<i>${path.split(".").map(uncap).join(" > ")}</i> -> ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`, { id: this.IDS.LISTENER, icon: true, autoClose: this.config.toasts.behavior.value !== "persistent" }), this.goBack();
  }
  protected parse(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), path: string, isNav = false): any {
    const val = getPath(this.root as any, path as any),
      type = typeof val;
    if (type === "boolean") {
      if (isNav && this.config.inputs.autoToggles) return !val;
      return match(this.config.commands.voiceToggleOn!, transcript, this.config.inputs.accuracy) ? true : match(this.config.commands.voiceToggleOff!, transcript, this.config.inputs.accuracy) ? false : null;
    }
    if (type === "number") {
      const match = transcript.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    }
    if (Array.isArray(val) || type === "string") {
      const leaf = path.split(".").pop()!.toLowerCase(),
        rgx = new RegExp(`^(set|change)\\s+${leaf}\\s+to\\s+`, "i"),
        val = transcript.replace(rgx, "").trim();
      if (isNav && !rgx.test(transcript)) if (cleaned === leaf || getLevenshteinSimilarity(leaf, transcript) > this.config.inputs.accuracy) return null;
      return val ? (type === "string" ? val : val.split(/\s*(?:,|and)\s*/i).filter(Boolean)) : null;
    }
    return null;
  }

  protected history: string[] = ["*"];
  protected historyIdx: number = 0;
  protected resetContext(direct = this.config.inputs.direct): void {
    if (direct) (this.history = ["*", "media", "media.intent"]), (this.historyIdx = 2), force(() => (this.state.context = "media.intent"));
    else (this.history = ["*"]), (this.historyIdx = 0), force(() => (this.state.context = "*"));
  }
  protected onContext(value: string): void {
    if (this.history[this.historyIdx] !== this.state.context) {
      const idx = this.history.indexOf(this.state.context);
      if (idx !== -1) this.historyIdx = idx;
      else (this.history = this.history.slice(0, this.historyIdx + 1)), this.history.push(value), (this.historyIdx = this.history.length - 1);
    }
    this.state.listening && this.predict(); // The single source of truth for rendering the UI
  }
  protected goBack(): void {
    if (this.historyIdx > 0) this.state.context = this.history[--this.historyIdx];
  }
  protected goForward(): void {
    if (this.historyIdx < this.history.length - 1) this.state.context = this.history[++this.historyIdx];
  }
  protected goTo(path: string): void {
    this.state.context = path;
  }

  protected linked(text: string, value = text.toLowerCase(), isGoto = false): string {
    return `<u class="tmg-media-voice-link" ${isGoto ? "data-goto" : "data-cmd"}="${value}" tabindex="0" style="cursor:pointer; text-decoration-color: currentColor;">${text}</u>`;
  }
  protected handleLinkClick(e: MouseEvent, target = e.target as HTMLElement): void {
    if (!target?.matches?.(clame("link"))) return;
    e.preventDefault(), e.stopPropagation();
    if (target.dataset.goto) return this.goTo(target.dataset.goto);
    this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render: target.dataset.cmd, type: this.config.muted ? "warning" : undefined, icon: "🎙️" }); // Instantly update the listener toast to show they "clicked/said" it
    target.dataset.cmd === this.config.wakeWord.toLowerCase() ? this.wakeUp() : this.process(target.dataset.cmd || ""); // Pipe it straight into the process engine as if they spoke it!
  }
  protected handleInputEvent(e: Event, target = e.target as HTMLElement, isEnter = e.type === "keydown" && (e as KeyboardEvent).key === "Enter", isClick = e.type === "click"): void {
    this.stayWoke(e);
    if ((isEnter && target?.matches?.(clame("exact-input"))) || (isClick && target?.matches?.(clame("exact-submit")))) e.preventDefault(), e.stopPropagation(), this.submit(target.closest?.(clame("input-wrap"))?.querySelector?.<HTMLInputElement>(clame("exact-input")));
    else if (isEnter && target?.matches?.(clame("path-input"))) e.preventDefault(), e.stopPropagation(), this.submit(target as HTMLInputElement, undefined, true);
  }
  protected submit(input = this.ctlr.plug("settings.toasts")?.container?.querySelector<HTMLInputElement>(clame("exact-input")), render = input?.value.trim(), process = false): void {
    if (input && render) this.ctlr.plug("settings.toasts")?.toast?.update(this.IDS.LISTENER, { render, type: this.config.muted ? "warning" : undefined }), !process ? this.execute(this.state.context, render, undefined, false, true) : this.process(render, undefined, true); // Execute with isSubmit = true
  }
  protected stayWoke(e: Event): void {
    this.state.listening && this.ctlr.throttle("voiceWoking", () => e.composedPath().some((el) => (el as HTMLElement)?.matches?.(`:is([id="${this.IDS.PREDICTOR}"],[id="${this.IDS.LISTENER}"])`)) && this.ctlr.debounce("voiceSleeping", this.sleep, this.config.timeout, false, this.signal), 200);
  }

  protected isLeaf(path: string, val = path !== "*" && getPath(this.root as any, path as any)): boolean {
    return (val && Array.isArray(val)) || isLeafPath(this.root as any, path as any, undefined, val);
  }
  protected getValidPaths(): string[] {
    // prettier-ignore
    return getPaths(this.root as any, this.state.context as any, { depth: 1 }).filter(this.ctlr.isLogical).sort((a, b) => a.localeCompare(b));
  }
  protected getPredictorOptions(actions: ToastOptions["actions"]): ToastOptions {
    return { id: this.IDS.PREDICTOR, icon: "✨", position: this.config.toasts.predictorPos.value, autoClose: false, closeButton: true, dragToClose: false, animation: "fade", actions, onClose: (elapsed) => !elapsed && this.sleep(), signal: this.signal };
  }
  protected getListenerOptions(transient = false): ToastOptions {
    return { id: this.IDS.LISTENER, icon: "🎙️", position: this.state.listening ? this.config.toasts.listenerPos.value : this.config.toasts.predictorPos.value, autoClose: transient ? this.config.toasts.behavior.value !== "persistent" : false, closeButton: true, dragToClose: false, actions: this.getListenerActions(), onClose: (elapsed) => !elapsed && (this.config.active.value = false), type: this.config.muted ? "warning" : undefined, signal: this.signal };
  }
  protected getListenerSpeech(full = !this.state.listening, firstHalf = "Listening...", secondHalf = `Say "${this.linked(this.config.wakeWord)}" to wake me up!`, first = true): string {
    return full ? `${firstHalf} ${secondHalf}` : first ? firstHalf : secondHalf;
  }
  protected getListenerActions(): Record<string, () => void> {
    return { [this.config.muted ? `<span title='Unmute my Voice'>${IconRegistry.get("volumeMuted", true)}</span>` : `<span title='Mute my Voice${formatActionForDisplay(this.settings.keys.shortcuts.voiceMute, this.config.commands.voiceMute)}'>${IconRegistry.get("volumeHigh", true)}</span>`]: () => (this.config.muted = !this.config.muted) };
  }

  public override onDestroy(): void {
    this.stop(), super.onDestroy();
  }
}
const uncap = (str: string) => capitalize(uncamelize(str)),
  clame = (suffix: string) => `.tmg-media-voice-${suffix}`;

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
  }
}
