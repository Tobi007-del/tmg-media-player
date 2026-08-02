import { Controller } from "@core/controller";
import { Controllers } from "./runtime";
import { loadResource } from "@utils/dom";
import { isIter, isObj, setHTMLConfig } from "@utils/obj";
import { luid } from "@utils/str";
import { CONFIG_BUILD } from "@consts/config";
import type { CtlrConfig } from "@defs/config";
import { DeepPartial, Paths, PathValue } from "sia-reactor";
import { mergeObjs, parsePathObj } from "sia-reactor/utils";

export type BuildParam = DeepPartial<CtlrConfig> & Record<Paths<CtlrConfig>, PathValue<CtlrConfig>>;

export class Player {
  private medium: HTMLMediaElement | null = null;
  private active: boolean = false;
  private _build: CtlrConfig = structuredClone(CONFIG_BUILD) as CtlrConfig;
  private controller: Controller | null = null;
  public get Controller() {
    return this.controller;
  }
  public get build(): CtlrConfig {
    return this._build;
  }
  public set build(build: BuildParam) {
    this.configure(build);
  }

  constructor(build: BuildParam = {} as BuildParam) {
    this.configure({ ...build, id: build.id ?? `${luid()}_Controller_${Controllers.length + 1}` });
  }

  private queryBuild(): boolean {
    return !this.active || (this.notice({ error: "Already deployed the custom controls of your build configuration", tip: "Consider setting your build configuration before attaching your media element" }), false);
  }
  public configure(build: BuildParam): void {
    if (this.queryBuild() && isObj(build)) this._build = mergeObjs(this._build, parsePathObj(build));
  }

  public async attach(medium: HTMLMediaElement) {
    if (isIter(medium)) return this.notice({ error: "An iterable argument cannot be attached to the TMG media player", tip: "Consider looping the iterable argument to instantiate a new 'tmg.Player' for each" });
    if (this.active) return medium;
    medium.tmgPlayer?.detach();
    Controllers.push(this.build.id as any); // dummy for liveness
    this.build.debug && console.time(`TMG Controller ${Controllers.length} Attach`);
    medium.tmgPlayer = this;
    this.medium = medium;
    await this.fetchOptions(), await this.deployController();
    this.build.debug && console.timeEnd(`TMG Controller ${Controllers.indexOf(this.controller!) + 1} Attach`);
    return this.controller?.fire("tmgattach", this.controller.payload), medium;
  }
  public detach() {
    if (!this.active) return;
    const medium = this.controller?.destroy() ?? ({} as any);
    this.controller && Controllers.splice(Controllers.indexOf(this.controller), 1);
    medium.classList?.remove(`tmg-${medium.tagName.toLowerCase()}`, "tmg-media", "tmg-host");
    medium.tmgcontrols = this.active = false;
    // this.controller?.fire("tmgdetach", this.controller.payload);
    return (medium.tmgPlayer = this.controller = this.medium = null), medium;
  }

  public async fetchOptions() {
    if (!this.medium) return;
    if (this.medium.getAttribute("tmg")?.includes(".json"))
      await fetch(this.medium.getAttribute("tmg")!)
        .then((res) => {
          if (!res.ok) throw new Error(`JSON file not found at provided URL!. Status: ${res.status}`);
          return res.json();
        })
        .then((json) => this.configure(json))
        .catch(({ message }) => this.notice({ error: message, tip: "A valid JSON file is required for parsing your build configuration" }));
    const build = {} as BuildParam,
      attributes = this.medium.getAttributeNames().filter((attr) => attr.startsWith("tmg--"));
    for (const attr of attributes) setHTMLConfig<BuildParam>(build, attr as any, this.medium!.getAttribute(attr)!);
    this.configure(build);
  }

  private async deployController() {
    if (this.active || !this.medium?.isConnected) return;
    if (!(this.medium instanceof HTMLMediaElement)) return this.notice({ error: `Could not deploy custom controls on the '${(this.medium as HTMLElement).tagName}' element as it is not supported`, warning: "Only the 'VIDEO' and 'AUDIO' elements are currently supported", tip: "" });
    this.medium.controls = false;
    this.medium.tmgcontrols = this.active = true;
    this.medium.classList.add(`tmg-${this.medium.tagName.toLowerCase()}`, "tmg-media", "tmg-host");
    await Promise.all([loadResource(window.TMG_MEDIA_CSS_SRC!), loadResource(window.T007_TOAST_JS_SRC!, "script", { module: true }), loadResource(window.T007_INPUT_JS_SRC!, "script")]); // await
    Controllers[Controllers.indexOf(this.build.id as any)] = this.controller = new Controller(this.medium, this._build);
  }

  private notice({ error, warning, tip }: Partial<Record<"error" | "warning" | "tip", string>>): void {
    if (this.build.debug) error && console.error(`[TMG Player] ${error}`), warning && console.warn(`[TMG Player] ${warning}`), tip && console.info(`[TMG Player] ${tip}`);
  }
}

export function getCtlrIdx(ctlr: Controller): number {
  const i = Controllers.indexOf(ctlr.config.id as any);
  return i === -1 ? Controllers.indexOf(ctlr) : i; // a magician never reveals his tricks :)
}
