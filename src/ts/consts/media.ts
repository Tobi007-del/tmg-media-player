import { createTimeRanges } from "@utils/time";
import type { MediaIntent, MediaState, MediaStatus, MediaSettings } from "@defs/contract";
import { DeepPartial } from "sia-reactor";

// DEFAULT STATE (The Reality)
export const MEDIA_STATE_BUILD: Partial<MediaState> = {
  // Core
  src: "", // 1st for correct fanout sequence
  currentTime: 0,
  paused: true,
  // Engine
  volume: 100,
  muted: false,
  brightness: 100,
  dark: false,
  playbackRate: 1,
  // Modes
  pictureInPicture: false,
  fullscreen: false,
  theater: false,
  miniplayer: false,
  locked: false,
  // Casting
  airplay: false,
  cast: false,
  // VR / XR
  xrSession: false,
  xrMode: "inline",
  xrReferenceSpace: "local",
  projection: "flat",
  stereoMode: "none",
  fieldOfView: 90, // Standard FOV
  viewRatio: 16 / 9, // Standard Aspect Ratio
  panningX: 0,
  panningY: 0,
  panningZ: 0,
  xrInputSource: [],
  // Tracks & Streaming
  currentChapter: -1,
  currentTextTrack: -1,
  currentAudioTrack: -1,
  currentVideoTrack: -1,
  currentLevel: -1,
  textVisible: true,
  autoLevel: true, // Adaptive Streaming on by default
  // HTML Attributes
  poster: "",
  autoplay: false,
  loop: false,
  preload: "auto",
  playsInline: true,
  crossOrigin: null,
  controls: false, // We disable native controls
  controlsList: "",
  disablePictureInPicture: false,
  // HTML Lists
  sources: [],
  tracks: [],
  // Live Content
  live: true,
  // Misc
  objectFit: "contain",
};

// DEFAULT INTENT (The Wishes)
export const MEDIA_INTENT_BUILD: Partial<MediaIntent> = MEDIA_STATE_BUILD as MediaIntent; // Intent starts as State but can diverge

// DEFAULT INFO (The Facts)
export const MEDIA_STATUS_BUILD: Partial<MediaStatus> = {
  // Network
  readyState: 0, // HAVE_NOTHING
  networkState: 0, // EMPTY
  error: null,
  bandwidth: null,
  // Buffering
  waiting: false,
  stalled: false,
  seeking: false,
  buffered: createTimeRanges(),
  played: createTimeRanges(),
  seekable: createTimeRanges(),
  duration: NaN, // HTML5 Standard for "Unknown"
  ended: false,
  // Dimensions
  videoWidth: 0,
  videoHeight: 0,
  // Gates
  loadedMetadata: false,
  loadedData: false,
  canPlay: false,
  canPlayThrough: false,
  // Lists (We start with empty lists or nulls)
  textTracks: [],
  audioTracks: [],
  videoTracks: [],
  levels: [],
  // Active
  activeCue: null,
  // VR
  xrCapabilities: null,
  // Live Content
  isLive: false,
  canSeekLive: false,
};

// DEFAULT SETTINGS (The Config)
export const MEDIA_SETTINGS_BUILD: DeepPartial<MediaSettings> = {
  // Defaults
  defaultMuted: false,
  defaultPlaybackRate: 1,
  // Streams
  srcObject: null,
  // Metadata
  metadata: {
    title: "",
    artist: "",
    profile: "",
    album: "",
    artwork: [],
    chapterInfo: [],
    links: {
      title: "",
      artist: "",
      profile: "",
    },
    allowOverride: true,
  },
  protection: null,
  // Live Content
  liveTolerance: 6,
  minDVRWindow: 60,
};
