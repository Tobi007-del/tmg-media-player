# TMG Media Prototype - Agent Instructions

> Read this before touching any plug, pin, component, or tech file.

---

## The Project

TMG is a TypeScript video player replacing beta: `beta/index.js`. The architecture is **S.I.A. (State & Intent Architecture)** - a plug-based, reactive, infinitely extensible core. Goal is a paradigm shift, not an MVP. Think before coding.

---

## Directory Layout (src/ts)

```
core/          controllable.ts, controller.ts, reactor.ts, registry.ts
plugs/         one file per plug + / (sub-pins)
components/    one file per component
media/         tech classes (BaseTech, HlsTech, etc.)
types/         build.d.ts, contract.d.ts, generics.d.ts, reactor.d.ts
css/           zones/, perks/, core/, states/, controls/, settings/
```

---

## Class Hierarchy

```
Controllable<Config, State>
  +-- BasePlug<Config, State>       -- plugs/
  +-- BasePin<Config, State>     -- sub-pins inside plugs
  +-- BaseComponent<Config, State>  -- components/
       +-- RangeSlider<Config, State>
            +-- Timeline
```

---

## Controllable (Base for Everything)

- `protected readonly signal` = `AbortSignal.any([this.ac.signal, ctlr.signal])` - pass to all listeners
- `public config: Config` - reactive config node or plain object
- `public state: Reactive<State>` - reactive local state (if class has one)
- Constructor auto-wraps all methods with `guardAllMethods(this, ctlr.guard, true)` - never add it manually
- `setup()` -> abstract `onSetup()` - never override `setup()`, override `onSetup()`
- `destroy()` - aborts AC, calls `onDestroy()`, nukes reactors; never call it on something you don't own

---

## BasePlug

```ts
export class MyPlug extends BasePlug<MyConfig, MyState> {
  public static readonly plugName: string = "myPlug"; // required, camelCase
  public static readonly isCore: boolean = false; // true = shell infrastructure
}
```

- `plugName` must match the key in `ctlr.config` or `ctlr.config.settings`
- `isCore = true` for plugs that build the shell: skeleton, css, controlPanel, media
- `onSetup()` (inherited): calls `mount?.()`, then defers `wire?.()` until `readyState > 0` via `wonce`
- `mount()` - pure DOM work. NO reactive listeners here
- `wire()` - ALL reactive bindings. Comment sections follow MSC order (see below)
- Constructor: always `super(ctlr, config, state)` first; instantiate sub-pins here
- Other plugs access via `ctlr.plug<MyPlug>("myPlug")`

### GSWL-MSC Pattern - wire() comment section order

**Ctlr MSC = Media, State, Config** - the ordering within each operation type (Getters, Setters, Watchers, Listeners).

Dash convention:

- Long `----------` = same MSC tier, next operation - do not repeat the tier name, only dash out word if prev comment had it.
- Short `----` = MSC tier changed - do not repeat the operation name
- Trailing fill dashes (`---- State --------`) = same operation, next MSC tier - operation word not repeated

```ts
public override wire(): void {
  // Variables Assignment         <- plug refs, DOM refs, computed initial values (for other methods too)
  // Features Gating              <- tech.features.X hides based on tech capabilities, run before listeners and init on ctlr.payload.initialized
  // Event Listeners              <- native addEventListener
  // Plug Listeners               <- where applicable if plug has reactive state
  // [If this.config or this.state is reactive -- own listeners come BEFORE ctlr.*] - S->C
  // State Getters                <- this.state.get()
  // ------ Setters               <- (long dashes: still own config, next op)
  // ------ Watchers
  // ------ Listeners
  // Config Listeners             <- this.config.on()

  // Ctlr Config Getters          <- ctlr.config.get()
  // ----------- Setters          <- (long dashes: still Ctlr Config, next op)
  // ----------- Watchers
  // ---- Media Listeners         <- (short dashes: MSC shifts to Media, intro "Listeners")
  // ---- State --------          <- (short dashes + fill: same op, next MSC tier - no repeat)
  // ---- Config -------          <- same
  // Post Wiring                <- final imperative calls (tech.features.X = true, etc.)
}
```

