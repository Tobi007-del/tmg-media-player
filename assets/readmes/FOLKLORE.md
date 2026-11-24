# This is the **Folklore of the Three Brushes**. 🖌️

The documentation for a system where "Truth" and "Desire" are separate frequencies. This is the explained **Three Modes of Interaction** using a Royal Court metaphor, followed by the technical translation.

---

# Part I: The Parable of the King's Height

**The Setting:** The Royal Studio.

**The Cast:**

- **👑 The King (User):** Delusional. Wants things that physics usually forbids.
- **🧙‍♂️ The Physician (Adviser/Logic):** The cold voice of biological reality. He holds the **Official Ledger** (State).
- **🎨 The Artist (The Component):** A single painter who can be hired in three different "moods."

**The Incident:**
The King stands on a box and shouts, **"Paint me! I declare that I am 10 feet tall!"**
_(The Physician measures him. He is clearly only 6 feet. He stamps **[REJECTED]** on the request.)_

---

### 1. The Mode of the Cynic (State-Only)

_The Artist trusts no one but the Physician._

The King screams "10 feet!" The Artist does not flinch. He does not dip his brush. He ignores the King entirely and looks at the Physician.

**Physician:** "He is 6 feet."
**Artist:** "Understood."
_(The Artist paints a 6-foot King.)_

- **The King feels:** Ignored. The experience feels "heavy" and slow.
- **The Result:** Absolute Truth. The painting matches the Ledger perfectly.

### 2. The Mode of the Sycophant (Reckless Optimism)

_The Artist lives to please the King, regardless of reality._

The King screams "10 feet!" The Artist immediately splashes paint on the canvas, drawing a massive 10-foot giant.

**Physician:** "Objection! He is 6 feet! I have REJECTED this claim!"
**Artist:** "I don't care what you measured. The King _said_ 10, so I painted 10."

- **The Result:** State Pluralism.
- The Painting (UI) shows a Giant.
- The Ledger (State) lists a Man.

- **The Consequence:** The King feels powerful, but the kingdom is confused because the painting is a lie.

### 3. The Mode of the Prudent Apprentice (Smart Optimism)

_The Artist wants to please, but fears the Physician's wrath._

The King screams "10 feet!" The Artist dips his brush, eager to paint the giant... but he pauses. He watches the request paper travel to the Physician.

**Physician:** _(Stamps Red Ink)_ **[REJECTED]**.
**Artist:** "Ah. I see the red stamp."
_(The Artist wipes his brush clean and leaves the canvas alone. He paints nothing new.)_

- **The Result:** A failed attempt. The King tried to lie, but the Artist saw the rejection and refused to visualize the lie. The painting remains at the last valid state (6 feet).

---

# Part II: The UI Playout

**The Scene:** A Video Player. The User tries to drag the seek bar past the "Buffered" zone (which is forbidden logic).

---

### Mode 1: The State-Driven Slider 🔒

**"I only show what is confirmed."**

1. **User Action:** Drags handle from `0:10` to `0:50`.
2. **Component:** Does **not** move the handle under the mouse. It fires the intent.
3. **Adviser (Logic):** Processes the request... (Network latency: 200ms)... Accepts `0:50`. Updates `state.currentTime`.
4. **Component:** Receives new `state`. _Now_ the handle jumps to `0:50`.

- **User Experience:** "Laggy" or "Heavy." The slider feels like it's dragging through mud because it waits for the server before moving.
- **Use Case:** Critical control panels (Nuclear reactors, Banking apps) where misrepresentation is dangerous.

### Mode 2: The Optimistic-Reckless Slider 🚀

**"I show what you wanted."**

1. **User Action:** Drags handle from `0:10` to `0:50`.
2. **Component:** Instantly snaps handle to `0:50`. Emits intent.
3. **Adviser (Logic):** Checks buffer. "Data not loaded." **REJECTS** update. State remains `0:10`.
4. **Component:** Ignores the rejection. Keeps the handle at `0:50`.

- **User Experience:** Fast, responsive, but potentially deceptive. The video is playing at 10 seconds, but the bar says 50.
- **Use Case:** Rapid scrubbing, volume sliders (where precise sync matters less than feel).

### Mode 3: The Optimistic-Smart Slider 🧠

**"I show what is allowed."**

1. **User Action:** Drags handle from `0:10` to `0:50`.
2. **Component:** Calculates the move, prepares to paint `0:50`.
3. **Event Phase (Capture):** Logic intercepts. "You cannot seek here." Marks event `{ rejected: true }`.
4. **Event Phase (Bubble):** The Slider listens to the bubble. It checks `e.rejected`.
5. **Reaction:**

- **If Accepted:** It paints `0:50` instantly.
- **If Rejected:** It discards the drag input and snaps back to `0:10` (or stays there).

- **User Experience:** "Bouncy." The slider feels fast, but if you try to do something illegal, it physically resists immediately; no rollback. It feels like a physical lock.
- **Use Case:** The Gold Standard for most rich media UIs.

---

### 📚 Documentation Summary

| Mode           | Artist Character   | Behavior                                                                       | Best For                              |
| -------------- | ------------------ | ------------------------------------------------------------------------------ | ------------------------------------- |
| **State-Only** | **The Cynic**      | Waits for the cycle to complete before moving. Strict truth.                   | Debugging, High-Risk Data, Networking |
| **Reckless**   | **The Sycophant**  | Paints immediately. Ignores rejection. Creates UI/State mismatch.              | Volume, Brightness, "Toy" Controls    |
| **Smart**      | **The Apprentice** | Attempts to paint immediately, but reverts if the Event is stamped `rejected`. | Seek Bars, Playlist Navigation, Forms |
