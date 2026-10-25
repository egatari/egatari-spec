# Egatari Player 1.0 — Editor's Draft

**Status:** Editor's Draft, split from the Egatari format specification on 2026-10-25. Not stable. It is versioned separately from the format: a player states which Egatari format versions it plays and which version of this document it follows.
**Editors:** Gendo Kumoi (Nagaoka University of Technology).
**Companion:** [Egatari 1.0](egatari-1.0.md), the format (referred to as *format*). References written §n are to the format; references written Pn are to this document.
**License of this document:** [CC BY 4.0](LICENSE.md).

The format describes what a lesson is: its slides, steps, narration, article, audio and components, and how they are stored in one HTML file. This document describes how a **player** shows a lesson. Players are separate from the format and anyone may write one (format §4.1); every Egatari file carries one conforming player, the bundled player, so that it plays anywhere.

## P0. Conventions

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as in BCP 14 [RFC 2119] [RFC 8174] when they appear in all capitals.

## P1. Display modes

| Mode | Who drives | Time | Typical use |
|---|---|---|---|
| `talk` (default for a bare file) | the presenter, step by step | real time of each step | live presentation, class |
| `learn` | the learner: start, pause, previous/next, jump, playback rate | advances along the timeline (format §5.5) with narration audio | self-study, LMS (default in LMS bindings and hosted players) |
| `video` | nobody (no controls) | advances along the timeline | recording and video export |

**Preview of later steps** is an option of every interactive mode, not a mode: steps not yet reached are either hidden (default) or shown faintly. The current step renders and animates as usual; only content of later steps is shown faintly, and components keep rendering their current step.

In `learn` mode, a player MUST offer playback rates of at least 0.75, 1, 1.25, 1.5 and 2, keeping the pitch of speech; the timeline clock advances at the same rate, so the screen stays a function of *(i, k, t)*. Presenter-only tools (presenter view, laser) SHOULD be hidden.

When embedded by a host (P8, format §10), the host MAY hide the player's own controls (`controls=0`) and provide equivalent ones itself (chapter list, playback rate, pause), and MAY restrict forward navigation as a course policy. The requirement to offer controls is then met by the host.

**Offered views.** Players SHOULD show only the modes and faces in `deck-meta.offer` (format §1.2) and open as `offer.open` states (defaults: all modes, the faces present, `metadata.primary`). What a player opens in is decided in this order, the first that applies winning: the viewer's or host's explicit choice (an address parameter such as `?mode=`, the embedding interface P8), then `offer.open`, then `metadata.primary` (face only), then the defaults by context (P2). Players MAY let the viewer override the offer.

## P2. Layouts and panes

Independently of the mode, a player arranges the lesson in **panes**. A layout is an arrangement of panes; every pane shows the same position, and layouts are views of one source (format §1.0), not different documents.

| Pane | Shows | In the file |
|---|---|---|
| **stage** | the talk face: one 16:9 slide stage at a time, animated | yes |
| **text** | the read face: the article (format §9C) when present, otherwise the narration of each step as body text, with each slide's stage scaled (not re-flowed) at its place | yes |
| **notes** | the learner's notes and ink for the current position (P5) | **no** — learner data |

A pane of kind text is either **scrolled** (a vertical document) or **paginated** (single pages or a two-page **spread**). Page breaks MUST NOT split a step's block, a figure, a table or a display equation; a block taller than a page is scaled down to fit rather than split. Players choose the page breaks and the pairing of pages in a spread; page breaks can be switched off. Page breaks depend on the pane's size, fonts and language and are not part of the *(i, k, t)* determinism (format §1), which covers the stage; conformance tests of video frames and stage rendering do not cover pagination. A stage pane can also be paginated (one slide per page, for printing and handouts).

The usual layouts are named combinations:

| Layout | Panes | Typical use |
|---|---|---|
| `slides` | stage | talk, video |
| `flow` | text, scrolled | reading, portrait phones |
| `pages` (`pages=single\|spread`) | text, paginated — the read face as pages is a **book**; the talk face as pages is *slides in a book* | books, printing |
| `split` | stage + text | self-study on wide screens |
| — | stage + notes, text + notes, stage + text + notes | self-study with note-taking |

