/*
 * Portions of this code are derived from Video.js
 * https://github.com/videojs/video.js
 * Licensed under Apache License 2.0
 * Copyright (c) Brightcove, Inc. and contributors
 */

// Types
type Version = string | null;
type BrandEntry = { brand?: string; version?: string };

// Environment guards
const win = "undefined" !== typeof window ? window : undefined,
  nav = win?.navigator,
  ua = nav?.userAgent || "",
  uaData = (nav as Navigator & { userAgentData?: { platform?: string; brands?: BrandEntry[] } })?.userAgentData;

// Base flags: bools first, versions second for readability
export let IS_ANDROID = false;
export let IS_WINDOWS = false;
export let IS_FIREFOX = false;
export let IS_EDGE = false;
export let IS_CHROME = false;
export let IS_CHROMIUM = false;
export let IS_SAFARI = false;
export let IS_IE = false;
export let IS_TIZEN = false;
export let IS_WEBOS = false;
export let IS_IPOD = false;
export let IS_IPAD = false;
export let IS_IPHONE = false;
// Versioned details
export let IOS_VERSION: Version = null;
export let ANDROID_VERSION: Version = null;
export let CHROME_VERSION: Version = null;
export let CHROMIUM_VERSION: Version = null;
export let IE_VERSION: Version = null;
// Composite Flags
export let IS_IOS = false;
export let IS_MOBILE = false;
export let IS_SMART_TV = false;
// Capabilities
export const IS_CHROMECAST_RECEIVER = Boolean((win as any)?.cast?.framework?.CastReceiverContext);
export const MSE_ENABLED = Boolean(win && ("MediaSource" in win || "webkitMediaSource" in win));
export const TOUCH_ENABLED = Boolean(win && ("ontouchstart" in win || (nav as Navigator & { maxTouchPoints?: number })?.maxTouchPoints || ((win as any).DocumentTouch && win.document instanceof (win as any).DocumentTouch)));
// Media Queries
export const queryMediaMobile = (query = `(max-width: 480px), (max-width: 940px) and (max-height: 480px) and (orientation: landscape)`) => Boolean(win && "matchMedia" in win && win.matchMedia(query).matches);

// Modern detection first (userAgentData)
if (uaData?.platform && uaData?.brands) {
  // Helpers
  const pickVersion = (brands: BrandEntry[], needle: string): Version => brands.find((b) => b.brand === needle && b.version)?.version || null;
  // Platform first
  IS_ANDROID = uaData.platform === "Android";
  IS_WINDOWS = uaData.platform === "Windows";
  // Browser family
  IS_EDGE = uaData.brands.some((b) => b.brand === "Microsoft Edge");
  IS_CHROMIUM = uaData.brands.some((b) => b.brand === "Chromium" || b.brand === "Google Chrome");
  IS_CHROME = IS_CHROMIUM && !IS_EDGE;
  // Versions
  CHROMIUM_VERSION = CHROME_VERSION = pickVersion(uaData.brands, "Chromium") || pickVersion(uaData.brands, "Google Chrome");
}

// Fallback / additional parsing via UA string
if (true || !IS_CHROMIUM || !CHROMIUM_VERSION) {
  // General Platforms
  IS_ANDROID ||= /Android/i.test(ua);
  IS_WINDOWS ||= /Windows/i.test(ua);
  // Desktop & general browsers (include iOS-branded variants)
  IS_FIREFOX = /Firefox|FxiOS/i.test(ua);
  IS_EDGE ||= /Edg|EdgiOS/i.test(ua);
  IS_CHROMIUM ||= /Chrome|CriOS/i.test(ua);
  IS_CHROME = IS_CHROMIUM && !IS_EDGE;
  IS_SAFARI = /Safari/i.test(ua) && !IS_CHROME && !IS_FIREFOX && !IS_EDGE;
  IS_IE = /MSIE|(Trident\/7.0)|(rv:11.0)/i.test(ua);
  // TVs
  IS_TIZEN = /Tizen/i.test(ua);
  IS_WEBOS = /Web0S/i.test(ua);
  // Apple desktop/mobile device refinement
  IS_IPOD = /iPod/i.test(ua);
  IS_IPAD = /iPad/i.test(ua) || (IS_SAFARI && TOUCH_ENABLED && !/iPhone/i.test(ua));
  IS_IPHONE = /iPhone/i.test(ua) && !IS_IPAD;
  // Versions
  IOS_VERSION = ua.match(/OS (\d+)_/i)?.[1] ?? null;
  ANDROID_VERSION = ua.match(/Android\s(\d+(?:\.\d+)+)/i)?.[1] ?? null;
  CHROMIUM_VERSION = CHROME_VERSION = ua.match(/(?:Chrome|CriOS)\/(\d+)/)?.[1] ?? CHROMIUM_VERSION;
  IE_VERSION = ua.match(/MSIE\s(\d+)\.\d/)?.[1] || (/Trident\/7.0/i.test(ua) && /rv:11.0/.test(ua) ? "11.0" : null);
} // `true` override for devtools predictability

// Composite Flags
IS_IOS = IS_IPHONE || IS_IPAD || IS_IPOD;
IS_MOBILE = Boolean(IS_ANDROID || IS_IPHONE || IS_IPAD || IS_IPOD);
IS_SMART_TV = IS_TIZEN || IS_WEBOS;
