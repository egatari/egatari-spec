# Egatari extension `live` — Draft v1

**Status:** draft, 2026-10-21. Registered in [../extensions.md](../extensions.md). Consumed by **players**: a player that implements it lets the learner take part in a live room (questions, polls) from the distributed lesson itself, without scanning a code or opening another app. Players that ignore it render and time the lesson exactly the same; nothing in this extension is part of the stage, so *(i, k, t)* rendering, video and print are unaffected.

This is the only part of Egatari that lets a lesson connect to the network. It is opt-in by the author, limited to one declared endpoint and to a time window, and visible to the learner while connected.

## 1. Data (`extensions.live`)

```json
{
  "v": 1,
  "endpoint": "https://live.egatari.org",
  "room": "r-7k2q9xw4",
  "key": "base64url capability, 22+ characters",
  "window": {"from": "2026-10-30T09:00:00+09:00", "to": "2026-10-30T11:00:00+09:00"},
  "activities": {
    "*": [{"id": "qa", "kind": "qa"}],
    "s-k3f9q2:2": [{"id": "p1", "kind": "poll", "prompt": "学習率を大きくすると？", "choices": ["速く収束", "発散しうる", "変わらない"]}]
  }
}
```

| Member | Meaning |
|---|---|
| `endpoint` | the only origin the player may connect to (HTTPS). |
| `room`, `key` | the room and a capability to join it. Anyone holding the file can join while the room is open (see §4). |
| `window` | the only interval in which the player may connect. Outside it the player MUST NOT make any request. |
| `activities` | step key (or `"*"` for the whole lesson) → list. `kind`: `qa` (learners send questions; the teacher sees and answers), `poll` (single choice; `choices` required). `board` (short notes on a shared board) is reserved for v2. |

Authoring: activities are set in the editor when exporting a play-only derivative "with a live room"; v1 defines no `narration.md` lines. The author's own lesson keeps `extensions.live` without `key` (the key is added to the exported derivative only).

## 2. Player behaviour

A player that implements `live`:

1. MUST NOT open any connection unless `extensions.live` is present, the current time is inside `window`, and the context allows network access. In a host or preview that forbids network access (spec §10.1, §11), it MUST NOT try; it MAY show the room's web address (and a code) instead, so that learners can join from a browser.
2. MUST, before or at the first connection, show that the lesson connects to `endpoint` (e.g. "This lesson is connected to a live room at live.egatari.org"), and while connected show a persistent indicator with a way to disconnect. It MAY connect without a tap when the window is open; joining must not require an account.
3. MUST send only what an activity needs: the learner's question or choice, the activity id and step key, and a random participant id generated on the device (no name unless the learner types one). It MUST NOT send viewing position, timing, playback events or any other telemetry.
4. MUST restrict its connections to `endpoint` (e.g. `connect-src` in the runtime's content security policy) and MUST NOT load scripts, styles or images from it; activity content arrives as data and is shown as text.
5. Shows activities outside the stage (a pane, spec §1.0), so that the stage, captions and marks stay as authored. A `poll` for a step appears when that step is reached; `qa` is available for the whole window.

## 3. Results

Results belong to the teacher. The room service lets the teacher download them as JSON (`{room, window, activities, responses}`), which the editor MAY add to the teacher's lesson as an attachment with role `data` (spec §3.8). Results are never written into play-only derivatives.

## 4. Room service (informative)

The reference service at `live.egatari.org` (Egatari Studio) keeps rooms only for their window plus a short grace period and then deletes them. The teacher can open and close a room, require approval before learners appear, and replace the key (which locks out copies of the file that leaked). Learners' questions are visible to the teacher only unless the teacher shows them.

## 5. Open questions

- Whether `board` (v2) and a teacher overview of learners' work need end-to-end encryption by default, and how that interacts with moderation.
- Whether a lesson may declare more than one room (several classes, one file) or the editor exports one derivative per room.
- Minimum notice wording in both languages, and whether schools' policies require a tap before the first connection for minors.
