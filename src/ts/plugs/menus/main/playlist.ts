import { canOverride, type PlaylistPlug } from "@plugs/main/playlist";
import type { SettingsMenuItem } from "@plugs/settings/panel/types";
import { PLAY_ITEM_BUILD } from "@plugs/main/playlist/build";
import { mergeObjs } from "sia-reactor/utils";
import { AUDIO_EXTENSIONS, MATCH_URL_YOUTUBE, MATCH_URL_VIMEO } from "@utils/match";
import { inPanel } from "@utils/obj";

const getContent = (plug: PlaylistPlug, basic = true) => {
  if (plug.config.content) return plug.config.content;
  if (basic) return [{ media: { intent: { src: plug.media.state.src }, settings: { metadata: { title: plug.media.settings.metadata.title, artist: plug.media.settings.metadata.artist } }, status: { duration: plug.media.status.duration } }, settings: { time: { start: plug.settings.time.start } } }];
  const { title, artist, profile, artwork, chapterInfo, links } = plug.media.settings.metadata;
  return [{ ...mergeObjs(PLAY_ITEM_BUILD as any, { media: { intent: { src: plug.media.state.src, poster: plug.media.state.poster, tracks: plug.media.state.tracks }, settings: { metadata: { title, artist, profile, artwork, chapterInfo, links } }, status: { duration: plug.media.status.duration } }, settings: { time: { start: plug.settings.time.start }, controlPanel: { timeline: { previews: plug.settings.controlPanel.timeline.previews, marks: [...plug.settings.controlPanel.timeline.marks] } } } }) }];
};
const getBadge = (src = "") => (MATCH_URL_YOUTUBE.test(src) ? "YouTube" : MATCH_URL_VIMEO.test(src) ? "Vimeo" : AUDIO_EXTENSIONS.test(src) ? "Audio" : "");

export const getMainPlaylistMenu = (plug: PlaylistPlug, ctx = { editIdx: -1 }): SettingsMenuItem => {
  const can = (action: Parameters<typeof canOverride>[1]) => canOverride(plug.config, action);
  return {
    id: "playlist",
    label: "Playlist",
    icon: "playlist",
    widget: "drag-select",
    feature: "playlist",
    configPaths: ["playlist"],
    mediaPaths: ["state.currentItem", "state.src"],
    getValue: () => getContent(plug)[plug.media.state.currentItem]?.media.settings.metadata.title || `Item ${plug.media.state.currentItem + 1}`,
    getBadge: () => getBadge(plug.media.state.src),
    getOptions: () => getContent(plug).map((opt: any, i: number, _, src = opt.media.intent.src || "", dur = opt.media.status.duration, start = opt.settings.time.start) => ({ value: String(i), display: opt.media.settings.metadata.title || `Item ${i + 1}`, badge: getBadge(src), progress: dur && start ? Math.round((start / dur) * 100) : 0 })),
    onChange: (val: string) => plug.moveTo(Number(val)),
    onEdit: (idx: number) => ((ctx.editIdx = idx), plug.ctlr.plug("settings.panel")?.menu?.goTo("playlist-edit")),
    onReorder: (oldIdx: number, newIdx: number) => void plug.config.content?.splice(newIdx, 0, plug.config.content.splice(oldIdx, 1)[0]),
    onDelete: (idx: number) => t007.confirm?.(`Remove "${getContent(plug)[idx]?.media.settings.metadata.title || `Item ${idx + 1}`}" from your playlist? This cannot be undone.`, { id: `${plug.ctlr.config.id}-playlist-del-confirm`, rootElement: plug.ctlr.plug("settings.panel")?.menu?.el, confirmText: "Delete" })?.then((ok) => ok && plug.remove(idx)),
    canEdit: () => can("edit") && !!plug.config.content,
    canReorder: () => can("move") && (plug.config.content?.length || 0) > 1,
    canDelete: () => can("remove") && !!plug.config.content,
    hidden: {
      is: () => !!plug.config.content && inPanel(plug.settings.controlPanel, "playlist"),
      configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"], // feature -> 'playlist.content'
    },
    getTipHTML: () => `Navigate through${can("move") ? " or drag to reorder" : ""} your playlist.<br><small>Viewing <b>${plug.media.state.currentItem + 1}</b> of <b>${plug.config.content?.length || 1}</b>.</small>`,
    actions: [
      { id: "sort", getLabel: () => "Sort", icon: "sort", onClick: plug.sort, getDisabled: () => !plug.config.content, hidden: () => !can("move") },
      { id: "shuffle", getLabel: () => "Shuffle", icon: "shuffle", onClick: plug.shuffle, getDisabled: () => !plug.config.content, hidden: () => !can("move") },
      { id: "add", getLabel: () => "Add", icon: "add", onClick: () => plug.ctlr.plug("settings.panel")?.menu?.goTo("playlist-add"), hidden: () => !can("add") },
    ],
    items: [
      {
        id: "playlist-add",
        label: "Add to playlist",
        icon: "add",
        widget: "input",
        inputs: [
          { name: "src", label: "Media URL", placeholder: "https://youtu.be/...", type: "url", required: true, minLength: 10, helperText: { info: "Input any video or audio url" } },
          { name: "title", label: "Title", placeholder: "The Kosi Paradox", type: "text", minLength: 1, maxLength: 179 },
          { name: "artist", label: "Artist", placeholder: "Tobi007-del", type: "text", minLength: 1, maxLength: 179 },
        ],
        getValue: () => "",
        getTipHTML: () => "YouTube and Vimeo urls are supported, as well as direct public or local media urls (mp4, webm, mp3, etc)",
        onChange: (vals: any) => (plug.config.content = [...getContent(plug, false), mergeObjs(PLAY_ITEM_BUILD as any, { media: { intent: { src: vals.src }, settings: { metadata: { title: vals.title, artist: vals.artist } } } } as any)] as any),
      },
      {
        id: "playlist-edit",
        label: "Edit playlist item",
        icon: "edit",
        widget: "input",
        inputs: [
          { name: "src", label: "Media URL", placeholder: "https://youtu.be/...", type: "url", required: true, minLength: 10, value: () => getContent(plug)[ctx.editIdx]?.media.intent.src || "", helperText: { info: "Input any video or audio url" } },
          { name: "title", label: "Title", placeholder: "The Kosi Paradox", type: "text", minLength: 1, maxLength: 179, value: () => getContent(plug)[ctx.editIdx]?.media.settings.metadata.title || "" },
          { name: "artist", label: "Artist", placeholder: "Tobi007-del", type: "text", minLength: 1, maxLength: 179, value: () => getContent(plug)[ctx.editIdx]?.media.settings.metadata.artist || "" },
        ],
        getValue: () => "",
        onChange: (vals: any, c = plug.config.content, obj = c?.[ctx.editIdx]) => obj && ((obj.media.intent.src = vals.src), (obj.media.settings.metadata.title = vals.title), (obj.media.settings.metadata.artist = vals.artist)),
      },
    ],
  };
};

declare module "@defs/registries" {
  interface MenuRegistryMap {
    playlist: typeof getMainPlaylistMenu;
  }
}