Real examples from the codebase:

- `volume.ts` -> `Ctlr Config Getters` -> `----------- Setters` -> `----------- Watchers` -> `---- Media Listeners` -> `---- Config --------`
- `time.ts` -> `Ctlr Config Getters` -> `---- Media Setters` -> `---- Config Watchers` -> `---- Media Listeners`
- `playbackRate.ts` -> `Ctlr Media Setters` -> `---- Config Watchers` -> `----------- Listeners`
- `auto.ts` -> `Ctlr Config Watchers` -> `---- Media Listeners` -> `---- State ---------` -> `---- Config --------`

Not every section is always present. Use only what the plug needs.

### mount() comment section order:

```ts
public override mount(): void {
  // Variables Assignment    <- createEl(), ComponentRegistry.init()
  // DOM Injection           <- append/prepend/insertAdjacentHTML, can contain reactive wiring if config determines DOM structure, those sub-blocks will act with GSWL-MSC pattern and be prefixed with `DOM! -> `.
  // Utility Injection       <- rare but for subs like pins, modules, e.t.c. use for wire() too
  // Post Mounting
}
```

---

## BasePin

- Same lifecycle as BasePlug - `static pinName` instead of `plugName`
- Instantiated in parent plug's **constructor** (not setup/mount/wire)
- Parent plug's `wire()` controls deferred timing:
  ```ts
  public override wire() {
    const wire = () => (this.pinA.wire(), this.pinB.wire());
    if (this.ctlr.state.readyState > 1) wire();
    else this.ctlr.state.once("readyState", wire, { signal: this.signal });
  }
  ```
- `onDestroy()` in parent must call each pin's `.destroy()`
- Suffix samples - `GestureGeneralPin`, `GestureWheelPin`, `ModesFullscreenPin`, etc.

---

## BaseComponent

```ts
export class MyComp extends BaseComponent<MyConfig, MyState, HTMLButtonElement> {
  public static readonly componentName: string = "myComp";
  public static readonly isControl: boolean = false; // true = shown in control panel
}
```

- `create()` - required; MUST assign `this.element` and return it
- `mount()` - optional; DOM injection
- `wire()` - optional; reactive bindings; same MSC comment order as BasePlug
- Initialized via `ComponentRegistry.init<T>("name", ctlr)` -> calls `create()` then `setup()`
- `hide/show/disable/enable()` - CSS class toggles provided by base
- `setBtnARIA(doubleKeyAction?)` - sets aria attrs from `this.state.label` and `this.state.cmd`
- Acquire plug refs in `wire()`: `this.plug = this.ctlr.plug<TimePlug>("time")`
- ***

## Controller (The God Object)

| Member                                              | Description                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `ctlr.plug<T>(name)`                                | Get plug by plugName                                                   |
| `ctlr.config`                                       | `Reactive<VideoBuild>` - full build config                             |
| `ctlr.state`                                        | `Reactive<RuntimeState>` - readyState, dimensions                      |
| `ctlr.media`                                        | `Reactive<CtlrMedia>` - state, intent, status, settings, tech, element |
| `ctlr.DOM`                                          | Cached DOM refs                                                        |
| `ctlr.throttle(key, fn, ms)`                        | Named throttle                                                         |
| `ctlr.RAFLoop(key, fn)` / `ctlr.cancelRAFLoop(key)` | Named RAF loops                                                        |
| `ctlr.fire(type, detail)`                           | Custom event dispatch                                                  |
| `ctlr.setReadyState(n?)`                            | Advance readyState (+1, clamped 0-3)                                   |

---

## ReadyState Ladder

| State | Meaning                                                            |
| ----- | ------------------------------------------------------------------ |
| 0     | Controller started; plugs not connected                            |
| 1     | All `mount()` called; `wire()` deferred                            |
| 2     | First-play or `lightState.disabled = true` - interaction gate open |