- **Synchronization.** All panes follow one position. Moving any pane — advancing the stage, scrolling or turning pages of the text, selecting a note — moves the others: the text to the step's block or to the article section of the slide (format §9C.5), the stage to the corresponding step, the notes to that position. Switching layout MUST preserve the position (slide and step). During audio playback the current narration turn SHOULD be highlighted in the text.
- **Scrolled text and motion.** In a scrolled text pane, scroll position maps to *(i, k, t)*: a step plays once from *t = 0* as its block enters the viewport (again only after it has left the viewport entirely) and is at its final state once passed; with `prefers-reduced-motion` only final states are shown. Players MAY additionally let the viewer scrub *t* by scrolling; it is not required.
- **Detached panes.** A player SHOULD let the viewer move a pane into a separate window (e.g. the stage on a projector or a second display, the text or notes on the laptop) and back. A detached pane stays synchronized with the others without network access, also when the lesson is opened from a local file; the mechanism is the player's (e.g. messages through the opening window; a same-origin broadcast channel only as an optimization). Closing it returns the pane to the main window. **Exactly one window plays the audio** at any time (by default the opening window; the viewer MAY move it, e.g. to the projector's speakers); other windows show the stage silently. The presenter view of `talk` is a detached arrangement of the same kind.
- **Defaults.** Players SHOULD choose by context: `slides` for `talk` and `video`; for `learn`, `split` on wide screens and `flow` on narrow (portrait phone) screens; `flow` for `read`; `pages` when printing. A lesson declares which face is primary in `metadata.primary` (`"talk"` or `"read"`, default `"talk"`); players open on that face. A file may carry both faces, but typically one is primary: slides for a talk, a book for a textbook. A viewer's choice of layout and panes MAY be remembered per viewer (P5), never in the file. Hosts MAY set `layout=` when embedding (P8). **Precedence:** when embedded, the host's `layout=` and mode win over the viewer's remembered choice; otherwise the viewer's choice wins over `metadata.offer.open` (P1), which wins over the defaults above.

## P3. Playback

A conforming player MUST: render any *(i, k, t)* deterministically; implement the modes that P9 requires and the preview option (P1); play the formats in format §5.1; start audio only after a user gesture (a visible start/resume control); pause when the page is hidden; honor `prefers-reduced-motion` by rendering final states, except for a component that declares elapsed time as its content (a clock or countdown, `clock` in the component release manifest, format §6), which still receives the real *t* and drops only decorative motion; and work from `file://` with no network access.

**Information panel.** Players SHOULD show, in their information panel, the format version the file follows, the bundled player and the producer, in that order (format §4.1).

## P4. Links

### P4.1 Links to slides

The syntax of links to slides is in format §9.1A.

- Following a link moves to step 0 of that slide (or the given step) at its final state in `talk` mode; in `learn` and `video` mode it seeks there and keeps the current playing state. In the `flow` and `pages` layouts it scrolls to that step's block (in `split`, both sides move). Players SHOULD offer "back" to the position before the most recent link.
- Players MUST keep link navigation inside the document (no top-level navigation). When embedded (P8), a link produces a `position` event with `cause: "link"`, and a host that restricts navigation (P1) MAY veto it; players then stay where they are.

### P4.2 Links that leave the lesson

