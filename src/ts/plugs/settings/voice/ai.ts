import { BasePin } from "../../base";
import { VoicePlug } from "./index";
import type { AiResponse, VoiceAiConfig, VoiceAiState } from "./types";
import { responseConstraint, VOICE_AI_BUILD, AI_SYSTEM_PROMPT, AI_INITIAL_PROMPTS as INITIALS } from "./build";
import type { Controller } from "@core/controller";
import { setPath, deletePath, getPath, getPaths, withMeta, force, setTimeout } from "sia-reactor/utils";
import { createTxPathMerger, silence, TemporalModule, Transaction } from "sia-reactor/modules";
import { isArr, isDef, isObj, isStr } from "@utils/obj";
import { ComponentRegistry } from "@core/registries";
import type { CaptionsView } from "@components/captionsView";
import { capitalize, formatAiText, fpath, readSSEStream, uncamelize } from "@utils/str";
import { CtlrConfig } from "@defs/config";
import { NOOP, REvent } from "sia-reactor";
import { globalState } from "@tools/runtime";

// --- The Autonomous ReAct System ---
export class VoiceAiPin extends BasePin<VoicePlug, VoiceAiConfig, VoiceAiState> {
  public static readonly pinName = "ai";
  public static get Plug() {
    return VoicePlug;
  }
  public static readonly BUILD = VOICE_AI_BUILD;
  public static defaultRgx = /zira|samantha|susan|hazel|victoria|karen/i;
  public qac: AbortController | null = null;
  public LLM: any = null; // Local Language Model, not Large
  public module!: TemporalModule<any>;
  public talker?: SpeechSynthesis = globalThis.speechSynthesis;
  public texter: CaptionsView | null = null;
  public utterance: SpeechSynthesisUtterance | null = null;
  public utterances: SpeechSynthesisUtterance[] = [];
  public utteredId?: number;
  public utteringId?: number;
  public maxAttempts = 3;
  public readonly TID = `tmg-media-voice-ai-informer-for-${this.ctlr.config.id}`;

  constructor(ctlr: Controller, config = ctlr.settings.voice.ai) {
    super(ctlr, config, { status: "", prompt: "", speech: "", speaking: false });
  }

  public override mount(): void {
    // Variables Assignment
    const merger = createTxPathMerger({ diffing: false });
    this.module = new TemporalModule({ whitelist: { media: ["intent", "settings"], "voiceAi.state": ["speech"] }, beforeEntry: (entry, history, e) => !!e.ai && merger(entry, history, e) }); // , blacklist: this.settings.temporal.module.blacklist
    // Utility Injection
    this.module.attach(this.media, "media").attach(this.ctlr.config, "config").setup(this.state, "voiceAi.state");
  }