- `BasePlug.onSetup()` defers wire to `readyState > 0`
- Gesture/interaction-sensitive plugs defer to `readyState > 1`: `if (ctlr.state.readyState > 1) fn(); else ctlr.state.once("readyState", fn, { signal })`
- `LightStatePlug`: `disabled = true` fires `ctlr.setReadyState()` immediately in `wire()`

---

## SIA Patterns

- `ctlr.media.intent.X = value` - a **Request** (routes through capture -> target -> bubble)
- `ctlr.media.state.X = value` - a **Fact** (set directly after something is confirmed)
- `ctlr.media.status.X` - read-only fact from the element
- `.set()` mediators run FIFO - first registered = highest authority
- `.get()` mediators run LIFO - last registered gets first look
- `.watch()` - sync, fires before `.on()` listeners
- `.on()` - async batched; use `{ init: true }` to also fire on wire
- Always use `{ signal: this.signal }` - auto-cleanup on destroy
- **Never add `window`/`document` event listeners when the state is already tracked in `ctlr.state`** (e.g. `screenOrientation`, `docInFullscreen`, `mediaParentIntersecting`, `docVisibilityState`). Use `ctlr.state.watch()`/`.on()` instead.

---

## Higher Power Pattern

Plugs that own a browser API for an intent path listen with `{ capture: true }`:

```ts
this.media.on("intent.volume", this.handleVolumeIntent, { capture: true, signal: this.signal });

protected handleVolumeIntent(e) {
  if (e.resolved) return;          // stand down if already claimed
  this.doVolume(e.value);          // fire-and-forget async
  e.resolve(this.name);            // claim synchronously
}
```

- `e.resolve(name)` - synchronous claim; tech sees this and stands down
- `e.reject(reason)` - log-only disapproval; not a rollback
- `e.resolved` - check first in every Higher Power handler
- Async work is fire-and-forget; `resolve()` is always synchronous
- Smart-optimistic UI listens on bubble phase, checks `e.rejected` before reflecting

Canonical example: `volume.ts` on `media.intent.volume` and `media.intent.muted`

- **Intent handlers are always `void` (synchronous)**. `e.resolve(this.name)` goes at the bottom; async work goes in a `protected async doX()` method called fire-and-forget from the handler.

---

## Notifier System (CSS-Driven)

- `ctlr.videoContainer.dataset.notify = "videoplay"` -> CSS animates `.tmg-video-play-notifier`
- Re-trigger: set `""` then set key again (resets animation)
- Self-clearing: animation fills `forwards` at `opacity: 0` - no JS teardown needed
- Persistent notifiers: `.tmg-video-control-active` class toggle

**Planned `NotifierPlug`:** exposes `.notify(key)` parallel to `.toast` on `ToastsPlug`. Two component types: `"splash"` (center, auto-dismiss) and `"status"` (persistent). Still dataset-driven underneath.

---

## Registry System

- `PlugRegistry` (OrderedRegistry): `register`, `registerBefore`, `registerAfter`, `registerPriority`
  - Order = init order = capture phase rank = Higher Power authority
  - Each plug file calls `PlugRegistry.register(MyPlug)` at the bottom (planned, not all done yet)
- `ComponentRegistry`: `register(CompClass)`, `init<T>("name", ctlr)` -> `{ element, instance } | null`
- `TechRegistry`: `register(TechClass)`, `pick(src, order?)` -> matching tech via `canPlaySource(src)`

---

## Adding a Feature
- Add a plug to `plugs/` (or subfolder) and register it in `PlugRegistry` and its `z-register.ts`
- Add a component to `components/` and register it in `ComponentRegistry` and its `z-register.ts`
  - Add componentName to `plugs/controlPanel/build` `CONTROLS` and to desired zone in `CONTROL_PANEL_BUILD`
- Add a notifier to `plugs/settings/notifiers/` and register it in `ComponentRegistry` and its `z-register.ts`
  - Add it to the `NOTIFIERS_BUILD` list in `build.ts`
  - Add its animation styles to `css/perks/_notifiers`