**Links that leave the lesson** are a phishing surface like links in PDF files, and a browser shows less context than a PDF reader. A player MUST open them outside the lesson (a new browsing context, `noopener`, `noreferrer`) and MUST let the viewer see the destination's host before leaving (a confirmation, or a preview on hover or long press). It MUST ask for confirmation, showing the full destination, when the link's visible text names a different host than the destination, when the destination is not `https:`, or when it would download a file; it SHOULD NOT ask again for the same host in the same viewing session. Links within the lesson (format §9.1A) need no confirmation. Hosts that play lessons apply the same rule to links the lesson asks them to open. In detail: (a) players open only `https:`, `http:`, `mailto:` and `tel:` destinations and refuse every other scheme (`javascript:`, `data:`, `blob:`, `file:` as an absolute address, …); every destination other than plain `https:` is confirmed each time; (b) in a lesson opened from a file, a relative link to a neighbouring file is confirmed each time; (c) a destination carrying user information (`user:pass@`) or an internationalized host (`xn--` labels) is treated like a different host and confirmed each time; (d) "names a different host" means any host-like token in the link's visible text that differs from the destination's host, ignoring a leading `www.`, a subdomain counting as different (players MAY narrow host-like tokens with a public-suffix list to avoid needless confirmations); (e) "would download" means a `download` attribute (a player cannot know a server's response in advance); (f) only plain `https:` hosts are remembered for the session, in memory only; where the platform needs a fresh tap to open a new browsing context (e.g. a host acting on `openLink`, P8, on Safari), a single tap on an open control without the warning counts as not asking again; (g) where the player cannot open a new browsing context (an editor's sandboxed preview), it shows the destination without a way to open it; (h) links the player itself generates (e.g. joining a live room in the browser, saving an attachment) are not lesson content and need no confirmation, provided the player shows their destination host in its own interface and no lesson markup can mark a link as such; (i) a browser's own "open in new tab" cannot be intercepted, and the browser then shows the address itself.

## P5. Learner data

Learner data never enters the file (format §9.1B).

- **Anchors.** Each note is anchored to a position that survives revisions of the lesson: a slide key and step key, or an article section id, optionally with a point or range inside it. A note made on a stage pane carries a point in stage coordinates (1280×720); a note made on a text pane carries a text range (a quote of the selected text with a little context before and after, as in the W3C Web Annotation text-quote selector), so that it survives reflow and small edits. Because slide ids are stable (format §8.1), notes stay attached when the lesson is revised; a note whose anchor no longer exists is kept and shown as detached, never discarded silently.
- **Kinds.** Typed text and ink (pen strokes with pressure, in stage or page coordinates), as in note-taking applications.
- **Export.** Players SHOULD let the learner export notes: as PDF (each slide's final state or each page of the text, with the learner's notes and ink drawn over or beside it), and as Markdown with the anchors. Notes are output: importing them back is optional.

## P6. Tracking adapters

A player SHOULD expose progress through a tracking adapter, detected in this order: SCORM 1.2 API (`window.API` in a parent frame), then `postMessage` to the parent, then local storage. Events: `started`, `step` (`{slideKey, stepKey, index, total}`), `completed`, `suspend` (`{location, data}`). The SCORM 1.2 binding is defined in [`bindings/scorm12.md`](bindings/scorm12.md). A player lists the adapters it implements in `deck-meta.tracking`; completion rules are read from `deck-meta.completion` so that play-only files can be tracked. Completion defaults to "every step visited"; `metadata.completion` MAY set `{"visitedFraction": number}` or `{"reachedEnd": true}`.

## P7. Source extraction

A player SHOULD offer to save the archive layer as a ZIP of `files` plus `audio/manifest.json`, so the source remains recoverable without any editor.

## P8. Embedding

A host page (a learning platform, an LMS plugin, a video tool) MAY embed an Egatari file in an `<iframe>` and drive it. A player that supports embedding MUST, when loaded with the query parameter `embed=1`, accept messages from `window.parent` via `postMessage` (objects with a string member `egatari`) and ignore messages from any other source. Query parameters `mode`, `layout`, `controls=0` and `preview=1` set the initial state. Every command MAY carry an `id`; the player echoes it in the reply or acknowledgement. Times are seconds as floating-point numbers.

Commands (host → player):

