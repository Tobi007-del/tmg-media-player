import { BasePlug } from "../../base";
import type { PlaylistConfig, PlaylistState } from "./types";
import { PLAYLIST_BUILD, PLAYLIST_ITEM_BUILD, PLAYLIST_ITEM_FORMATTED } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { mergeObjs, fanout, parsePathObj, deepClone, getPaths, setPath, withMeta } from "sia-reactor/utils";
import { silence, transaction } from "sia-reactor/modules";
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
  public get item() {
    return this.config.content?.[this.media.state.currentItem];
  }

  constructor(ctlr: Controller, config = ctlr.config.playlist) {
    super(ctlr, config, { sortOrder: "asc" });
  }

  public override wire(): void {
    // Plug Listeners
    this.state.on("sortOrder", ({ value }) => (this.media.container.dataset.playlistSort = value), { init: true, signal: this.signal });
    // Ctlr Config Getters
    this.ctlr.config.get("playlist.content", (v) => (v?.length ? v : null), { signal: this.signal }); // nvm length checks
    // ---- Media Setters
    this.media.set("intent.currentItem", (term) => (isNum(term) ? term : this.config.content?.findIndex(({ media: m }) => m.settings.metadata.id === term || m.settings.metadata.title === term || isSameURL(m.intent.src, this.media.intent.src)) ?? -1), { signal: this.signal }); // #VALIDATOR: intent type conformation
    // ---- Config --------
    silence(() => this.ctlr.config.set("playlist.content", (v) => (v ? (v.map((i: any) => (i && i[PLAYLIST_ITEM_FORMATTED] ? i : ((i = mergeObjs(deepClone(PLAYLIST_ITEM_BUILD) as any, parsePathObj(i))), (i[PLAYLIST_ITEM_FORMATTED] = true), i))) as any) : null), { init: true, signal: this.signal })); // silent init
    // ---- Media & Config Watchers
    for (const k of ["tech", "state.currentItem"] as const) this.media.watch(k, this.syncFeatures, { signal: this.signal });
    for (const p of getPaths(PLAYLIST_ITEM_BUILD, "*", { leavesOnly: true }))
      if (p.startsWith("media.")) {
        const path = p.slice(6);
        this.media.on((!path.includes("intent") ? path : path.replace("intent", "state")) as any, (e) => !e.internal && this.item && silence(() => setPath(this.item!, p as any, e.currentTarget.value)), { init: this.ctlr.flags.wired && "auto", signal: this.signal });
      } else !p.startsWith("ads.") && this.ctlr.config.on(p as any, (e) => !e.internal && this.item && silence(() => setPath(this.item!, p as any, e.currentTarget.value)), { init: this.ctlr.flags.wired && "auto", signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.currentItem", this.handleCurrentItemIntent, { capture: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("playlist.allowOverride", this.syncFeatures, { signal: this.signal });
    this.ctlr.config.on("playlist.content", this.handleContent, { init: true, signal: this.signal, depth: 1 });
    // Post Wiring
    this.ctlr.learn("previous", { fn: this.previous, keyboard: { phase: "keydown" } }, this.signal), this.ctlr.learn("next", { fn: this.next, keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  protected handleCurrentItemIntent(e: REvent<CtlrMedia, "intent.currentItem">): void {
    if (e.resolved) return;
    const item = this.config.content?.[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
    if (item) {
      this.media.state.currentItem = e.value as number;
      withMeta({ internal: true, silent: true }, () => (["settings", "media"] as const).forEach((p) => fanout(this[p], item[p], { cloneSets: true })));
    }
    e.resolve(this.name);
  }

  protected handleContent({ currentTarget: { value }, internal }: REvent<CtlrConfig, "playlist.content", 1>): void {
    this.syncFeatures();
    if (internal) return;
    const pmdle = this.ctlr.plug("settings.persist")?.module,
      iidx = value?.findIndex(({ media: m }) => (m.settings.metadata.id && m.settings.metadata.id === this.media.settings.metadata.id) || isSameURL(m.intent.src, this.media.intent.src)) ?? -1, // intent index
      resync = () => (silence(() => (this.media.intent.currentItem = Math.max(0, iidx))), this.media.tick("intent.currentItem")); // #RE-TRIGGER: sync intent resolution
    pmdle && !pmdle.state.hydrated ? pmdle.state.wonce("hydrated", resync, { signal: this.signal }) : resync();
  }

  public moveTo(i: number): void {
    (this.media.intent.currentItem = i), this.media.stall(() => silence(() => (this.media.intent.paused = false)));
  }
  public previous(): void {
    const min = getMediaMin(this.media);
    if (this.media.status.loadedData && safeNum(this.media.state.currentTime) - min > this.media.settings.minTimePlayed) return (this.media.intent.currentTime = min), this.ctlr.notify?.("mediaPrevious");
    this.media.features.previousItem && this.moveTo(this.media.state.currentItem - 1);
  }
  public next(): void {
    this.media.features.nextItem && this.moveTo(this.media.state.currentItem + 1);
  }

  public sort(order: "asc" | "desc" = this.state.sortOrder === "asc" ? "desc" : "asc", list = this.config.content): void {
    if (!list) return;
    this.state.sortOrder = order;
    const sorted = smartFlatSort(list, (i) => i.media.settings.metadata.title || "");
    transaction(() => (this.config.content = order === "desc" ? sorted.reverse() : sorted), "Playlist sort");
  }
  public shuffle(list = this.config.content): void {
    if (!list) return;
    const shuffled = [...list];
    for (let i = shuffled.length - 1, j = Math.floor(Math.random() * (i + 1)); i > 0; i--) [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    transaction(() => (this.config.content = shuffled), "Playlist shuffle");
  }
  public move(from: number, to: number, list = this.config.content): void {
    if (!list || from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const c = [...list];
    c.splice(to, 0, c.splice(from, 1)[0]);
    transaction(() => (this.config.content = c), "Playlist reorder");
  }
  public remove(i: number, list = this.config.content): void {
    if (!list || i < 0 || i >= list.length) return;
    transaction((next = list.filter((_, idx) => idx !== i), ov = i === this.media.state.currentItem) => {
      withMeta({ internal: ov }, () => (this.config.content = next));
      if (ov) (this.media.intent.currentItem = next.length ? Math.min(i, next.length - 1) : 0), this.media.tick("intent.currentItem"), (this.media.intent.paused = true);
    }, "Playlist item remove");
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("playlist", this.config.content || (!this.media.status.ads && canOverride(this.config, "add"))), this.media.tech.polyfill("currentItem", this.config.content);
    this.media.tech.polyfill("previousItem", this.media.state.currentItem > 0), this.media.tech.polyfill("nextItem", this.config.content && this.media.state.currentItem < this.config.content.length - 1);
  }
}

export const canOverride = (config: PlaylistConfig, action: "add" | "edit" | "move" | "remove") => config.allowOverride === true || (config.allowOverride && config.allowOverride[action] === true);

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
  interface MediaFeaturesExt {
    playlist: boolean;
    nextItem: boolean;
    previousItem: boolean;
  }
}

declare module "sia-reactor" {
  interface ReactorMeta {
    internal?: boolean;
    silent?: boolean; // incase timeTravel ain't augmented
  }
}

export type * from "./types";
export * from "./build";
