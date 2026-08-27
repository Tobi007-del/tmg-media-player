import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { formatMediaTime } from "@utils/time";
import { capitalize } from "@utils/str";
import { isStr, isNum, getUniqueOpts } from "@utils/obj";
import type { MetadataPlug } from "../../settings/metadata";
import { getTrackLabel } from "@utils/media";
import { formatSize } from "@utils/file";
import { UITuple } from "@defs/UIOptions";
import { silence } from "sia-reactor/modules";

export const getSettingsMetadataMenu = (plug: MetadataPlug): SettingsMenuItem[] => [
  { id: "loop", label: "Loop", icon: "loop", widget: "toggle", getValue: () => (plug.media.state.loop ? "On" : "Off"), onChange: (val: boolean) => (plug.media.intent.loop = val), mediaPaths: ["state.loop"] },
  {
    id: "quality",
    label: "Quality",
    icon: "quality",
    widget: "select",
    feature: "levels",
    hidden: () => plug.media.status.levels.length <= 1,
    getTipHTML: (bw = plug.media.status.bandwidth) => `Adjust ${plug.media.type} quality or use auto (adaptive). <br> ${bw ? `<small>Your last known network speed was ~<b>${formatSize(bw, 1).replace(/(?:(B|bytes))$/i, "bps")}</b>.</small>` : ""}`,
    getValue() {
      const list = plug.media.status.levels,
        opts = this.getOptions!() as UITuple<number>[];
      return plug.media.state.autoLevel ? opts.at(-1)!.display : !list.length || plug.media.state.currentLevel === -1 ? "" : opts.find((o) => o.value === plug.media.state.currentLevel)?.display || "";
    },
    getOptions() {
      const list = plug.media.status.levels;
      if (!list.length) return [{ value: -1, display: "Auto" }];
      const getOpt = (i: number, t: any = list[i]) => {
        const label = isStr(t) ? capitalize(t) : t?.height ? `${t.height}p${t.frameRate && Math.round(t.frameRate) > 30 ? Math.round(t.frameRate) : ""}` : t?.label || t?.id || "Unknown",
          h = t?.height || parseInt(label.match(/\d{3,}/)?.[0] || "0");
        // prettier-ignore
        return { value: i, display: label, infoText: (t?.bandwidth || t?.bitrate) ? formatSize(t.bandwidth || t.bitrate, 1).replace(/(?:(B|bytes))$/i, "bps") : "", badge: plug.config.levelBadges[`${h}p`] || Object.entries(plug.config.levelBadges).find(([k]) => h >= parseInt(k))?.[1], _h: h };
      };
      const opts = getUniqueOpts(Array.from(list, (_, i) => getOpt(i))),
        { display, infoText, badge } = plug.media.state.autoLevel ? getOpt(plug.media.state.currentLevel) : { display: "Unknown", infoText: "", badge: undefined };
      return opts.length && (opts[0] as any)._h < (opts[opts.length - 1] as any)._h && opts.reverse(), opts.push({ value: -1, display: `Auto${display !== "Unknown" ? ` (${display})` : ""}`, infoText, badge }), opts;
    },
    onChange: (val: number) => (val === -1 ? (plug.media.intent.autoLevel = true) : (plug.media.intent.currentLevel = val)),
    mediaPaths: ["status.levels", "state.currentLevel", "state.autoLevel"],
  },
  {
    id: "audioTracks",
    label: "Audio track",
    icon: "audioTrack",
    widget: "select",
    feature: "audioTracks",
    hidden: () => plug.media.status.audioTracks.length <= 1,
    getValue() {
      if (plug.media.state.currentAudioTrack === -1 || !plug.media.status.audioTracks.length) return "";
      return (this.getOptions!() as UITuple<number>[]).find((o) => o.value === plug.media.state.currentAudioTrack)?.display || "";
    },
    getOptions() {
      const list = plug.media.status.audioTracks;
      return !list.length ? [] : getUniqueOpts(Array.from(list, (_t, i) => ({ value: i, display: getTrackLabel(list, i) })));
    },
    onChange: (val: number) => (plug.media.intent.currentAudioTrack = val),
    mediaPaths: ["status.audioTracks", "state.currentAudioTrack"],
  },
  {
    id: "videoTracks",
    label: "Video track",
    icon: "videoTrack",
    widget: "select",
    feature: "videoTracks",
    hidden: () => plug.media.status.videoTracks.length <= 1,
    getValue() {
      if (plug.media.state.currentVideoTrack === -1 || !plug.media.status.videoTracks.length) return "";
      return (this.getOptions!() as UITuple<number>[]).find((o) => o.value === plug.media.state.currentVideoTrack)?.display || "";
    },
    getOptions() {
      const list = plug.media.status.videoTracks;
      return !list.length ? [] : getUniqueOpts(Array.from(list, (_t, i) => ({ value: i, display: getTrackLabel(list, i) })));
    },
    onChange: (val: number) => (plug.media.intent.currentVideoTrack = val),
    mediaPaths: ["status.videoTracks", "state.currentVideoTrack"],
  },
  {
    id: "captions",
    label: "Captions",
    icon: "captions",
    widget: "select",
    feature: "textTracks",
    getValue() {
      if (plug.media.state.currentTextTrack === -1 || !plug.media.status.textTracks.length) return "Off";
      return (this.getOptions!() as UITuple<number>[]).find((o) => o.value === plug.media.state.currentTextTrack)?.display || "Off";
    },
    getOptions() {
      const list = plug.media.status.textTracks;
      return !list.length ? [] : [{ value: -1, display: "Off" }, ...getUniqueOpts(Array.from(list, (_t, i) => ({ value: i, display: getTrackLabel(list, i) })))];
    },
    onChange: (val: number) => (plug.media.intent.currentTextTrack = val),
    mediaPaths: ["status.textTracks", "state.currentTextTrack", "features.textTracks"],
  },
  {
    id: "chapters",
    label: "Chapters",
    icon: "chapters",
    widget: "select",
    feature: "currentChapter",
    hidden: () => plug.media.settings.metadata.chapterInfo.length <= 1,
    getTipHTML: (len = plug.media.settings.metadata.chapterInfo.length) => (len ? `Navigate through your ${plug.media.type}'s chapters.<br><small>Viewing <b>${plug.media.state.currentChapter + 1}</b> / <b>${plug.media.settings.metadata.chapterInfo.length}</b>.</small>` : ""),
    getValue() {
      const list = plug.media.settings.metadata.chapterInfo;
      return !list.length || plug.media.state.currentChapter === -1 ? "" : list[plug.media.state.currentChapter]?.title || `Chapter ${plug.media.state.currentChapter + 1}`;
    },
    getOptions() {
      const list = plug.media.settings.metadata.chapterInfo;
      return !list.length ? [] : list.map((c: any, i: number) => ({ value: i, display: c.title || `Chapter ${i + 1}`, infoText: isNum(c.startTime) ? formatMediaTime({ time: c.startTime }) : undefined }));
    },
    onChange: (val: number) => silence(() => (plug.media.intent.currentChapter = val)),
    mediaPaths: ["settings.metadata.chapterInfo", "state.currentChapter", "features.currentChapter"],
  },
];

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.metadata": typeof getSettingsMetadataMenu;
  }
}
