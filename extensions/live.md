# Egatari extension `live` — Draft v1

**Status:** draft, 2026-10-21. Registered in [../extensions.md](../extensions.md). Consumed by **players**: a player that implements it lets the learner take part in a live room (questions, polls) from the distributed lesson itself, without scanning a code or opening another app. Players that ignore it render and time the lesson exactly the same; nothing in this extension is part of the stage, so *(i, k, t)* rendering, video and print are unaffected.

This is the only part of Egatari that lets a lesson connect to the network. It is opt-in by the author, limited to one declared endpoint and to a time window, and visible to the learner while connected.

## 1. Data (`extensions.live`)

```json
{
  "v": 1,
  "endpoint": "https://live.egatari.org",
  "room": "r-7k2q6xw4",
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
| `room`, `key` | the room (`r-` and 8 lowercase base32 characters) and a capability to join it. The key travels in the WebSocket address when joining; it is already in the file, so this exposes nothing new. Anyone holding the file can join while the room is open (see §4). |
| `window` | the only interval in which the player may connect. Outside it the player MUST NOT make any request. Players MAY allow a small clock skew at both ends (at most 5 minutes; the reference player uses 2). |
| `activities` | step key (or `"*"` for the whole lesson) → list. `kind`: `qa` (learners send questions; the teacher sees and answers), `poll` (single choice; `choices` required; a vote is the 0-based index of the choice; v1 shows learners no tally). `board` (short notes on a shared board) is reserved for v2. |

Authoring: activities are set in the editor when exporting a play-only derivative "with a live room"; v1 defines no `narration.md` lines. The room must know the same `activities` (to label results and to reject votes for unknown activities or choices): in v1 the editor shows them for the teacher to give to the room's page together with `room`, so the editor itself still makes no request. The author's own lesson keeps `extensions.live` without `key` (the key is added to the exported derivative only).

## 2. Player behaviour

A player that implements `live`:

1. MUST NOT open any connection unless `extensions.live` is present, the current time is inside `window`, and the context allows network access. In a host or preview that forbids network access (spec §10.1, §11), it MUST NOT try; it MAY show the room's web address (and a code) instead, so that learners can join from a browser.
2. MUST, before or at the first connection, show that the lesson connects to `endpoint` (e.g. "This lesson is connected to a live room at live.egatari.org"), and while connected show a persistent indicator with a way to disconnect. The learner MUST tap once ("Join") before the first connection of a session; joining must not require an account. (Connecting without a tap was considered and left out of v1: lessons for minors.)
3. MUST send only what an activity needs: the learner's question or choice, the activity id and step key, and a random participant id generated on the device (no name unless the learner types one). For `qa` under `"*"`, the step key is the step on screen when the learner sends the question; it is attached only to what the learner chose to send. It MUST NOT send viewing position, timing, playback events or any other telemetry.
4. MUST restrict its connections to `endpoint` and MUST NOT load scripts, styles or images from it; activity content arrives as data and is shown as text. Producers SHOULD write a content security policy `<meta>` into derivatives that carry `live` (before any script), with `connect-src` listing the endpoint for both schemes (e.g. `https://live.egatari.org wss://live.egatari.org`, since some browsers do not apply an `https:` source to `wss:`) and nothing else that reaches the network; players SHOULD also check every connection against `endpoint` themselves.
5. Shows activities outside the stage (a pane, spec §1.0), so that the stage, captions and marks stay as authored. A `poll` for a step appears when that step is reached; `qa` is available for the whole window.
6. Reconnects only after a close that the service marks as retryable (in the reference protocol, not 4400 invalid, 4403 wrong key, 4410 expired, 4423 closed, 4440 key replaced), with increasing delays, and only inside `window`; it stops trying when the window ends.

## 3. Results

Results belong to the teacher. The room service lets the teacher download them as JSON (`{room, window, activities, responses}`; the shape of `responses` is defined by the reference protocol, [egatari/live PROTOCOL.md](https://github.com/egatari/live/blob/main/PROTOCOL.md)), which the editor MAY add to the teacher's lesson as an attachment with role `data` (spec §3.8). Results are never written into play-only derivatives.

## 4. Room service (informative)

The reference service at `live.egatari.org` (Egatari Studio) keeps rooms only for their window plus a short grace period and then deletes them. In v1 the teacher creates a room on the service's own page and copies `room` and `key` into the editor's export settings, so the editor itself still makes no network requests. Managing a room needs a separate **teacher key**, shown once when the room is created and kept in the fragment (`#…`) of the teacher's page address; it is never written into a lesson or an export. The teacher can open and close a room, require approval before learners appear, and replace the key (which locks out copies of the file that leaked). Learners' questions are visible to the teacher only unless the teacher shows them.

## 5. Open questions

- Whether `board` (v2) and a teacher overview of learners' work need end-to-end encryption by default, and how that interacts with moderation.
- Whether a lesson may declare more than one room (several classes, one file) or the editor exports one derivative per room.
- Minimum notice wording in both languages.
- Anyone can create a room without an account: the reference service limits room creation per client and watches usage; whether v2 needs a teacher identity (e.g. a signed lesson, §8 signatures) to create rooms.