- Add an icon to `components/icons/` and register it in `IconRegistry` and its `z-register.ts`
- Add key shortcut to `plugs/keys/build` `KEYS_SHORTCUT_ACTIONS` and to `shortcuts` in `KEYS_BUILD`
- Export all created files from their associated `super/` endpoints.

## Coding Style

- **Terse comma ops**: use `const a = x, b = y` single-line form wherever it's clear. Multiline multi-const blocks (complex objects, long chains) stay on separate lines — space-saving that hurts readability is not the goal.
- **No anonymous function wrappers around named methods**: all methods are pre-bound via `guardAllMethods`. Never write `() => this.handleX()` when passing a listener — pass `this.handleX` directly. The wrapping re-allocates a closure every call.
- **Not-yet-existing plugs**: write the exact proto-3 JS call, prefix with `// JS:`, and leave it. No throwaway workarounds. Example: `// JS: this.notify("capture");`. When the plug is built the line is already there to uncomment.
- **Handler naming**: `ctlr.media.on(...)` handlers → `handle` + camelCase(path key) + media sub-object suffix (`State`/`Intent`/`Status`/`Config`). E.g. `ctlr.media.on("state.pictureInPicture")` → `handlePictureInPictureState`. Never use "Change" in any watcher/listener handler name.
- **Early-return terseness**: use one-line guard returns when they improve readability, but if the guard only skips the final statement in a function, prefer folding it into that final line (e.g. `if (x) doThing();`).
- **DOM creation terseness**: use `createEl` utility instead of raw `document.createElement` in plugs/components, and inline assignment inside `append/prepend` where readable.

---

## Do Not Break

- Never add `guardAllMethods` manually - `Controllable` constructor handles it
- Never call `this.wire()` directly - `onSetup()` / `wonce` pattern owns it
- Never listen without `{ signal: this.signal }` - memory leak
- Never use `document.querySelector` - use `ctlr.DOM.*` or `ctlr.queryDOM()`
- Higher Power: always call `e.resolve(this.name)` so the tech stands down; `resolve()` is sync

---

## Additional Coding Rules

- **Notable changes**: `tmg-video` is now `tmg-media` on all fronts to allow for the new supports. Keep your eyes open on new patterns.
- **No arrow function class properties**: `getMainColor = async () =>` and `moveFrame = () =>` are anonymous — they bypass `guardAllMethods` binding. Always use named method syntax: `public async getMainColor(...) {}`, `public moveFrame(...) {}`. Arrow functions are fine for inline callbacks (`.then()`, Promise constructors, `throttle`, event listeners passed inline).
- **`onDestroy` stays minimal**: `nullify()` on `Controllable` nukes all reactive state at end-of-life. Do NOT reset arrays, null out refs, or clear maps manually in `onDestroy` — only run `this.clups`, any `removeScrollAssist` calls, and destroy child instances/pins.
- **`init: "auto"` vs `init: true`**: use `"auto"` for forwarding watchers (value may not exist yet); use `true` only for always-valid computed values wired at startup.
- **Semantic property naming**: if a property already lives on a typed class, don't repeat the class in the name. `PlaylistPlug.currentIndex` not `currentPlaylistIndex` — the class already provides the namespace.
- **Imports in all files**: always import from `"@"` urls in `tsconfig.json`, `super` folder route is not for internal use.
- **UI Punctuation**: Single-sentence UI text (tips, helper text, labels) gets NO period at the end. Multi-sentence UI text gets periods everywhere, including the last sentence.
- **Source of Truth**: always use the current state of a file as the source of truth before editing. Do not rely on memory of previous file states to rewrite logic that might have been recently edited by the user.
- **No em-dashes**: never use the em-dash character (—) in any written output — README files, comments, docs, UI text, or anywhere else. Rewrite the sentence to not need one. Use a colon, a comma, parentheses, or restructure the clause. A plain hyphen is not a substitute either — the rule is to write around it, not swap the glyph.

## Tech Contract

- Techs must provide `state`, `intent`, `status`, `settings` matching `MediaReport` in `contract.d.ts`
- Tech is sovereign over its API but yields to Higher Power via `e.resolved` check
- `tech.features` declares capabilities (`volume: true`, etc.)
