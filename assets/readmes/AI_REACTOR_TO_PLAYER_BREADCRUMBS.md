# Breadcrumbs: Reactor Core → TMG Media Player Systems

Maps every major tmg-media-player subsystem back to the **sia-reactor** primitives that enable it.

---

## 1. Intent/State Separation → Capture/Bubble Phases

**Reactor Core** (sia-reactor/src/ts/core/reactor.ts):
- `wave()` method lines 323-351: Three-phase event propagation
  - CAPTURE phase (core → target): For intent owners to reject early
  - TARGET phase (leaf): Direct listeners fire
  - BUBBLE phase (target → core): Propagate upward for smart optimists

**TMG Media Player Usage**:
- [Controller](tmg-media-player/src/ts/core/controller.ts#L49): `media.intent.*` paths marked as rejectable
- [LightStatePlug](tmg-media-player/src/ts/plugs/main/lightState/index.ts#L18): Captures `intent.currentTime`, calls `e.resolve()` or lets rejection propagate
- [FOLKLORE.md](tmg-media-player/FOLKLORE.md#L33): Documents the three artist modes (Cynic, Sycophant, Prudent Apprentice) that embody these phases

**Why it Matters**:
Without phase discipline, intent requests race with state updates. Reactor's wave ensures order: arbitration first, then optimistic UI, then validation.

---

## 2. Mediators (get/set/delete) → Tech Adapter Contract

**Reactor Core**:
- `mediate()` method lines 269-285: Synchronous interceptors before/after mutations
- `set()`, `get()`, `delete()` register mediators that can return `TERMINATOR` or modified values
- Mediators run FIFO (set/delete) or LIFO (get)

**TMG Media Player Usage**:
- [BaseTech](tmg-media-player/src/ts/techs/base.ts#L17): Tech classes implement feature flags via `media.features.*`
- [Controller.wireTechHandler()](tmg-media-player/src/ts/core/controller.ts#L123): Watches `intent.src`, calls `useTech()` to swap adapters
- [LightStatePlug.handleCurrentTimeIntent()](tmg-media-player/src/ts/plugs/main/lightState/index.ts#L37): Uses capture-phase mediation to resolve or allow intent to proceed

**Why it Matters**:
Mediators are the barrier where "request" becomes "capability check." Without them, any plug can lie about what's possible; with them, one source of truth (the tech) gates all downstream behavior.

---

## 3. Watchers → Internal State Consistency

**Reactor Core**:
- `watch()` method lines 413-418: Synchronous post-mutation observers on leaf paths
- Watchers see exact sets only; no bubbling, no depth filtering
- Used for critical internal engine syncing

**TMG Media Player Usage**:
- [PlaylistPlug.wire()](tmg-media-player/src/ts/plugs/main/playlist/index.ts#L65): `watch("tech", syncFeatures)` keeps feature flags in sync when tech swaps
- [SkeletonPlug.wire()](tmg-media-player/src/ts/plugs/main/skeleton/index.ts#L48): `watch("status.loadedMetadata")` to sync pseudo-element state
- [LightStatePlug.handleDisabled()](tmg-media-player/src/ts/plugs/main/lightState/index.ts#L48): Toggles `watch("state.paused")` to toggle light mode

**Why it Matters**:
Watchers ensure the control plane stays synchronized *during* transitions. They're internal surgical tools; UI layers use listeners instead.

---

## 4. Listeners (on/off) → UI & Cross-Plug Signaling

**Reactor Core**:
- `on()` method lines 457-480: Asynchronous, batched event listeners
- Support `capture`, `depth`, `once`, `init` flags
- Batched via `schedule()` → `initBatching()` → `flush()` using `batchingFunction` (microtask by default)

**TMG Media Player Usage**:
- [SkeletonPlug.wire()](tmg-media-player/src/ts/plugs/main/skeleton/index.ts#L48): `on("state.paused", handlePaused)` for CSS class toggling
- [CaptionsPlug menus](tmg-media-player/src/ts/plugs/menus/settings/captions.ts#L66): `on("secondaryTracks")` to sync UI badge counts
- [ControlPanelPlug](tmg-media-player/src/ts/plugs/settings/controlPanel/index.ts): Listens on depth 1 to ignore deep nested updates, react only to direct property changes

**Why it Matters**:
Listeners decouple UI render cycles from state mutations. Batching via microtasks means 100 state changes fire 1 render pass, not 100.

---

## 5. Path-Level Subscription → Fine-Grained Reactivity

**Reactor Core**:
- All subscription methods (`get`, `set`, `delete`, `watch`, `on`) accept wildcard paths: `"*"`, `"user.name"`, `"settings.*.enabled"`
- `getTrailRecords()` builds a chain from root → target to fire listeners at every ancestor
- Depth filtering allows "only direct children" subscriptions

**TMG Media Player Usage**:
- [Controller config watchers](tmg-media-player/src/ts/core/controller.ts#L198): `on("lightState.disabled")` catches only that property, not all config changes
- [Plug registration patterns](tmg-media-player/src/ts/plugs/settings/volume/index.ts#L45): Each plug watches only its own settings branch
- [Settings menu](tmg-media-player/src/ts/plugs/menus/settings/captions.ts#L66): Subscribes to `"state.currentTextTrack"`, `"status.textTracks"` individually

**Why it Matters**:
Without path selectivity, every listener re-runs on every state change. With it, only the volumes plug wakes up when volume changes, only captions wakes up when tracks change.

---

## 6. Rejection Signal → Intent Validation Loop

**Reactor Core**:
- `REvent.reject()` method (via ReactorEvent class): Marks intent as disapproved during CAPTURE phase
- Listeners can check `e.rejected` during BUBBLE phase to decide whether to render optimistically
- Rejection is **advisory, not enforcement**—tech rejects, UI chooses to honor it

**TMG Media Player Usage**:
- [LightStatePlug](tmg-media-player/src/ts/plugs/main/lightState/index.ts#L18): Capture listener that calls `e.resolve()` to claim the intent, preventing other handlers
- [FOLKLORE.md](tmg-media-player/FOLKLORE.md#L47): Documents the Apprentice mode: "checks rejection and reverses if needed"
- [Component slider handlers](tmg-media-player/src/ts/plugs/base/slider.ts#L60): Would check rejection to snap back instead of showing invalid seek position

**Why it Matters**:
Rejection without enforcement keeps UI responsive (no rollback lag) while staying honest (no impossible states persisting). The tech says "I can't do that" and the UI trusts it.

---

## 7. Proxy + Reference Tracking → Circular Dependency Prevention

**Reactor Core**:
- `proxyCache` (WeakMap): Caches proxies so nested access returns same proxy, preventing infinite recursion
- `lineage` (WeakMap): Tracks parent-child object relationships when `referenceTracking: true`
- `link()` / `unlink()`: Maintain bidirectional references for `snapshot()` and `stamp()`

**TMG Media Player Usage**:
- [Controller.media](tmg-media-player/src/ts/core/controller.ts#L49): Contains `pseudoElement`, `container`, `pseudoContainer` all proxied and tracked
- [Persist plug](tmg-media-player/src/ts/plugs/settings/persist/index.ts): Uses `snapshot()` to serialize state without proxy references
- [Config cloning](tmg-media-player/src/ts/core/controller.ts#L60): `this._build = this.config.snapshot()` for reset capability

**Why it Matters**:
If every nested access created a new proxy, you'd lose object identity (`player.media.container === player.media.container` would fail). Reference tracking enables cloning and serialization without breaking app logic.

---

## 8. Batching & Flushing → Microtask Coherence

**Reactor Core**:
- `isBatching` flag: True during async batch window
- `schedule()` adds path payload to batch map
- `flush()` calls `wave()` for each accumulated path in order
- `batchingFunction` (default: `queueMicrotask`): Controls batch timing

**TMG Media Player Usage**:
- [Controller state watch](tmg-media-player/src/ts/core/controller.ts#L70): Rapid `state.readyState` changes get batched into one event wave
- [PlaylistPlug content update](tmg-media-player/src/ts/plugs/main/playlist/index.ts#L90): `fanout(this.settings, item.settings)` triggers many mutations, reactor batches them
- [Gesture plug](tmg-media-player/src/ts/plugs/settings/gesture/index.ts): Touch events fire multiple intents per microtask, reactor dedupes via batch

**Why it Matters**:
Without batching, a single gesture fires 10 state mutations = 10 UI rerenders = jank. With it, 1 render pass for all 10, staying 60fps.

---

## 9. Smart Cloning → Structural Sharing for Snapshots

**Reactor Core**:
- `cloned()` method lines 390-419: Deep clone with structural sharing cache
- `SSVERSION` stamp on objects: Only re-clones if object changed since last clone
- `smartCloning: true` config: Uses version stamps to skip cloning unchanged branches

**TMG Media Player Usage**:
- [Controller build cache](tmg-media-player/src/ts/core/controller.ts#L60): `_build = this.config.snapshot()` saves initial config for reset
- [Persist module hydration](tmg-media-player/src/ts/plugs/settings/persist/index.ts): Snapshots state to localStorage, rehydrates on next load without object cloning overhead
- [Settings menu logic](tmg-media-player/src/ts/plugs/menus/settings/captions.ts#L66): Menu state rebuilt from snapshots, structural sharing prevents unnecessary allocations

**Why it Matters**:
Snapshots for reset/undo are cheap only if unchanged branches are reused, not cloned. This matters when config has 50+ nested plugin settings; without structural sharing, snapshot = 50KB allocation every time.

---

## 10. Modules → Pluggable Policy Engines

**Reactor Core**:
- `use(module)` method line 498: Registers ReactorModule instances
- Module `.setup()` hook receives reactor reference, can install global mediators
- Modules can wrap mediator callbacks, add their own listeners

**TMG Media Player Usage**:
- [PersistModule](tmg-media-player/src/ts/plugs/settings/persist/index.ts): Hooks into reactor to auto-sync state to storage
- [TimeTravelModule](tmg-media-player/src/ts/plugs/settings/timeTravel/index.ts): Mediates all sets to build undo/redo stack
- [Each Plug](tmg-media-player/src/ts/plugs/base/index.ts#L8): Inherits from BasePlug, uses reactor internally to wire behavior

**Why it Matters**:
Without the module port, persistence and time-travel would have to be hardcoded into every plug. Modules centralize cross-cutting concerns, letting each plug focus on its single domain.

---

## Summary: The Flow

```
User Input (e.g., seeking to new time)
  ↓
  intent.currentTime = 50 (User sets wish)
  ↓
  Reactor.set Trap fires
  ↓
  CAPTURE Phase: LightStatePlug captures, checks if allowed
  ↓
  If rejected: event.reject() called
  ↓
  TARGET Phase: Direct listeners fire
  ↓
  BUBBLE Phase: Components listen with depth=1
  ↓
  Smart Optimist checks event.rejected
  ↓
  If not rejected: render seek bar at 50
  If rejected: keep seek bar where it was
  ↓
  Tech processes new time asynchronously
  ↓
  state.currentTime updates when ready
  ↓
  Listeners fire (batched via queueMicrotask)
  ↓
  UI rerenders once (not 10 times)
```

Every stage is enabled by a specific reactor primitive. Remove any, and the chain breaks.
