/*
 * Portions of this code are derived from react-player
 * https://github.com/cookpete/react-player
 * Licensed under the MIT License
 * Copyright (c) 2017 Pete Cook
 */

// ===========================================================================
// MEDIA EXTENSION MATCHERS
// ===========================================================================
export const FILE_EXTENSIONS = /\.([a-z0-9]+)(?:[?#].*)?$/i;
export const AUDIO_EXTENSIONS = /\.(m4a|m4b|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|og[ga]|spx|flac|wma|opus|midi?)(#t=[,\d+]+)?($|\?)/i;
export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|mpg|mpeg|og[gv]|m4v|flv|wmv|3gp|3g2|ts)(#t=[,\d+]+)?($|\?)/i;
export const MEDIA_EXTENSIONS = new RegExp(`(?:${VIDEO_EXTENSIONS.source}|${AUDIO_EXTENSIONS.source})`, "i");
export const HLS_EXTENSIONS = /\.(m3u8)($|\?)/i;
export const DASH_EXTENSIONS = /\.(mpd)($|\?)/i;

// ===========================================================================
// PLATFORM URL MATCHERS
// ===========================================================================

/** Match Mux m3u8 URLs without the extension so users can use hls.js with Mux */
export const MATCH_URL_MUX = /stream\.mux\.com\/(?!\w+\.m3u8)(\w+)/;

/** Matches YouTube watch, embed, shorts, live, and nocookie URLs */
export const MATCH_URL_YOUTUBE = /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})|youtube\.com\/playlist\?list=|youtube\.com\/user\//;
/** Matches YouTube video IDs, find in `[1]` of `url.match(MATCH_ID_YOUTUBE)` return value if defined */
export const MATCH_ID_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|live\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i; // [1] = videoId

/** Matches Vimeo URLs, explicitly ignoring their progressive redirect links */
export const MATCH_URL_VIMEO = /vimeo\.com\/(?!progressive_redirect).+/;
/** Matches Vimeo video IDs, find in `[1]` of `url.match(MATCH_ID_VIMEO)` return value if defined; find the hash param in `[2]` */
export const MATCH_ID_VIMEO = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w-]+))?/i;

/** Matches Wistia embeds and medias */
export const MATCH_URL_WISTIA = /(?:wistia\.(?:com|net)|wi\.st)\/(?:medias|embed)\/(?:iframe\/)?([^?]+)/;

/** Matches Spotify open links */
export const MATCH_URL_SPOTIFY = /open\.spotify\.com\/(\w+)\/(\w+)/i;

/** Matches Twitch streams and VODs */
export const MATCH_URL_TWITCH = /(?:www\.|go\.)?twitch\.tv\/([a-zA-Z0-9_]+|(videos?\/|\?video=)\d+)($|\?)/;

/** Matches TikTok video and share links */
export const MATCH_URL_TIKTOK = /tiktok\.com\/(?:player\/v1\/|share\/video\/|@[^/]+\/video\/)([0-9]+)/;

// ===========================================================================
// MIME TYPE DICTIONARY
// ===========================================================================
// prettier-ignore
export const mimeTypes: Record<string, string> = {
  // Video formats
  avi: "video/x-msvideo", mp4: "video/mp4", mkv: "video/x-matroska", mov: "video/quicktime", 
  flv: "video/x-flv", webm: "video/webm", ogv: "video/ogg", wmv: "video/x-ms-wmv", 
  "3gp": "video/3gpp", "3g2": "video/3gpp2", mpeg: "video/mpeg", mpg: "video/mpeg", 
  ts: "video/mp2t", m4v: "video/x-m4v", m3u8: "application/vnd.apple.mpegurl", mpd: "application/dash+xml",
  // Audio formats
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", aac: "audio/aac", 
  m4a: "audio/mp4", m4b: "audio/mp4", mp4a: "audio/mp4", wma: "audio/x-ms-wma", opus: "audio/opus", 
  mid: "audio/midi", midi: "audio/midi", mpga: "audio/mpeg", mp2: "audio/mpeg", mp2a: "audio/mpeg", 
  m2a: "audio/mpeg", m3a: "audio/mpeg", weba: "audio/webm", spx: "audio/ogg", flac: "audio/flac", 
  // Image formats
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", 
  bmp: "image/bmp", svg: "image/svg+xml", tif: "image/tiff", tiff: "image/tiff", avif: "image/avif", 
  ico: "image/x-icon", heic: "image/heic", heif: "image/heif",
  // Document formats
  pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv", 
  json: "application/json", xml: "application/xml", html: "text/html", doc: "application/msword", 
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
  zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
};