  public override wire(): void {
    this.prune(), (this.state.speech = parseRes((this.config.history[this.module.state.currentFrame * 2 - 1] || INITIALS.at(-1)!).content).speech || "");
    // State Watchers
    this.module.state.watch("currentFrame", this.plug.syncFeatures, { signal: this.signal });
    this.module.state.watch("currentFrame", (v, p, c = this.config) => (p.temporal || p.type === "init") && force(() => (this.quiet(), (this.state.prompt = c.draft.frame === v ? c.draft.text : this.module.canRedo ? c.history[v * 2]?.content || "" : ""))), { init: true, signal: this.signal });
    // ----- Listeners
    this.state.on("speech", this.text, { signal: this.signal });
    this.state.on("status", this.plug.predict, { signal: this.signal });
    this.state.on("prompt", (e) => (e.temporal || !e.silent) && this.plug.predict(), { signal: this.signal }); // this.module.state.on("currentFrame", this.plug.predict, { signal: this.signal });
    this.state.on("speaking", ({ value }) => this.media.container.classList.toggle("tmg-media-ai-speaking", value), { signal: this.signal });
    this.module.state.on("history.length" as any, ({ value: l }, c = this.config, h = c.history) => (h.length > l * 2 && silence(() => (h.length = l * 2)), !l && !this.qac && force(() => (this.reset(), (this.state.prompt = c.draft.text), (this.state.speech = JSON.parse(INITIALS.at(-1)!.content).speech)))), { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", () => this.media.tech.polyfill("ai", true), { init: true, signal: this.signal });
    // ---- Config -------
    this.ctlr.config.watch("settings.voice.ai.active", this.plug.syncFeatures, { signal: this.signal });
    this.ctlr.config.watch("settings.voice.ai.persona.limit", (v) => (this.module.config.limit = v), { init: true, signal: this.signal });
    // ----------- Listeners
    this.ctlr.config.on("settings.voice.ai.active", this.handleActive, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.ai.persona.voice", ({ value }, v = this.getVoice(value)) => this.utterances.forEach((u) => ((u.voice = v), (u.lang = v?.lang || ""))), { signal: this.signal });
    this.ctlr.config.on("settings.voice.ai.persona.preference", this.reset, { signal: this.signal });
    this.ctlr.config.on("settings.voice.ai.feedback.captions", this.text, { signal: this.signal });
    for (const k of ["volume", "rate"] as const) this.ctlr.config.on(`settings.voice.ai.feedback.${k}`, ({ value }) => (!value && k === "volume" && this.quiet(), this.utterances.forEach((u) => (u[k] = value))), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("ai", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("aiStop", { fn: this.stop, voice: { stage: "pre-route" } }, this.signal);
    if (this.config.active) this.ctlr.flags.wired ? this.prewarm() : this.ctlr.state.wonce("readyState", () => this.prewarm(), { signal: this.signal }); // #HEAVYY: waits for !light
  }

  protected handleActive({ type, value }: REvent<CtlrConfig, "settings.voice.ai.active">): void {
    if (type !== "init") value ? this.prewarm() : this.quiet(), (this.plug.config.active.value = true), this.text();
    this.media.container.classList.toggle("tmg-media-ai", value);
  }

  public async query(text: string, tx: Transaction, signal: AbortSignal, start = this.config.history.length, next?: string | false | null, v?: any): Promise<void> {
    try {
      let res = await this.prompt(this.record("user", text), signal, tx);
      while (!signal.aborted && res) {
        next = this.record("assistant", res).query ? ((this.state.status = `👀 Reading ${this.getLink(res.query)}...`), !isDef((v = this.inspect(res.query))) ? `[State: {"${res.query}": undefined}]` : `[State: ${JSON.stringify({ [res.query!]: v })}]`) : this.apply(res, tx);
        if (!next) return this.prune(start, { role: "user", content: text }, { role: "assistant", content: JSON.stringify(res) }), withMeta({ ai: true, tx, forced: true }, () => void (this.state.speech = res.speech || ""));
        res = await this.prompt(this.record("user", next), signal, tx);
      }
      this.prune(start);
    } catch (err: any) {
      this.prune(start), !signal.aborted && this.ctlr.notice(`AI error: ${err?.message}`, "error", `Configure ${this.plug.linked("AI settings", "advanced.interaction.voice.voiceAi", "menu")} or enable Built-in AI.`);
    }
  }
  public process(transcript: string, isSubmit = false, strict = this.plug.config.routing.strict.value): boolean {
    if (!transcript || (this.state.status && strict !== false)) return false;
    this.plug.input(this.draft(transcript), '[name="voice_prompt"]');
    return (strict === true || (strict === "auto" && !isSubmit)) && !isSubmit ? true : (this.submit(transcript), true);
  }
  public async submit(prompt = this.state.prompt, text = prompt.trim()): Promise<void> {
    if (!text) return;
    const tx = { id: ++txId, label: text, parent: null };
    this.stop(true), (this.state.prompt = text), (this.state.status = "💭 Thinking..."), this.plug.snooze();
    const qac = (this.qac = new AbortController());
    this.module.canRedo && this.module.prune();
    try {
      await this.query(text, tx, qac.signal);
    } finally {
      if (qac === this.qac) (this.qac = null), !this.state.speaking && (this.state.status = this.state.prompt = ""), this.plug.snooze();
    }
  }
  public stop(light = false, prev = this.state.prompt, speaking = this.state.speaking): void {
    this.quiet(), this.qac?.abort(), (this.qac = null);
    light ? this.draft("", false, -1) : (this.draft(prev, false), !speaking && (this.state.status = ""), this.plug.snooze());
  }

  public async prompt(text: string, signal: AbortSignal, tx?: Transaction, bypass = !navigator.onLine, attempt = 0, raw = "", s = "", si = 0): Promise<AiResponse> {
    if (!this.config.endpoint && !LLM()) throw new Error("No AI endpoint configured and Built-in AI is unavailable");
    try {
      const stream = (!bypass && this.config.endpoint ? this.cloudStreaming(signal) : null) ?? (await this.prewarm(!this.LLM, bypass, signal), this.LLM?.promptStreaming?.(text, { responseConstraint, signal }));
      if (!this.config.endpoint && !this.LLM) throw new Error("Built-in AI failed to initialize or is unavailable");
      // prettier-ignore
      if (stream) for await (const c of stream) if ((s = extractSpeech((raw = c.startsWith(raw) ? c : raw + c)))) for (const m of withMeta({ ai: true, tx, forced: true }, () => ((this.state.status = "💭 Thinking..."), (this.state.speech = s))).slice(si).matchAll(sepRgx)) this.talk(m[0]), (si += m[0].length);
    } catch (e: any) {
      if (!raw && !signal.aborted)
        if (attempt < this.maxAttempts && canRetry(e)) {
          await new Promise<void>((res, _, rem = 6 + attempt * 20, clup?: Function) => (clup = globalState.on("clock", () => (signal.aborted || --rem <= 0 ? (clup!(), res()) : (this.state.status = `⏳ Unavailable, Retrying in ${rem}s (${attempt + 1}/${this.maxAttempts})`)), { init: true })));
          if (!signal.aborted) return (this.state.status = "💭 Thinking..."), this.prompt(text, signal, tx, bypass, ++attempt);
        } else if (!bypass && LLM()) return this.ctlr.toast?.info("Offline, falling back to Built-in AI.", { id: this.TID, position: this.plug.config.toasts.quoter.position, compact: this.plug.config.toasts.quoter.compact, signal }), this.prompt(text, signal, tx, true);
      throw e;
    }
    const res = parseRes(raw || (await this.LLM?.prompt?.(text, { responseConstraint, signal })));
    return !signal.aborted && (s ? (s = s.slice(si).trim()) && this.talk(s) : res.speech && this.talk(withMeta({ ai: true, tx, forced: true }, () => ((this.state.status = "💭 Thinking..."), (this.state.speech = res.speech!))))), res;
  }
  public draft(text = "", prompt = true, frame = this.module.state.currentFrame): string {
    return (this.config.draft = { frame, text }), prompt ? silence(() => (this.state.prompt = text)) : text;
  }
  public text(): void {
    if (!this.config.feedback.captions) return void (this.texter?.destroy(), (this.texter = null));
    if (!this.texter) this.plug.container?.prepend((this.texter = ComponentRegistry.init("captionsView", this.ctlr, { isSolo: true, initialX: "12.5%", initialY: "30%" }))?.element || "");
    this.texter?.render(!this.state.speech || !this.config.active || !this.plug.state.routing ? null : [{ text: `<v 🤖>${formatAiText(this.state.speech)}</v>`, size: "calc(var(--t007-toast-width) * 1.2)", scroll: "up", fluid: true }]);
  }
  public talk(text = this.state.speech, speech = cleanSpeech(text)): void {
    if (speech && this.talker && this.config.feedback.volume) clearTimeout(this.utteredId), this.utterances.push(new SpeechSynthesisUtterance(speech)), this.drain();
  }

  protected inspect(path = "root", root = this.systemRoot): any {
    const val: any = path && path !== "root" ? getPath(root, path as any) : root;
    if (isArr(val) || !isObj(val)) return val;
    const paths = getPaths(root as any, (!path || path === "root" ? "*" : path) as any, { depth: 1 }),
      entries = paths.map((p) => [p, getPath(root, p as any)]);
    return entries.some(([, v]) => isObj(v)) ? paths : Object.fromEntries(entries);
  }
  protected apply({ action: a, path: p, value: v, type, speech: s }: AiResponse, tx: Transaction, isDel = type === "delete"): string | null {
    if (a) return !this.ctlr.actions.entries[a] ? this.fail(a, "action") : ((this.state.status = `⚡ Triggering ${this.getLink(a, false)}...`), withMeta({ ai: true, tx }, () => this.ctlr.perform(a)) ? (s ? null : `[Triggered: ${a}]`) : this.fail(a, "action", ""));
    if (!p) return null;
    const [r, f] = p.startsWith("media.") ? [this.media, p.slice(6)] : p.startsWith("state.") ? [this.ctlr.state, p.slice(6)] : [this.ctlr.config, p.replace(/^config\./, "")];
    return getPath(r, f as any) === undefined ? this.fail(p) : ((this.state.status = `${isDel ? "🗑️ Deleting" : "✏️ Setting"} ${this.getLink(p)}...`), withMeta({ ai: true, tx }, () => (isDel ? deletePath(r, f as any) : setPath(r, f as any, v))), s ? null : isDel ? `[Deleted: ${p}]` : `[Applied: ${JSON.stringify({ [p]: v })}]`);
  }
  protected fail(s: string, t: "path" | "action" = "path", e = "404") {
    return (this.state.status = `<span style="color: var(--tmg-media-danger-color);">❌ Failed to ${t === "path" ? "mutate path:" : "trigger action:"} ${this.getLink(s, t === "path")}</span>`), `[Error: ${t === "path" ? `Path (${s}) not found in player tree` : e ? `Action ("${s}") not found in actions.entries` : `Action ("${s}") failed to trigger`}]`;
  }
  protected record<T extends any>(role: "user" | "assistant", raw: T, content = isStr(raw) ? raw : JSON.stringify(raw)): T {
    return this.ctlr.log(`[VoiceAI] ${role}: ${content}`), silence(() => (this.config.history.at(-1)?.role === role ? (this.config.history.at(-1)!.content = content) : this.config.history.push({ role, content }))), raw;
  }
  protected prune(index?: number, ...entries: Array<{ role: "user" | "assistant"; content: string }>): void {
    silence(() => {
      index != null && (this.config.history.length = index), entries.length && this.config.history.push(...entries);
      while (this.config.history.length > this.config.persona.limit * 2 || this.config.history[0]?.role === "assistant") this.config.history.shift();
      while (this.config.history.at(-1)?.role === "user") this.config.history.pop();
    });
    this.module?.prune(Math.floor(this.config.history.length / 2));
  }

  public async prewarm(init?: unknown, bypass = !navigator.onLine, signal?: AbortSignal, LM = LLM()): Promise<void> {
    this.ctlr.state.readyState < 3 && this.talker?.getVoices?.(); // kick-start voice engine
    if (!LM || (this.config.endpoint && !bypass)) return;
    const monitor = (m: any) => m.addEventListener("downloadprogress", (e: any, pct = Math.round((e.loaded / e.total) * 100)) => (pct && pct < 100 ? this.ctlr.toast?.info(`Downloading Built-in AI: ${pct}%`, { id: this.TID, position: this.plug.config.toasts.quoter.position, compact: this.plug.config.toasts.quoter.compact, autoClose: false, signal: this.signal }) : t007.toast?.dismiss(this.TID)));
    init === true && (this.state.status = "⚙️ Initializing..."), (this.LLM ??= await LM.create({ initialPrompts: [{ role: "system", content: this.systemPrompt }, ...INITIALS, ...this.config.history], outputLanguage: "en", expectedOutputs: [{ type: "text", languages: ["en"] }], temperature: 0.1, topK: 1, monitor }).catch(NOOP)), init === true && !signal?.aborted && (this.state.status = "💭 Thinking...");
  }
  public drain(): void {
    if (!this.talker || this.utterance) return;
    if (!this.utterances.length) return clearTimeout(this.utteredId), void (this.utteredId = setTimeout(() => ((this.state.speaking = false), (this.state.status = this.state.prompt = ""), this.plug.snooze()), 2000, this.signal));
    const voice = this.getVoice(),
      u = (this.utterance = this.utterances.shift()!),
      done = (e?: any) => this.utterance === u && ((this.utterance = null), clearTimeout(this.utteringId), (!e || (e.error !== "canceled" && e.error !== "interrupted")) && this.drain());
    Object.assign(u, { voice, lang: voice?.lang || "", volume: this.config.feedback.volume, rate: this.config.feedback.rate, onend: done, onerror: done });
    clearTimeout(this.utteringId), (this.utteringId = setTimeout(() => ((u.onend = u.onerror = null), this.talker!.cancel(), done()), Math.max(8000, (u.text.split(/\s+/).length / (2 * u.rate)) * 1000 + 4000), this.signal));
    (this.state.speaking = true), this.talker.paused && this.talker.resume(), this.talker.speak(u);
  }
  public quiet(): void {
    (this.state.speaking = false), clearTimeout(this.utteredId), clearTimeout(this.utteringId), (this.utterance = null), (this.utterances.length = 0), this.talker?.cancel();
  }
  public reset(): void {
    this.LLM?.destroy?.(), (this.LLM = null);
  }
  public async *cloudStreaming(signal: AbortSignal): AsyncGenerator<string> {
    // prettier-ignore
    const r = await fetch(this.config.endpoint!, { method: "POST", headers: { "Content-Type": "application/json", ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) }, body: JSON.stringify({ model: this.config.persona.model, stream: true, messages: [{ role: "system", content: this.systemPrompt }, ...INITIALS, ...this.config.history] }), signal }),
      d: any = !r.ok && (await r.json().catch(NOOP));
    if (!r.ok || !r.body) throw new Error((isArr(d) ? d[0] : d)?.error?.message || `HTTP ${r.status}`);
    yield* readSSEStream(r.body);
  }

  public isLogical(path = "root"): boolean {
    return (!path || path === "root" || path === "*" || path.split(".")[0] in this.ctlr.logicRoot) && this.ctlr.isLogical(path);
  }
  public getLink(path = "root", isPath = true): string {
    return isPath ? (this.isLogical(path) ? this.plug.linked(fpath(path), path === "root" ? "*" : path, "goto", true) : fpath(path)) : this.plug.linked(this.ctlr.actions.entries[path]?.label || capitalize(uncamelize(path)), `advanced.actions.actions-detail-${path}`, "menu");
  }
  public getVoice(name = this.config.persona.voice, voices = this.talker?.getVoices(), rgx = VoiceAiPin.defaultRgx): SpeechSynthesisVoice | null {
    return !voices?.length ? null : (name !== "default" && voices.find((v) => v.name === name)) || (!navigator.onLine && voices.find((v) => rgx.test(v.name) && v.localService)) || null; // female pref if offline, else let internal logic rule
  }
  public get systemRoot(): any {
    return { media: this.media, state: this.ctlr.state, ...this.ctlr.config };
  }
  public get systemPrompt(): string {
    return `${AI_SYSTEM_PROMPT}${this.config.persona.preference ? `\nUser Preference: ${this.config.persona.preference}` : ""}`;
  }

  public override onDestroy(): void {
    clearTimeout(this.utteringId), this.stop(), this.reset(), this.texter?.destroy(), this.module.destroy(), super.onDestroy();
  }
}
let txId = 0;
const LLM = () => (window as any).LanguageModel || (window as any).ai?.languageModel,
  sepRgx = /.*?(?:(?<!\b[a-z]|\b(?:etc|vs|dr|mr|mrs|ms)|\d)[.!?]+[)"'\]]*\s+|\n+)/gis,
  extractSpeech = (raw = "", m = raw.match(/"speech"\s*:\s*"((?:[^"\\]|\\.)*)/)) => (m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""),
  // prettier-ignore
  cleanSpeech = (t = "") => t.replace(/<[^>]*>/g, "").replace(/\p{Extended_Pictographic}(?:[\uFE00-\uFE0F]|\u200D|\p{Emoji_Modifier})*/gu, "").replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim(),
  // prettier-ignore
  parseRes = (raw = "", json = raw.match(/\{[\s\S]*\}/)): AiResponse => { try { if (json) return JSON.parse(json[0]); } catch (_) {} return { speech: raw }; },
  canRetry = (e: any) => /429|500|502|503|504|unavailable|overload|rate limit|busy|failed to fetch/i.test(e?.message || String(e));

declare module "@defs/registries" {
  interface PinRegistryMap {
    "voice.ai": typeof VoiceAiPin;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    ai: boolean;
    aiStop: boolean;
  }
}

declare module "sia-reactor" {
  interface ReactorMeta {
    temporal?: unknown;
  }
}
