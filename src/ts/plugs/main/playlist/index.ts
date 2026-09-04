import { BasePlug } from "../../base";
import type { PlaylistConfig, PlaylistState } from "./types";
import { PLAYLIST_BUILD, PLAYLIST_ITEM_BUILD } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { mergeObjs, fanout, parsePathObj, deepClone } from "sia-reactor/utils";
import { silence } from "sia-reactor/modules";
import { isNum } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { safeNum } from "@utils/num";
import { smartFlatSort } from "@utils/file";
import { Controller } from "@core/controller";
import { getMediaMin } from "@utils/time";
import { CtlrMedia } from "@defs/contract";

export class PlaylistPlug extends BasePlug<PlaylistConfig, PlaylistState> {
  public static readonly plugName = "playlist";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = PLAYLIST_BUILD;

  constructor(ctlr: Controller, config = ctlr.config.playlist) {
    super(ctlr, config, { sortOrder: "asc" });
  }

  public override wire(): void {
    // Plug Listeners
    this.state.on("sortOrder", ({ value }) => (this.media.container.dataset.playlistSort = value), { init: true, signal: this.signal });
    // Ctlr Config Getters
    this.ctlr.config.get("playlist.content", (v) => (v?.length ? v : null), { signal: this.signal });
    // ---- Media Setters
    this.media.set("intent.currentItem", (term) => (isNum(term) ? term : this.config.content?.findIndex(({ media: m }) => m.settings.metadata.id === term || m.settings.metadata.title === term || isSameURL(m.intent.src, this.media.intent.src)) ?? -1), { signal: this.signal }); // #VALIDATOR: intent type conformation
    // ---- Config -------
    this.ctlr.config.set("playlist.content", (v) => (v ? (v.map((i) => mergeObjs(deepClone(PLAYLIST_ITEM_BUILD) as any, parsePathObj(i))) as any) : null), { init: true, signal: this.signal });
    // ---- Media Watchers
    for (const k of ["tech", "state.currentItem"] as const) this.media.watch(k, this.syncFeatures, { signal: this.signal });
    this.media.watch("state.poster", (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].media.intent.poster = v), { signal: this.signal });
    this.media.watch("status.duration", (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].media.status.duration = v), { signal: this.signal });
    for (const k of ["title", "artist", "profile", "artwork", "chapterInfo"] as const) this.media.watch(`settings.metadata.${k}`, (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].media.settings.metadata[k] = v as any), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    for (const k of ["title", "artist", "profile"] as const) this.media.watch(`settings.metadata.links.${k}`, (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].media.settings.metadata.links[k] = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.time.start", (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].settings.time.start = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    for (const k of ["previews", "marks"] as const) this.ctlr.config.watch(`settings.controlPanel.timeline.${k}`, (v) => this.config.content && !this.writing && (this.config.content[this.media.state.currentItem].settings.controlPanel.timeline[k] = v as any), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.currentItem", this.handleCurrentItemIntent, { capture: true, signal: this.signal });
    // ---- Config ---------
    this.ctlr.config.on("playlist.content", this.handleContent, { init: true, signal: this.signal, depth: 1 });
    this.ctlr.config.on("playlist.allowOverride", this.syncFeatures, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("previous", { fn: this.previous, keyboard: { phase: "keydown" } }, this.signal), this.ctlr.learn("next", { fn: this.next, keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  protected handleCurrentItemIntent(e: REvent<CtlrMedia, "intent.currentItem">): void {
    if (e.resolved) return;
    const item = this.config.content?.[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
    if (item) {
      this.media.state.currentItem = e.value as number;
      (this.writing = true), silence(() => (["settings", "media"] as const).forEach((p) => fanout(this[p], item[p], { cloneSets: true }))), (this.writing = false);
    }
    e.resolve(this.name);
  }
  private writing = false;

  protected handleContent({ currentTarget: { value } }: REvent<CtlrConfig, "playlist.content", 1>): void {
    this.syncFeatures();
    const pmdle = this.ctlr.plug("settings.persist")?.module,
      iidx = value?.findIndex(({ media: m }) => (m.settings.metadata.id && m.settings.metadata.id === this.media.settings.metadata.id) || isSameURL(m.intent.src, this.media.intent.src)) ?? -1, // intent index
      resync = () => (silence(() => (this.media.intent.currentItem = Math.max(0, iidx))), this.media.tick("intent.currentItem")); // #RE-TRIGGER: sync intent resolution
    pmdle && !pmdle.state.hydrated ? pmdle.state.wonce("hydrated", resync, { signal: this.signal }) : resync();
  }

  public previous(): void {
    const min = getMediaMin(this.media);
    if (safeNum(this.media.state.currentTime) - min >= this.media.settings.timePlayedMin) this.media.intent.currentTime = min;
    else if (this.media.features.previousItem) (this.media.intent.currentItem = this.media.state.currentItem - 1), (this.media.intent.paused = false);
  }
  public next(): void {
    if (this.config.content && this.media.features.nextItem) (this.media.intent.currentItem = this.media.state.currentItem + 1), (this.media.intent.paused = false);
  }

  public sort(order: "asc" | "desc" = this.state.sortOrder === "asc" ? "desc" : "asc", list = this.config.content): void {
    if (!list) return;
    this.state.sortOrder = order;
    const sorted = smartFlatSort(list, (i) => i.media.settings.metadata.title || "");
    this.config.content = order === "desc" ? sorted.reverse() : sorted;
  }
  public shuffle(list = this.config.content): void {
    if (!list) return;
    const shuffled = [...list];
    for (let i = shuffled.length - 1, j = Math.floor(Math.random() * (i + 1)); i > 0; i--) [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    this.config.content = shuffled;
  }
  public remove(index: number, list = this.config.content): void {
    list?.splice(index, 1), index === this.media.state.currentItem && list?.length && (this.media.intent.currentItem = Math.min(index, list.length - 1));
  }

  public syncFeatures(): void {
    this.media.features.playlist = (this.media.features.currentItem = !!this.config.content?.length) || this.config.allowOverride.add;
    (this.media.features.previousItem = this.media.state.currentItem > 0), (this.media.features.nextItem = !!this.config.content && this.media.state.currentItem < this.config.content.length - 1);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    playlist: typeof PlaylistPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    playlist: PlaylistConfig;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    playlist?: boolean;
    nextItem?: boolean;
    previousItem?: boolean;
  }
}

export type * from "./types";
export * from "./build";
