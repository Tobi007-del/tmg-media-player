import { BasePlug } from "../../base";
import type { Playlist, PlaylistItemConfig } from "./types";
import { PLAYLIST_BUILD, PLAYLIST_ITEM_BUILD } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent, NOOP } from "sia-reactor";
import { mergeObjs, fanout, parsePathObj } from "sia-reactor/utils";
import { isBool } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { safeNum } from "@utils/num";
import { Controller } from "@core/controller";

export class PlaylistPlug extends BasePlug<Playlist> {
  public static readonly plugName = "playlist";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = PLAYLIST_BUILD;
  public get atFirst() {
    return this.state.currentIndex <= 0;
  }
  public get atLast() {
    return !this.ctlr.config.playlist || this.state.currentIndex >= this.config!.length - 1;
  }

  constructor(ctlr: Controller, config: Playlist = ctlr.config.playlist) {
    super(ctlr, config, { currentIndex: 0 });
  }

  public override wire(): void {
    // Ctlr Config Getters
    this.ctlr.config.get("playlist", (v) => (v?.length ? v : null), { signal: this.signal }); // #VIRTUAL: reliable optional chaining
    // ----------- Setters
    this.ctlr.config.set("playlist", (v) => v?.map((i) => mergeObjs(PLAYLIST_ITEM_BUILD as Playlist, parsePathObj(i))) ?? null, { init: true, signal: this.signal });
    // ----------- Watchers
    this.ctlr.config.watch("settings.time.start", (v) => this.ctlr.config.playlist && (this.config![this.state.currentIndex].settings.time.start = v), { signal: this.signal, init: "auto" });
    // ----------- Listeners
    this.ctlr.config.on("playlist", this.handle, { signal: this.signal, init: true, depth: 1 });
    // Post Wiring
    const keys = this.ctlr.plug("settings.keys");
    keys?.register("prev", () => (this.previous(), this.ctlr.plug("settings.notifiers")?.notify("mediaprev")), { phase: "keydown" });
    keys?.register("next", () => (this.next(), this.ctlr.plug("settings.notifiers")?.notify("medianext")), { phase: "keydown" });
  }

  protected handle({ currentTarget: { value: list }, root }: REvent<CtlrConfig, "playlist", 1>): void {
    if (this.media.status.readyState < 1) return;
    const v = list?.find((v) => (v.media.id && v.media.id === root.media.id) || isSameURL(v.startup.intent.src, this.media.state.src));
    this.state.currentIndex = (v && list?.indexOf(v)) ?? 0;
    v ? this.applyItem(v, false) : this.moveTo(this.state.currentIndex);
  }

  protected applyItem(item: PlaylistItemConfig, _reset = true): void {
    fanout(this.ctlr.config.media, item.media, { merge: true, depth: 2 });
    fanout(this.ctlr.config.settings, item.settings);
    this.ctlr.plug("settings.timeTravel")?.module.untrack(), fanout(this.media, item.startup), this.media.stall(this.ctlr.plug("settings.timeTravel")?.module.track ?? NOOP);
  }

  public moveTo(index: number, shouldPlay?: boolean): void {
    if (!this.ctlr.config.playlist) return;
    this.state.currentIndex = index;
    this.applyItem(this.config![index]);
    if (isBool(shouldPlay)) this.media.intent.paused = !shouldPlay;
  }

  public previous(): void {
    if (safeNum(this.media.state.currentTime) >= 3) (this.media.intent.currentTime = 0), (this.media.intent.paused = false);
    else if (this.ctlr.config.playlist && this.state.currentIndex > 0) this.moveTo(this.state.currentIndex - 1, true);
  }

  public next(): void {
    if (!this.ctlr.config.playlist) return;
    if (this.state.currentIndex < this.config!.length - 1) this.moveTo(this.state.currentIndex + 1, true);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    playlist: typeof PlaylistPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    playlist: Playlist;
  }
}

export type * from "./types";
export * from "./build";
