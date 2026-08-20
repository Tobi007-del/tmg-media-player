# TMG Media Player

> The browser's `controls` attribute, but actually good. A plug-based, reactive HTML5 media player for [The Movie Garden](https://tobi007-del.github.io/TMG.com/) initiative.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/tmg-media-player.svg)](https://www.npmjs.com/package/tmg-media-player)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/tmg-media-player)](https://bundlephobia.com/package/tmg-media-player)
[![GitHub](https://img.shields.io/badge/github-100000?style=for-the-badge&logo=github)](https://github.com/Tobi007-del/tmg-media-player)

[Live Demo](https://tmg-video-player.vercel.app) | [Report Bug](https://github.com/Tobi007-del/tmg-media-player/issues) | [Discussions](https://github.com/Tobi007-del/tmg-media-player/discussions)

---

## Table of Contents

- [TMG Media Player](#tmg-media-player)
  - [Table of Contents](#table-of-contents)
  - [The Pitch](#the-pitch)
  - [Getting Started](#getting-started)
  - [HTML Configuration](#html-configuration)
  - [JavaScript Configuration](#javascript-configuration)
  - [Theming](#theming)
  - [Lifecycle \& Events](#lifecycle--events)
  - [Browser Support](#browser-support)
  - [Author](#author)
  - [Acknowledgments](#acknowledgments)
  - [Star History](#star-history)

---

## The Pitch

You already have this:

```html
<video controls src="movie.mp4"></video>
```

Add one script tag and change **3 characters**:

```html
<script src="https://cdn.jsdelivr.net/npm/tmg-media-player@latest" defer></script>

<video tmgcontrols src="movie.mp4"></video>
```

That's the whole install. No bundler. No `npm install`. No framework.

What you get out of the box:

- **Fullscreen, Theater, Picture-in-Picture, Miniplayer** (all modes, all wired)
- **Timeline scrubbing** with hover preview thumbnails
- **30+ keyboard shortcuts** that match YouTube conventions
- **Touch & wheel gestures** for volume, brightness, and scrubbing
- **Captions** with full WebVTT support: live font, size, color, opacity, and edge-style customization
- **Playlist management** with auto-next countdowns
- **HLS / DASH / YouTube / Vimeo** with source auto-detection, no extra config
- **Media Session API** for OS-level controls on mobile & desktop
- **Screen capture** to image
- **Voice commands** that are fully configurable per action
- **Settings persistence** via any storage
- **100% accessible** with full ARIA, keyboard-first, focus-managed interactions, and much more...

The browser's native `controls` are a blunt tool. TMG is the upgrade.

---

## Getting Started

### CDN (Zero Setup)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdn.jsdelivr.net/npm/tmg-media-player@latest" defer></script>
  </head>
  <body>
    <video tmgcontrols src="movie.mp4" poster="poster.jpg"></video>
  </body>
</html>
```

### npm

```bash
npm install tmg-media-player
```

```js
import "tmg-media-player";
```

The script self-initializes. Any `<video tmgcontrols>` or `<audio tmgcontrols>` on the page is picked up automatically.

---

## HTML Configuration

The fastest way to configure is directly on the element using `tmg--` attributes. The convention maps to a nested config object where double dashes (`--`) are path separators and single dashes (`-`) are word separators within a key.

```
tmg--settings--overlay--behavior--value="persistent"
     └── settings └── overlay └── behavior └── value
```

### Common Attributes

```html
<!-- Video title shown in the player UI and OS media controls -->
<video tmgcontrols
  tmg--media--settings--metadata--title="Justice League Teaser"
  tmg--media--settings--metadata--artist="Warner Bros."
  src="movie.mp4"
  poster="poster.jpg">

  <!-- Native <track> elements work exactly as-is -->
  <track default kind="subtitles" srclang="en" src="subtitles.vtt" label="English" />
  <track kind="chapters" srclang="en" src="chapters.vtt" />
</video>
```

```html
<!-- Timeline hover preview thumbnails, $ is replaced by the frame number -->
<video tmgcontrols
  tmg--settings--control-panel--timeline--previews--address="previews/frame$.jpg"
  tmg--settings--control-panel--timeline--previews--spf="10"
  src="movie.mp4">
</video>
```

```html
<!-- Overlay behavior: "auto" hides on play, "persistent" always shows -->
<video tmgcontrols
  tmg--settings--overlay--behavior--value="auto"
  src="movie.mp4">
</video>
```

```html
<!-- Rearrange or trim the control panel layout -->
<video tmgcontrols
  tmg--settings--control-panel--bottom[2]="playPause,volume,timeAndDuration,spacer,captions,settings,fullscreen"
  src="movie.mp4">
</video>
```

```html
<!-- Load an entire JSON config file -->
<video tmg="./player-config.json" src="movie.mp4"></video>
```

```html
<!-- Debug mode -->
<video tmgcontrols tmg--debug="true" src="movie.mp4"></video>
```

---

## JavaScript Configuration

For programmatic control, use `tmg.Player`. The API covers three operations: attach, configure, and detach.

```js
const player = new tmg.Player();

player.configure({
  settings: {
    controlPanel: {
      timeline: {
        previews: { address: "previews/frame$.jpg", spf: 10 },
        tooltip: true,
      },
    },
    overlay: { behavior: { value: "auto" } },
    errors: {
      2: "Network dropped. Check your connection.",
      4: "This format isn't supported by your browser.",
    },
  },
});

// Attach to any video or audio element
await player.attach(document.querySelector("video"));

// Detach and restore the element to its original state
player.detach();
```

`player.configure()` can be called multiple times before `attach()`. Configs are deep-merged, last write wins per key. The same shape accepted by `configure()` is also accepted as a JSON file via `tmg="config.json"` on the element.

---

### Playlists

Pass a `playlist` array in your config. Each entry is a media item with its own source, metadata, and tracks:

```js
const player = new tmg.Player();

player.configure({
  playlist: [
    {
      src: "episode-1.mp4",
      media: {
        intent: {
          poster: "ep1-poster.jpg",
        },
        settings: {
          metadata: {
            title: "Episode 1: Pilot",
            artist: "TMG Studios",
            artwork: [{ src: "ep1-poster.jpg" }],
          },
        },
      },
      tracks: [
        { default: true, kind: "subtitles", srclang: "en", src: "ep1-en.vtt", label: "English" },
      ],
    },
    {
      src: "episode-2.mp4",
      media: {
        settings: { metadata: { title: "Episode 2: The Return" } },
      },
    },
  ],
});

await player.attach(document.querySelector("video"));
```

Playlists support shuffle, loop, and per-item start/end times.

---

## Theming

Override CSS variables on any ancestor element, or globally on `:root`:

```css
:root {
  --tmg-media-brand-color: #e63946;        /* Accent color for timeline, buttons, and highlights */
  --tmg-media-font-family: "Inter", sans-serif;
  --tmg-media-background: #0a0a0a;
  --tmg-media-theme-color: #1a1a1a;        /* Controls surface background */
}
```

Or pass CSS values as config:

```js
player.configure({
  settings: {
    css: {
      brandColor: "#e63946",
      fontFamily: "'Inter', sans-serif",
    },
  },
});
```

Or via HTML attribute:

```html
<video tmgcontrols tmg--settings--css--brand-color="#e63946" src="movie.mp4"></video>
```

---

## Lifecycle & Events

Because TMG loads techs and plugins asynchronously, you should wait for the controller to be fully initialized before interacting with it programmatically. 

The controller avoids flooding the DOM with events (that's what the Reactor is for!). Instead, it only fires a few critical lifecycle events on the media element, which correspond directly to the internal `ctlr.state.readyState` ladder:

- `tmgcreate` (ReadyState 0): The controller is attached, but plugins are not yet connected.
- `tmginit` (ReadyState 1): All DOM elements are mounted, but reactive listeners are deferred.
- **`tmgwire`** (ReadyState 2): Reactive listeners are wired and active. **The controller is now fully safe to use.**
- `tmgfirstplay` (ReadyState 3): Fired the first time the user interacts or plays the media.
- `tmgdestroy`: Fired when the controller is destroyed and cleans up its memory.

```javascript
video.addEventListener("tmgwire", (e) => {
  const ctlr = e.detail.ctlr; // The payload contains the controller instance!
  console.log("TMG is wired and ready!");
  
  ctlr.media.intent.volume = 50; // Safe to use the reactor now
});
```

---

### The S.I.A. Architecture (State & Intent)

TMG Media Player is not just a bunch of UI components mutating a `<video>` tag. It is a proof of concept for [sia-reactor](https://github.com/Tobi007-del/sia-reactor), a high-performance programmable data engine.

Every piece of data flows through a transactional pipeline divided strictly into **State** (the factual truth) and **Intent** (a request to change the truth).

You do not write to the player's state. You write to its **Intent**.

```js
const { media } = video.tmgPlayer.Controller;

video.play(); // ❌ WRONG: Do not touch the video directly

media.intent.paused = false; // ✅ RIGHT: Request a change through Intent
```

When you dispatch an Intent, the active Media Tech (e.g. HTML5 Video, YouTube, HLS) or a higher-power plugin intercepts it, validates it, performs the necessary asynchronous operations, and finally updates the **State** to confirm the change.

### The Media Contract

The `ctlr.media` object is the unified API for interacting with the player, regardless of what video format or tech is currently loaded. It is divided into 4 reactive spheres:

1. **`intent`** - Volatile properties you write to when you want something to happen (`media.intent.paused = false`, `media.intent.volume = 50`).
2. **`state`** - The active, confirmed truth of the player (`media.state.paused`, `media.state.currentTime`).
3. **`status`** - Read-only facts derived directly from the media element.
4. **`settings`** - Writable configurations that affect the player's underlying behavior (also handled as Intents).

Because S.I.A. intercepts changes *before* they settle, plugins can effortlessly reject, modify, or clamp intents. For example, if you send `media.intent.volume = 200`, the Volume Limits plugin intercepts it during the capture phase and clamps the final state down to `100` before the UI ever renders it.

> **Note:** For the full list of supported properties across all spheres, always refer directly to the source of truth: [`contract.d.ts`](https://github.com/Tobi007-del/tmg-media-player/blob/main/src/ts/types/contract.d.ts).

### Using the Reactor (State Router)

TMG exposes the raw power of [sia-reactor](https://github.com/Tobi007-del/sia-reactor) directly to the outside world. You can observe, watch, or intercept state easily.

```js
const { media } = video.tmgPlayer.Controller;

// Watch fires immediately with current value, and on every change
media.watch("state.paused", ({ value }) => console.log(value ? "Video is paused" : "Video is playing"));

// Intercept memory writes (Mediator phase)
media.set("intent.volume", (val) =>  Math.min(val, 50));

// Reject or Claim an intent (Capture phase)
media.on("intent.playing", (e) => (!userHasPremium)&& e.reject(), { capture: true }); // Cancel the intent completely
```

### For React Developers

Because TMG is built on S.I.A., syncing its state with React is entirely decoupled from the DOM. You don't need to listen to messy HTML5 `<video>` events or worry about race conditions. 

`sia-reactor` ships with a native React adapter that provides hooks like `useSelector` and `usePath` for concurrent-safe, surgically precise re-renders.

```jsx
import { useReactor } from "sia-reactor/adapters/react";

function PlayButton({ ctlr }) {
  const media = useReactor(ctlr.media); // Subscribes directly to the underlying S.I.A reactor state using an autotracking proxy

  return (
    <button onClick={() => (media.intent.paused = !media.state.paused)}>
      {media.state.paused ? "Play" : "Pause"}
    </button>
  );
}
```

For more advanced selector logic across multiple paths, you can use `useSelector(ctlr.media, () => ...)` or read the full [ documentation](https://github.com/Tobi007-del/sia-reactor).

### The Plug Registry & Custom Extensions

TMG is infinitely extensible. Features like Volume, Playback Rate, Captions, and even the core Control Panel are just **Plugs**. 

You can add your own custom logic by writing a Plug and registering it before the player initializes.

```ts
import { BasePlug, PlugRegistry } from "tmg-media-player";

class MyCustomPlug extends BasePlug {
  public static readonly plugName = "myCustomPlug";
  
  public override wire() {
    // Listen to media state
    this.media.on("state.currentTime", (e) => {
      if (e.value > 60) console.log("Past 1 minute!");
    }, { signal: this.signal }); // Automatically cleans up when destroyed
  }
}

PlugRegistry.register(MyCustomPlug);
```

You can access any running plug dynamically from the controller to access its internal APIs:

```js
// Access the underlying Captions plug
const captionsPlug = controller.plug("captions");
captionsPlug.settings.css.currentCaptionsY = "50px"; 
```

The system uses dedicated registries (`PlugRegistry`, `ComponentRegistry`, `TechRegistry`) so you can inject or rip out entire chunks of the player architecture effortlessly. For a deep dive on how to structure Plugs, Components, and Techs, refer to our [Architecture documentation on GitHub](https://github.com/Tobi007-del/tmg-media-player/blob/main/.agents/AGENTS.md).

---

## Browser Support

| Browser       | Support                     |
| ------------- | --------------------------- |
| Chrome 90+    | ✅ Full                      |
| Edge 90+      | ✅ Full                      |
| Firefox 88+   | ✅ Full                      |
| Safari 14+    | ⚠️ Partial (no Document PiP) |
| Mobile Chrome | ✅ Full                      |
| Mobile Safari | ⚠️ Partial                   |

---

## Author

- Architect & Developer: [Oketade Oluwatobiloba (Tobi007-del)](https://github.com/Tobi007-del)
- Project: [tmg-media-player](https://github.com/Tobi007-del/tmg-media-player)

---

## Acknowledgments

Built as the media engine for [The Movie Garden](https://tobi007-del.github.io/TMG.com/) initiative. Powered internally by [sia-reactor](https://github.com/Tobi007-del/sia-reactor), a high-performance State & Intent Architecture engine that makes the entire plug system reactive, transactional, and infinitely extensible.

---

## Star History

If this is useful, a star means a lot ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=Tobi007-del/tmg-media-player&type=Date)](https://github.com/Tobi007-del/tmg-media-player)

**[⬆ Back to Top](#tmg-media-player)**
