import { Controller } from "@core/controller";
import { ATTR, controllers } from "./runtime";
import { loadResource } from "@utils/dom";
import { isIter, isObj, setHTMLConfig } from "@utils/obj";
import { luid } from "@utils/str";
import { CONFIG_BUILD } from "@consts/config";
import type { CtlrConfig } from "@defs/config";
import { DeepPartial, Paths, PathValue } from "sia-reactor";
import { deepClone, mergeObjs, parsePathObj } from "sia-reactor/utils";

export type BuildParam = DeepPartial<CtlrConfig> & Record<Paths<CtlrConfig>, PathValue<CtlrConfig>>;

export class Player {
  public build: CtlrConfig = deepClone(CONFIG_BUILD) as any;
  public deployed: boolean = false;
  public medium: HTMLMediaElement | null = null;
  public controller: Controller | null = null;
  public get ctlr(): Controller | null {
    return this.controller;
  }

  constructor(build = {} as BuildParam) {
    this.configure({ ...build, id: build.id ?? `${luid()}_Controller_${controllers.length + 1}` });
  }

  public async attach(medium: HTMLMediaElement) {
    if (isIter(medium)) return this.notice({ error: "An iterable argument cannot be attached to the TMG media player", tip: "Loop over the iterable argument to instantiate a new 'tmg.Player' for each" });
    if (this.deployed) return medium;
    medium.tmgPlayer?.detach(), (medium.tmgPlayer = this), (this.medium = medium);
    let dev, idx;
    controllers.push(this.build.id as any), (dev = this.build.devMode) && console.time(`TMG Controller ${(idx = controllers.length + 1)} Attach`);
    return await this.deploy(), dev && console.timeEnd(`TMG Controller ${idx} Attach`), this.ctlr?.fire("tmgattach", this.ctlr.flags), medium;
  }
  public detach() {
    if (!this.deployed) return;
    const medium = this.ctlr?.destroy() || this.medium!;
    this.ctlr && controllers.splice(controllers.indexOf(this.ctlr), 1);
    medium.classList.remove(`tmg-${medium.tagName.toLowerCase()}`, "tmg-media", "tmg-host");
    medium[ATTR] = this.deployed = false;
    return (medium.tmgPlayer = this.controller = this.medium = null), medium;
  }

  private async deploy() {
    if (this.deployed || !this.medium?.isConnected) return;
    if (!(this.medium instanceof HTMLMediaElement)) return this.notice({ error: `Could not deploy custom controls on the '${(this.medium as HTMLElement).tagName}' element as it is not supported`, warning: "Only the 'VIDEO' and 'AUDIO' elements are currently supported" });
    this.medium[ATTR] = this.deployed = true;
    this.medium.classList.add(`tmg-${this.medium.tagName.toLowerCase()}`, "tmg-media", "tmg-host");
    await Promise.allSettled([this.fetchConfig(), loadResource(window.TMG_MEDIA_CSS_SRC!), loadResource(window.T007_TOAST_JS_SRC!, "script"), loadResource(window.T007_INPUT_JS_SRC!, "script")]);
    controllers[controllers.indexOf(this.build.id as any)] = this.controller = new Controller(this.medium, this.build);
  }

  private queryBuild(): boolean {
    return !this.deployed || (this.notice({ warning: "Already deployed the custom controls of your build configuration", tip: "Consider setting your build configuration before attaching your media element" }), false);
  }
  public configure(build: BuildParam, query = true): void {
    if (isObj(build) && (!query || this.queryBuild())) this.build = mergeObjs(this.build, parsePathObj(build));
  }
  public async fetchConfig(build: object = {}, value = this.medium?.getAttribute("tmg")) {
    if (value)
      try {
        if (value.includes(".json")) {
          const res = await fetch(value);
          if (!res.ok) throw new Error(`JSON file not found at provided URL!. Status: ${res.status}`);
          build = await res.json();
        } else build = JSON.parse(value);
      } catch (err) {
        this.notice({ error: (err as Error).message, warning: `Valid JSON is required for parsing your build configuration` });
      }
    for (const attr of this.medium?.getAttributeNames().filter((a) => a.startsWith("tmg--")) || []) setHTMLConfig(build, attr, this.medium!.getAttribute(attr) || "");
    this.configure(build as BuildParam, false);
  }

  private notice({ error, warning, tip }: Partial<Record<"error" | "warning" | "tip", string>>): void {
    if (this.build.devMode) error && console.error(`[TMG Player] ${error}`), warning && console.warn(`[TMG Player] ${warning}`), tip && console.info(`[TMG Player] ${tip}`);
  }
}

export function getCtlrIdx(ctlr: Controller): number {
  const i = controllers.indexOf(ctlr.config.id as any);
  return i === -1 ? controllers.indexOf(ctlr) : i; // a magician never reveals his tricks :)
}
