# Changes

Egatari 1.0 is an Editor's Draft: `main` is the live draft and may change at any time. Dated snapshots are tagged `wd-YYYY-MM-DD` (Working Draft); a second snapshot on the same day adds a letter (`wd-YYYY-MM-DDb`). Implementations say which snapshot they follow (for example, "Egatari Studio 0.4.6 follows Egatari 1.0 WD 2026-10-24"). Nothing is stable before 1.0 is frozen; snapshots exist so that implementations and lessons can name the draft they were built against.

## Since WD 2026-10-25

Changes on `main` after the snapshot; they will be in the next Working Draft.

**The 1.0 file shape (owner, 2026-10-25: the format describes the lesson; players are separate and anyone may write one)**
- §4.1 the bundled player: the runtime script is one conforming player carried in the file, not part of the format; `player` `{name, version}` is REQUIRED in the index and `deck-meta`; `generator` names the producer only; the lesson MUST be playable without the bundled player; an editor that rebuilds tells the user when the player changes; information panels show format, player, producer in that order.
- §4.2 network policy in the file: every file carries a fixed Content-Security-Policy `<meta>` first in `<head>` (baseline `connect-src 'none'`, every resource `data:`/`blob:` only); only extensions that allow network access add their declared destinations (`live` to `connect-src`, `embed` to `frame-src`); validators, editors and hosts check it. `extensions/live.md` and `extensions/embed.md` refer to it.
- No backward compatibility with earlier drafts (§7.1): files without `player` are pre-1.0 drafts; they keep playing with their own player; 1.0 editors MAY refuse to edit them and point to an earlier editor or migration instructions.
- Removed: slide keys from heading text, hand-written `data-key` and `s<n>` (every slide has an id; narration headings carry `{#id}`); `?mode=lecture`; `:name:` in Egatari Text; camera `camera-v1` (§8.3A) and `zoom` in `deck-marks` — zooming is a component effect (owner, 2026-10-25).
- §8: the contract link points to egatari/egatari-studio.
- Lessons without slides: a lesson has slides, an article, or both; `entry` is no longer required when `article` is present (schema `anyOf`); an article-only lesson has no steps, narration or audio in 1.0, its primary face is `read`. `index.article` is now in the schema.
- §8.4: the context passed to components as a normative table (`mode`, `preview`, `slide`, `instant`, `reset`, `extend`, `live?.poll`; `ctx.deck` is not part of the interface) and the theme colour vocabulary (`--fg --bg --emph --term --accent2 --muted --line`). §4.1 states the draft limitation: components still depend on the bundled player's globals; Appendix A 1A (blocker) opens the component host interface.
- **Players split out** into [Egatari Player 1.0](egatari-player-1.0.md), versioned separately: display modes and the preview option (was §1.2), layouts and panes (§1.2A), playback (§9.1), following links (§9.1A behaviour), links that leave the lesson (§11), learner-data anchors and export (§9.1B), tracking adapters (§9.2), source extraction (§9.3) and embedding (§9.4). The format keeps faces, `metadata.primary` and `metadata.offer` (§1.2), the link syntax (§9.1A), the rule that learner data never enters the file (§9.1B) and completion (§9.2). Player conformance (P9): `talk` and the read face MUST, `learn` SHOULD, `video` MAY. The SCORM 1.2 binding is outside the format.
- §9C.14 (informative): book first — source material → article → slides is a common order of work; an article-only lesson is a normal stage; slides made from an article are linked to their section and recorded as confirmed.
- `contracts.runtime` is removed (`contracts` is `{source}`): the data-block layout is the format version, behaviour is the bundled player's. Tier B rebuilds with the editor's player; tier C is now updating components or themes beyond their pins. Tier A edits keep `player` and `generator`; rebuilding writes the editor's `player`, `generator` and `deck-meta.tracking`.

