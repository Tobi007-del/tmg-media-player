import { createTimeRanges } from "@utils/time";
import type { MediaIntent, MediaState, MediaStatus, MediaSettings } from "@defs/contract";

// DEFAULT STATE (The Reality)
export const MEDIA_STATE_BUILD: MediaState = {
  // Core
  src: "",
  currentTime: 0,
  paused: true,
  // Engine
  volume: 1,
  muted: false,
  brightness: 100,
  dark: false,
  playbackRate: 1,
  // Modes
  pictureInPicture: false,
  fullscreen: false,
  theater: false,
  miniplayer: false,
  // Casting
  airplay: false,
  chromecast: false,
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
  currentTextTrack: -1,
  currentAudioTrack: -1,
  currentVideoTrack: -1,
  autoLevel: true, // Adaptive Streaming on by default
  currentLevel: -1,
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
  // Misc
  objectFit: "contain",
};

// DEFAULT INTENT (The Wishes)
export const MEDIA_INTENT_BUILD: MediaIntent = MEDIA_STATE_BUILD as MediaIntent; // Intent starts as State but can diverge

// DEFAULT INFO (The Facts)
export const MEDIA_STATUS_BUILD: MediaStatus = {
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
  // VR
  xrCapabilities: null,
  // Active
  activeCue: null,
};

// DEFAULT SETTINGS (The Config)
export const MEDIA_SETTINGS_BUILD: MediaSettings = {
  defaultMuted: false,
  defaultPlaybackRate: 1,
  protection: null,
  srcObject: null,
};