| Message | Effect / reply |
|---|---|
| `{egatari:"seek", id?, slide, step, t}` | go to *(slide, step, t)*; `slide` is a slide key or index, `step` a step key, `t` seconds or `null` for ∞. Reply `seeked` |
| `{egatari:"play", id?}` / `{egatari:"pause", id?}` | start / pause timeline playback with audio. If the browser refuses to start audio, reply `playBlocked` |
| `{egatari:"rate", id?, value}` | playback rate (P1) |
| `{egatari:"mode", id?, mode}` / `{egatari:"layout", id?, layout}` / `{egatari:"preview", id?, on}` / `{egatari:"controls", id?, visible}` | display mode, preview of later steps, the player's own controls |
| `{egatari:"snapshot", id, slide, step, t, maxWidth?}` | reply `{egatari:"snapshot", id, png}` with a `data:image/png` of that position (`t` `null` = ∞), without changing the visible position |

Events (player → host; target origin `*`; payloads contain no private data):

| Message | When |
|---|---|
| `{egatari:"ready", version, docId, sourceSha256?, timeline:[{slideIndex, slideKey, stepKey, slideTitle, dur}]}` | after loading |
| `{egatari:"seeked", id?, slideKey, stepKey, t}` | after a seek has been applied |
| `{egatari:"position", slideKey, stepKey, t, cause}` | MUST on every step change (`cause`: `play`, `seek`, `control`, `link`); during playback a player MAY also send it between step changes, at most 4 times per second, driven by a clock it already has (e.g. the audio element's `timeupdate`); it need not add a timer for this. Scrolling or turning pages in a text pane is a `seek` |
| `{egatari:"stepEnded", slideKey, stepKey}` | when a step has played to its end during playback (not when skipped; moving to another step by scrolling or turning pages in a text pane is a skip) |
| `{egatari:"state", playing, rate}` | whenever playing state or rate changes, including by the player's own controls |
| `{egatari:"playBlocked", id?}` | audio could not start for lack of a user gesture |
| `{egatari:"turn", slideKey, stepKey, index}` | OPTIONAL: when narration turn `index` starts; `index` is 0-based within the step's turns (format §4). It marks the same moments at which a text pane highlights the current turn |
| `{egatari:"ended"}` | after the last step of the timeline |
| `{egatari:"openLink", href, text, download?}` | when the viewer activates a link that leaves the lesson (format §11) and the player cannot open it itself (e.g. in a sandboxed frame without popups); sent only on the viewer's own activation. `text` is the link's visible text (at most 200 characters); `download: true` when the link has a `download` attribute, which the host confirms every time or refuses. A host that acts on it treats it as untrusted and applies format §11 itself (schemes, confirmation showing the full destination, opening outside the lesson); it never opens anything without a tap in its own interface |
| `{egatari:"error", id?, code, message}` | a command failed or the file cannot be played |

The first start of audio SHOULD happen through the player's own start control, because browsers (notably Safari on iPad) may not pass a user gesture in the host page into the frame; hosts SHOULD allow `autoplay` on the frame and MUST handle `playBlocked`. Since a sandboxed frame has the origin `null`, hosts MUST identify the player by `event.source === iframe.contentWindow`. The same messages serve the `postMessage` tracking adapter (P6). Embedding commands are unprivileged: they can only do what a viewer could do with the controls. Narration text is not sent at run time; hosts read `deck-narration` from the file.

## P9. Conformance

A conforming player of Egatari Player 1.0:

- MUST render any *(i, k, t)* of the stage deterministically (format §1.1), including *(i, k, ∞)*;
- MUST implement the `talk` mode (P1) and, when the lesson has an article, the `read` face (format §9C);
- SHOULD implement the `learn` mode (P1); what self-study should offer beyond playback rates is still being worked out;
- MAY implement the `video` mode;
- MUST provide components the context of format §8.4 and run them as format §6 requires;
- MUST play the audio formats of format §5.1, start audio only after a user gesture, pause when the page is hidden, honour `prefers-reduced-motion` as P3 says, and work from `file://` without network access;
- MUST leave the file's network policy (format §4.2) in force and handle links as P4 requires;
- MUST NOT write learner data into the file (format §9.1B).

Accessibility of the player's own controls (keyboard operation, accessible names, focus) is to be specified here.

## References

- [RFC 2119], [RFC 8174] Key words. W3C Web Annotation Data Model. ADL SCORM 1.2 Run-Time Environment.