**Viewer input and stage directions**
- §8.2: stage directions `{note:…}` — shown only in the presenter's view; not spoken, not in captions, video or print; outside `ttsParts` and `inputHash`.
- §8.4: viewer input — components MAY take values from the presenter (on the stage or from the presenter's view) or a learner; viewer state outside *(i, k, t)* that persists while the viewer stays on the same slide and is reset on entering the slide from elsewhere or by a jump (owner, 2026-10-25: a count must survive into the step that reveals the answer); no input in video mode; keys inside an input field are the field's; no digit keys for component input; poll counts from `ctx.live` under the `live` rules.
- §8.4: `ctx.extend(seconds)` — a component with viewer input (a timer) MAY extend or shorten the live running time of the current step; durations, the timeline, video and print keep the author's values. It returns the step's total extension (`ctx.extend(0)` reads it).
- §9.1: under `prefers-reduced-motion`, a component that declares elapsed time as content (`clock`, e.g. a countdown) still receives the real *t*; only decorative motion is dropped.
- §8.4: component sounds — `events(k)` → `[{t, sound, …}]`; the player synthesizes `bell` (count 1–3), `chime` and `note` (pitch, dur, vel; chords at the same t) with Web Audio only, forward crossings in live playback only, one mute setting, the same events in video export; never the only carrier of information.
- extensions/live.md §2.5: a component bound to a poll MAY show its counts on the stage after the teacher reveals them, counts only, nothing below 3 answers, never in video or print.

**Article layer (`article-v1`, draft, §9C)**
- Source: `article.md` at the archive root in Egatari Text 1, a subset of MyST Markdown written into this specification and versioned with it (CommonMark core, `$…$`/`$$…$$` math with labels, `:::{figure}`/`:::{table}` with `:label:`, pipe tables, `[](#id)` cross-references, `[@key]` citations against CSL-JSON `references.json`, and one role `` {step}`<slideKey>:<stepKey>` ``); a table of constructs with their AST node types; everything else is rejected or converted.
- Placement: `index.article = {path, references?}`; the dependency closure includes the references file and article images.
- Section ids `sec-` + 6 base32 characters, assigned by tools, never by AI authors; each section is wrapped in `<section data-section-id>` inside `<article id="egatari-article">`, nested as the last child of the readable layer.
- Step links carry `data-egatari-step` and `href="#<slideKey>:<stepKey>"`; slides name sections with `data-article`.
- Staleness: `index.articleLinks[slideKey][sectionId] = {article, slide}`, hashed over source text, not rendered text; also carried in `egatari.json`.
- Validation errors (missing step, citation key, cross-reference target, section); text pane shows the article; pagination never splits figures, tables or display math.
- `article-v1` is not listed in `requires`; players without it play the lesson; editors without it are limited to tier A edits on lessons with an article (§7.2).
- Informative: print/PDF as output, a JATS mapping, authoring guidance for AI.

## WD 2026-10-25

Snapshot for the Egatari Studio release after 0.4.8 (new-lesson flow). It adds one change to WD 2026-10-24b; the article layer (§9C) stays on `main` as a draft and is not part of this snapshot.

**Components (§8.4)**
- Presentation variants and the lesson seed: `data-egatari-seed` on the source root (absent = 0), `seed` and `variant` on a component; the variant is a pure function of these; variants never change steps, durations, cues, final content or colors, and never move more than seed 0; editors write a seed once when creating a lesson and preserve it.

## WD 2026-10-24b

Second snapshot of the day, for Egatari Studio 0.4.8. It adds four changes to WD 2026-10-24; the article layer (§9C) stays on `main` as a draft and is not part of this snapshot.

**Archive and index**
- `egatari.json`: a producer may keep its own state under one producer-named member, which others preserve.
- `egatari.json` may pin themes with the same rules as components; `index.themes[].version` is the theme's own version.
- A theme's identity hash covers the files a build reads, not documentation.

**Runtime**
- `deck-narration`: optional `ttsParts` per turn, so that device read-aloud says what the audio would say.

## WD 2026-10-24

First dated snapshot. It covers the draft from 2026-10-17 to 2026-10-24.

**Principles**
- Self-contained by design: a lesson loads nothing by address; network access only through an opt-in extension whose definition allows it (today `live`). Extensions are optional layers; players, editors and hosts conform without implementing any. Reference implementation: Egatari Studio.
- One source, many views (§1.0); layouts as panes, detached panes, learner notes; offered modes (the author's intent for modes and where to open).

**Archive and index**
- Attachments (§3.8): what may be attached, PDF actions, script extensions, text limits, learner copies, player filtering.
- `exportedFrom`: marks a copy exported from an authoring folder; dropped when saved as a new lesson.
- Components: line endings normalized before identity hashes; the export writes the version pin into `egatari.json`; a registry may withdraw a release, and editors offer a rebuild and never substitute silently.
- Themes may declare their frame geometry for authoring tools and checks; required for bundled and official library themes, recommended for user themes; players render from CSS only.

**Audio and timing**
- Cues for recorded takes may be placed by the user or measured; TTS made elsewhere keeps its cues when its `inputHash` matches.
- `deck-audio` carries `kind`; players mark synthesized narration.
- Audio watermarks (draft).
- §5.6 Reading with the device voice: a player may read a step without audio with an on-device voice, never as audio of the lesson.

**Components and embedding**
- Component contract: mount after layout and fonts; viewer interaction is not part of *(i, k, t)* and is reset on entering a step.
- Embedding (§9.4): optional position events between step changes, text-pane scrolling as seek and skip, per-step turn index; `openLink` event (with an optional `download` flag) for links a sandboxed lesson cannot open itself.
- Camera (`camera-v1`, draft): zoom and pan in time with the narration.

**Security (§11)**
- Links that leave the lesson show their destination and are confirmed when suspicious (scheme, host mismatch, internationalized hosts, user information, downloads); player-generated links are exempt when the player shows their host; platforms that need a fresh tap.

**Extensions**
- `live` (draft v1): join a live session from the distributed lesson (questions anchored to a step and region, "I don't follow", polls with labels, host replies); one-tap join; window and endpoint limits; a join page; a host acting for a sandboxed lesson (with an endpoint allow-list); one-way setup from the editor with a setup secret no lesson carries; results readers ignore unknown members, and the service records only declared activities.
- `embed` (draft v1): click-to-load third-party video and maps with a required placeholder.

**Open issues added or extended**
- 2 public component registry (direction); 7 citations (CSL-JSON, `[@key]`, presentation chosen by the author); 9A multilingual lessons and right-to-left scripts; 12 extension governance; 13 encrypted lessons.

**Other**
- Logo recoloured to konai #4A488E and hiiro #D3381C.
