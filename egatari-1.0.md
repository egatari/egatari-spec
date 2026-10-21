# Egatari 1.0 — Editor's Draft

**Status:** Editor's Draft, 2026-10-17. Not stable. Anything may change before 1.0 is frozen.
**Editors:** Gendo Kumoi (Nagaoka University of Technology).
**Reference implementation:** [motion-academic-slides](https://github.com/moiku/motion-academic-slides) (producer, player, editor).
**License of this document:** [CC BY 4.0](LICENSE.md). Schemas, fixtures and tools are MIT ([LICENSE](LICENSE)).
**Repository:** https://github.com/egatari/egatari-spec · **Site:** https://egatari.org/

Egatari (絵語り, "narrating with pictures") is a file format for **narrated, animated lessons**. One Egatari file is a single HTML document that

1. plays offline in a current web browser as a self-narrating lesson, a live presentation, or a lecture handout, and
2. carries its own authoring source, so that an Egatari editor can reopen the file *without the original folder*, change one sentence or one step's narration, replace that step's audio, and save the same kind of file again.

The name is written *Egatari* (or 絵語り). The file extension is `.ega.html`.

## 0. Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals.

JSON structures are normatively defined by the JSON Schemas in [`schema/`](schema/). Where prose and schema disagree, the schema wins and the disagreement is a bug in this document.

"Step key" means `"<slideKey>:<stepKey>"`, where `stepKey` is a non-negative integer in decimal or the literal `concl`. Slide keys may themselves contain `:`; a step key is split at its **last** `:`.

## 1. Model

### 1.0 One source, many views

A lesson has **one source of content**: its Egatari source — the slides (`deck.html`), the narration (`narration.md`) and, when present, the article (§9C), all written in the syntax this specification defines and rendered as HTML. Everything a person sees or hears is produced from that source:

- the faces (talk: slides and narration; read: the article), the display modes (§1.2), the layouts (§1.2A) and printing are **views** of the same source; no view carries content of its own;
- a PDF of the lesson is an **output** — any reader can produce one by printing in the `pages` layout — never a part of the source;
- files in other formats (PDF, Word, TeX, spreadsheets) never supply content. Content written elsewhere is **imported** into the Egatari source (e.g. a TeX textbook converted to the article, §9C.1); after import, the Egatari source is the original, and the imported file MAY be kept as an attachment for provenance (§3.8, `role: source`);
- attachments (§3.8) travel with the lesson for readers — an official version typeset elsewhere, the original manuscript, data and code for verification — and are never rendered.

### 1.1 Position

A lesson is a sequence of slides. Each slide has steps `0..n` and optionally a final `concl` step. The **position** is the triple *(i, k, t)*: slide index, step, and seconds since the step began.

- **Determinism.** The rendered screen MUST be a function of *(i, k, t)* alone (plus the display mode and viewport). Content MUST NOT depend on wall-clock time, timers, animation-frame callbacks, call order, or unseeded randomness. The only additional input is the **transition source**: at step 0, a slide transition (cross-fade or morph) depends on an explicit source slide parameter. Without that parameter, a player renders without a transition. Final states never depend on transition history.
- *t = ∞* denotes the final state of the step. A player MUST be able to render any *(i, k, ∞)* directly (jumping, going back, printing, reduced motion).

### 1.2 Display modes

| Mode | Who drives | Time | Typical use |
|---|---|---|---|
| `talk` (default for a bare file) | the presenter, step by step | real time of each step | live presentation, class |
| `learn` | the learner: start, pause, previous/next, jump, playback rate | advances along the timeline (§5.5) with narration audio | self-study, LMS (default in LMS bindings and hosted players) |
| `video` | nobody (no controls) | advances along the timeline | recording and video export |

**Offered modes.** A lesson MAY state which modes and faces it offers and where it opens, in `metadata.offer`: `{modes?, faces?, open?}` — `modes` a non-empty subset of `talk`, `learn`, `video`; `faces` a non-empty subset of `talk`, `read`; `open` `{mode?, face?}`. Producers copy it into `deck-meta.offer`, so that play-only derivatives keep it. Players SHOULD show only the offered modes and faces in their controls and open as `open` states (defaults: all modes, the faces present, `metadata.primary`). What a player opens in is decided in this order, the first that applies winning: the viewer's or host's explicit choice (an address parameter such as `?mode=`, the embedding interface §9.4), then `offer.open`, then `metadata.primary` (face only), then the defaults by context (layout by mode and screen, §1.2A). **This is the author's intent, not access control:** anyone who has the file can play it in any mode (§11), and players MAY let the viewer override it (e.g. `?mode=`). A host that must enforce a policy — a course that allows only `learn`, a sharing site that shows only `video` — does so in its own frame through embedding (§9.4: `mode`, `controls=0`, restricted navigation), §10.1.

**Preview of later steps** is an option of every interactive mode, not a mode: steps not yet reached are either hidden (default) or shown faintly. The current step renders and animates as usual; only content of later steps is shown faintly, and components keep rendering their current step. `?mode=lecture` is a legacy alias for `talk` with preview on.

In `learn` mode, a player MUST offer playback rates of at least 0.75, 1, 1.25, 1.5 and 2, keeping the pitch of speech; the timeline clock advances at the same rate, so the screen stays a function of *(i, k, t)*. Presenter-only tools (presenter view, laser) SHOULD be hidden.

When embedded by a host (§9.4, §10), the host MAY hide the player's own controls (`controls=0`) and provide equivalent ones itself (chapter list, playback rate, pause), and MAY restrict forward navigation as a course policy. The requirement to offer controls is then met by the host.

### 1.2A Layouts

Independently of the mode, a player arranges the lesson in **panes**. A layout is an arrangement of panes; every pane shows the same position, and layouts are views of one source (§1.0), not different documents.

| Pane | Shows | In the file |
|---|---|---|
| **stage** | the talk face: one 16:9 slide stage at a time, animated | yes |
| **text** | the read face: the article (§9C) when present, otherwise the narration of each step as body text, with each slide's stage scaled (not re-flowed) at its place | yes |
| **notes** | the learner's notes and ink for the current position (§9.1B) | **no** — learner data |

A pane of kind text is either **scrolled** (a vertical document) or **paginated** (single pages or a two-page **spread**). Page breaks MUST NOT split a step's block or a figure; a block taller than a page is scaled down to fit rather than split. Players choose the page breaks and the pairing of pages in a spread; page breaks can be switched off. Page breaks depend on the pane's size, fonts and language and are not part of the *(i, k, t)* determinism (§1), which covers the stage; conformance tests of video frames and stage rendering do not cover pagination. A stage pane can also be paginated (one slide per page, for printing and handouts).

The usual layouts are named combinations:

| Layout | Panes | Typical use |
|---|---|---|
| `slides` | stage | talk, video |
| `flow` | text, scrolled | reading, portrait phones |
| `pages` (`pages=single\|spread`) | text, paginated — the read face as pages is a **book**; the talk face as pages is *slides in a book* | books, printing |
| `split` | stage + text | self-study on wide screens |
| — | stage + notes, text + notes, stage + text + notes | self-study with note-taking |

- **Synchronization.** All panes follow one position. Moving any pane — advancing the stage, scrolling or turning pages of the text, selecting a note — moves the others: the text to the step's block or to the article section linked to the slide (§9C.2), the stage to the corresponding step, the notes to that position. Switching layout MUST preserve the position (slide and step). During audio playback the current narration turn SHOULD be highlighted in the text.
- **Scrolled text and motion.** In a scrolled text pane, scroll position maps to *(i, k, t)*: a step plays once from *t = 0* as its block enters the viewport (again only after it has left the viewport entirely) and is at its final state once passed; with `prefers-reduced-motion` only final states are shown. Players MAY additionally let the viewer scrub *t* by scrolling; it is not required.
- **Detached panes.** A player SHOULD let the viewer move a pane into a separate window (e.g. the stage on a projector or a second display, the text or notes on the laptop) and back. A detached pane stays synchronized with the others without network access, also when the lesson is opened from a local file; the mechanism is the player's (e.g. messages through the opening window; a same-origin broadcast channel only as an optimization). Closing it returns the pane to the main window. **Exactly one window plays the audio** at any time (by default the opening window; the viewer MAY move it, e.g. to the projector's speakers); other windows show the stage silently. The presenter view of `talk` is a detached arrangement of the same kind.
- **Defaults.** Players SHOULD choose by context: `slides` for `talk` and `video`; for `learn`, `split` on wide screens and `flow` on narrow (portrait phone) screens; `flow` for `read`; `pages` when printing. A lesson declares which face is primary in `metadata.primary` (`"talk"` or `"read"`, default `"talk"`); players open on that face. A file may carry both faces, but typically one is primary: slides for a talk, a book for a textbook. A viewer's choice of layout and panes MAY be remembered per viewer (§9.1B), never in the file. Hosts MAY set `layout=` when embedding (§9.4). **Precedence:** when embedded, the host's `layout=` and mode win over the viewer's remembered choice; otherwise the viewer's choice wins over `metadata.offer.open` (§1.2), which wins over the defaults above.

### 1.3 Narration

Each step MAY have narration: an ordered list of **turns**, each with a **role** (`expert` or `novice`; single-speaker lessons use `expert` only) and text. Text MAY contain **boundaries** — `cue` (a synchronization point for an animated component) and `mark` (an attention mark on a target element) — and **readings** (display text with a separate spoken form, e.g. φ read as ファイ). The authoring syntax is defined in §8.

## 2. File structure

An Egatari file is an HTML document (`text/html; charset=utf-8`). The RECOMMENDED file name extension is `.ega.html`. A file has two layers:

| Layer | Purpose | Required for |
|---|---|---|
| **Runtime layer** | compiled slides, runtime script, styles, fonts, and the runtime JSON blocks (§4) | playing |
| **Archive layer** | the index (§3) and blob blocks: authoring source and media | editing |

A file with only the runtime layer is a **play-only** Egatari file. A file with both is a **portable** Egatari file.

All JSON blocks are `<script>` elements with a non-executable `type` and a unique `id`. Before embedding (and before hashing), every U+003C `<` in serialized JSON MUST be written as the six ASCII characters `\u003c`. Serialized JSON uses LF line endings only. (A non-executable `type` does not stop the HTML parser from ending the element at a literal `</script`.)

### 2.1 Readable layer without script

A conforming document MUST also contain, as ordinary DOM outside any `<script>`, for every step of every slide: the display text of its narration. It SHOULD contain, for every slide, either a static image of the final state or text equivalent to it. Producers MAY also include a final-state image per **step**, so that hosts can show stills without running a browser. This layer serves archiving, accessibility, search, and recovery when no script runs.

Structure: one `<section id="egatari-readable">` containing, per slide, `<article data-slide-key="…">` with the slide title, and per step `<div data-step-key="…">` with one `<p data-role="expert|novice">` per turn (display text). Images, if any, are `<img alt="…">` inside the article or step. The runtime hides this section when it starts; without script it stays visible. Within an article, step `div`s are in step order (numbers ascending, `concl` last). Narration addressed to a slide key that matches no slide has no article: such steps are omitted from the readable layer and reported. Tier A edits update the affected `div` elements (§7.2).

## 3. Archive layer

### 3.1 Index

```html
<script type="application/vnd.egatari+json" id="egatari-index" data-sha256="…">{…}</script>
```

- `data-sha256` is the lowercase hex SHA-256 of the exact UTF-8 text content of the element. Readers MUST verify it before use.
- Readers extract the index and blob blocks with an HTML parser with scripting disabled. A reserved id (`egatari-index`, `egatari-signatures`, or any `egatari-b-*`) occurring more than once anywhere in the document — including inside `<template>` or foreign (SVG/MathML) content — makes the file invalid.
- Blob blocks referenced by the runtime layer SHOULD precede the runtime scripts, so that a player can resolve `egatari:` references while parsing; otherwise players resolve them after parsing completes.
- The content is a JSON object without duplicate member names, valid against [`schema/egatari-index.schema.json`](schema/egatari-index.schema.json). Its main members:

| Member | Req. | Meaning |
|---|---|---|
| `format` | MUST | the string `"egatari"` |
| `version` | MUST | `{major, minor}` of this specification the index follows (1.0 → `{"major":1,"minor":0}`) |
| `profile` | MUST | `"core"` or `"extended"` (§6) |
| `requires` | MUST | feature identifiers a reader must understand to edit (§3.5). May be empty |
| `contracts` | MUST | `{source, runtime}` integer versions of the authoring syntax and of the runtime behavior (§7) |
| `generator` | MUST | `{name, version}` of the producing software |
| `docId` | MUST | a UUID identifying the lesson across edits; editors MUST preserve it |
| `entry` | MUST | archive path of the slide source (normally `deck.html`) |
| `sourceSha256` | MUST | hash of the source set the runtime layer was built from (§3.4) |
| `files` | MUST | archive path → blob id |
| `blobs` | MUST | blob id → `{mime, bytes, sha256, chunks}` |
| `audio` | MAY | step key → audio record (§5.2) |
| `components` | MAY | components used (§6) |
| `themes` | MAY | themes used, same shape as `components` (§6) |
| `metadata` | MUST | descriptive metadata (§3.6) |
| `excluded` | MAY | informative list of categories the producer deliberately left out |
| `attachments` | MAY | files carried for readers rather than for rendering (§3.8) |
| `exportedFrom` | MAY | `{kind: "folder", sourceSha256}` when the file is a copy exported from an authoring folder that remains the master: `sourceSha256` is the folder's source hash at export. It carries no time, path or user name, so that exports stay reproducible and `pack(unpack(x))` equals `x`. Editors that open such a file SHOULD tell the user that edits made in it do not reach the folder and offer to unpack it into a folder; they MUST NOT refuse to edit it. Editors MUST keep `exportedFrom` unchanged when they save the file (including tier A edits), except when they save it as a new lesson with a new `docId`, which MUST drop it: a top-level `sourceSha256` that differs from `exportedFrom.sourceSha256` then shows that the copy was edited after export. Exporting again from a folder replaces it; a file saved by an editor that is itself the master (no folder) has no `exportedFrom` |

### 3.2 Blob blocks

```html
<script type="application/octet-stream" id="egatari-b-s0-0">PCFkb2N0eXBlIGh0bWw+…</script>
```

- Every blob — including UTF-8 text — is stored base64-encoded (RFC 4648 §4, no line breaks) in one or more chunk blocks listed in order in `blobs[id].chunks`.
- Each chunk MUST decode to at most 196 608 bytes (192 KiB). A reader concatenates the **decoded** bytes of the chunks, never the base64 strings.
- The decoded length MUST equal `bytes` and its SHA-256 MUST equal `sha256`; otherwise the blob is corrupt.
- Blob ids match `^[A-Za-z0-9_]{1,32}$`. Chunk ids are `egatari-b-<blobId>-<n>` with `<n>` the zero-based chunk number in canonical decimal (at most 9999); `chunks[i]` MUST be `egatari-b-<blobId>-<i>`. Duplicate ids make the file invalid.
- Version 1.0 blobs are uncompressed. A future feature (e.g. `gzip-v1`) may add compression; it will be listed in `requires`.

### 3.3 Archive paths

Keys of `files` are archive paths: `/`-separated, relative, UTF-8, NFC. A reader MUST reject the whole file if any path

- is absolute, starts with `/`, contains a drive letter (`C:`), a UNC prefix, a backslash, a NUL or other control character;
- has a segment that is empty, `.` or `..`, ends in a dot or space, or is a Windows reserved device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, with or without extension);
- collides case-insensitively with another path;
- is `__proto__`, `constructor` or `prototype` in any segment;
- contains any of `< > : " | ? *` or a C0/C1 control character (U+0000–U+001F, U+007F–U+009F), ends with `/`, or is not in Unicode Normalization Form C;
- has a segment that is a Windows device name with a superscript digit (`COM¹`–`COM³`, `LPT¹`–`LPT³`);
- equals another path followed by `/…` (a path cannot be both a file and a directory).

Case-insensitive comparison uses the key `NFC(lower(upper(NFC(path))))`, where `upper` and `lower` are the locale-independent Unicode case mappings (as ECMAScript `toUpperCase`/`toLowerCase`). A path is at most 1024 bytes and 10 segments. Readers MUST build every key-indexed structure from untrusted input with maps that have no inherited keys.

Paths under `audio/` are reserved for narration audio; their blobs MUST have an audio media type from §5.1. `audio/manifest.json` MUST NOT appear in `files`: it is derived from `index.audio` when an archive is unpacked. Producers SHOULD include a root file `egatari.json` (`{"docId", "metadata"?, "attachments"?, "components"?}`) so that an unpacked folder keeps its `docId` and attachment records (§3.8); when present, its `docId` MUST equal the index's, and its `attachments`, when present, MUST equal `index.attachments`. Editors MAY add it to a document that lacks it (this changes `sourceSha256`, which the edit updates anyway). An archive MUST include the slide source (`entry`), `narration.md` if the lesson has narration, and the complete dependency closure needed to rebuild the runtime layer (images, data, styles, deck-local components and themes, macros, `timeline.json`, a voice configuration without private paths). Registry components (§6) are excluded from the closure; they are resolved by exact name, version and hash. Metadata embedded in images (EXIF, XMP) SHOULD be stripped when an image is first added to a lesson rather than at export, so that rebuilds stay byte-identical. It MUST NOT include: absolute or machine-specific paths, credentials, editor review notes, caches, backups, unreferenced audio, private reference-voice recordings, or personal identifiers not deliberately entered as content.

### 3.4 Source hash

`sourceSha256` is computed as SHA-256 over the UTF-8 bytes of the lines `"<path>\t<sha256>\n"`, one per entry of `files` excluding paths under `audio/`, sorted by path in code-point order. Producers MUST also write the same value into the runtime layer's `deck-meta.sourceSha256` (§4). Readers MUST recompute it from `files` and the blob hashes; a mismatch with the index value is treated like a mismatch with `deck-meta`. An editor that finds any two of these values different MUST warn that the compiled lesson and its source disagree and MUST NOT perform a tier A edit (§7.2).

### 3.5 Features

`requires` lists feature identifiers (`^[a-z0-9-]+$`). Version 1.0 defines `sources-v1` (archive layer present) and `audio-v1` (§5.2 records). A reader MUST refuse to edit or re-export a file whose `requires` contains an identifier it does not implement; it MAY still play the file and extract its source (§9.3) when the index and blobs validate. Source extraction is not re-export. Optional information that a reader may ignore MUST NOT be listed in `requires`.

### 3.6 Metadata

`metadata` MUST contain `title` and `lang` (BCP 47). It MAY contain `license` (SPDX identifier or URL), `copyright` (e.g. `© 2026 Gendo Kumoi`), `attribution` (the credit line the rights holder asks reusers to show), `creators` (display names the author chose to publish), `description`, `accessibility` (schema.org terms such as `accessMode`, `accessibilityFeature`, `accessibilityHazard`), `curriculum` (array of curriculum codes, e.g. Japanese 学習指導要領 codes from the MEXT education data standard), `completion` (§9.2), and the members of §3.6.1. Producers MUST NOT add timestamps, device identifiers, account e-mail addresses, or file-system locations.

#### 3.6.1 Derivation, authorship and audience

These OPTIONAL members support lessons made for one learner, by learners, or by software agents.

- `derivedFrom`: `{docId, sourceSha256, anchor?}` — the lesson this one was derived from (e.g. a version adapted for one learner, or a short branch answering a question, where `anchor` is the step key it branches from). An editor that changes the original can then find derived lessons and offer to carry a fix over, step by step, using slide ids.
- `importedFrom`: `[{mime, sha256, title?, attachment?}]` — non-Egatari material the lesson was made from (e.g. a PDF, a slide file, scans or photos of printed pages with handwritten comments, a separate errata sheet). `sha256` identifies the original bytes; `attachment` is its path when the original is carried as an attachment with role `source` (§9C.3). Steps produced by conversion (e.g. by an AI reading the scans) SHOULD be marked in `authorship` as `by: "ai"`, `reviewed: false` until a person has checked them against the original.
- `authorship`: `{<stepKey or slideKey>: {by, reviewed}}` with `by` one of `human`, `ai`, `mixed` and `reviewed` a boolean (a person responsible for the lesson has checked it). Keys without an entry are unknown. Names of reviewers are not recorded (§3.6).
- `audience`: `"public"` (default) or `"individual"`. An individual lesson is made for a specific learner or group and SHOULD NOT be redistributed; hosts MUST NOT show it to other learners. It still MUST NOT contain learner records (§9.1B): it may be tailored to a learner, but grades, answers or personal data are not part of it.

### 3.7 Play-only derivative

A **play-only derivative** is made from a portable file by removing the index and every blob whose chunks are not referenced by the runtime layer, keeping the chunks of audio and of learner attachments (§3.8) referenced as `egatari:<blobId>`. In `deck-meta`, `portable` becomes `false` and `sourceSha256` is removed; `docId` is kept. Players resolve `egatari:<blobId>` by decoding the chunks `egatari-b-<blobId>-0`, `-1`, … in order until the next one is absent.

The archive layer — including `extensions` — is readable by anyone who holds a portable file. A host that must keep information from learners (e.g. quiz answers in an extension) MUST serve learners a play-only derivative and keep the portable original for authorized editors.

### 3.8 Attachments

> Draft. Usable without the article layer (§9C); not part of 1.0 conformance until this note is removed.

An **attachment** is a file carried for readers rather than for rendering — the original TeX or Word source, the typeset PDF, a notebook, a data set — that does nothing when opened. "Attachment" names how a file is treated, not what it contains (as `Content-Disposition: attachment` in MIME).

- **Rendering assets are not attachments.** Images, narration audio, video and sound played by the lesson, data a component draws, fonts and styles belong to the dependency closure (§3.3). A file the slide source or any dependency references MUST NOT be listed as an attachment.
- **A lesson is complete without its attachments.** Material that is not needed inside the single file — an execution environment, a large data set, a media library, several lessons — belongs in an outer package or behind an external link (identified by DOI, commit and SHA-256), not in the file. An outer package format based on RO-Crate will be specified separately.

`index.attachments` lists them: `[{path, role, title, description?}]`.

- `path` is an archive path under `attachments/` (§3.3) present in `files`; each path appears at most once.
- `role` and the media types allowed for it (the `mime` of the blob, which readers verify against the content):

| `role` | Meaning (PDF/A-3 `AFRelationship`) | Allowed media types | Conditions |
|---|---|---|---|
| `pdf` | an official version typeset elsewhere, e.g. the journal's or the publisher's PDF (Alternative); a PDF printed from the lesson itself SHOULD NOT be attached, since any reader can produce it (§1.0) | `application/pdf` | no JavaScript; automatic actions (`OpenAction`, `AA`) only `GoTo` to a destination in the same document (as LaTeX `hyperref` writes); link annotations only `GoTo` in the same document or `URI` (followed only when the reader clicks); never `Launch`, `JavaScript`, `SubmitForm`, `ImportData`, `GoToR`, `GoToE`, `Rendition` or embedded files. An encrypted PDF is allowed only if it opens with the empty user password (permission restrictions only), so that it can be checked |
| `data` | data for exercises or verification (Data) | `text/csv`, `text/tab-separated-values`, `application/json`, `text/plain`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | spreadsheets: no macros (`vbaProject.bin`, macro-enabled content types), no embedded objects or ActiveX, no external links, DDE or functions that fetch external data |
| `code` | program source (Source) | `text/plain` and other text types for source in a programming language; `application/x-ipynb+json`; environment definitions (e.g. `requirements.txt`, `pyproject.toml` with its lock file, `environment.yml`) | notebooks without credentials or machine-specific paths; never a file name extension that common operating systems run or open as a script by default (`.js`, `.jse`, `.vbs`, `.vbe`, `.wsf`, `.wsh`, `.hta`, `.bat`, `.cmd`, `.com`, `.scr`, `.ps1`, `.command`, `.app`, `.jar`, `.reg`, `.lnk`); JavaScript source is attached as `.mjs`, `.cjs` or `.ts` |
| `source` | the original manuscript (Source) | `text/x-tex`, `text/markdown`, `text/plain` (e.g. BibTeX), `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | documents: as for spreadsheets, and no field codes that execute or fetch (e.g. `DDEAUTO`, `INCLUDETEXT`) and no remote template |
| `supplement` | other material for readers (Supplement) | `image/png`, `image/jpeg`, `image/webp`, `application/pdf` (as for `pdf`), `text/plain` | |

- Any other media type MUST NOT be attached. In particular, never: executables and WebAssembly; macro-enabled or legacy binary Office formats (`.xlsm`, `.docm`, `.pptm`, `.xls`, `.doc`, `.ppt`); documents that run code when opened (HTML, SVG, PDF with JavaScript, another Egatari file); archives and containers (ZIP, TAR, 7z, encrypted containers); audio and video (attach nothing the lesson does not render; a later version may allow them).
- No attachment may contain personal data that was not deliberately published as content (e.g. class lists, grades, learner records), credentials, or private paths (§3.3).
- Danger is judged by whether a file runs **when opened**, not by whether it is code: source code and notebooks are inert until a person runs them elsewhere, and are allowed; attaching code does not make a lesson reproducible by itself. Spreadsheets and CSV files SHOULD be checked for formula injection (cells starting with `=`, `+`, `-`, `@`).
- Data that a component draws MUST be included as a rendering asset in a transparent format (e.g. CSV); a spreadsheet of the same data MAY additionally be attached for readers.
- `title` is a short name for the download list (at most 120 characters, one line); `description` is one or two plain-text sentences (at most 300 characters, one line; e.g. "Open in Colab; needs Python 3.11").
- **Size.** Each attachment SHOULD be at most 10 MiB and all attachments together at most 20 MiB (decoded), within the limits of §11.
- Players offer attachments for download only; they never render, preview, execute or open them in another application. A player MUST NOT offer an attachment whose media type is not allowed for its role or whose file name extension does not match its media type, and saves it under the file name of its `path`. Players SHOULD say that code should be run only by readers who trust its source. Running code in the reader (e.g. Python compiled to WebAssembly) is a separate future feature limited to the Extended profile; attachments never become executable through it.
- Attachments do not affect the profile (§6): they are excluded from code classification because nothing renders or includes them.
- A file under `attachments/` without a record is an ordinary archive file: producers SHOULD warn, and players MUST NOT offer it.
- Attachments are ignorable information (§3.5): `requires` MUST NOT list them; readers that do not implement them preserve `index.attachments` as an unknown member (§7.1).
- Unpacking an archive into a folder MUST write `index.attachments` into `egatari.json`, so that a rebuild from the folder keeps the records; packing a folder takes `index.attachments` from `egatari.json`.
- In the same way, `egatari.json` MAY carry `components`: `{<name>: <version>}` pinning the registry components (§6) a rebuild must use. When an archive's `egatari.json` carries `components`, it MUST list exactly the registry entries of `index.components` with their versions. Producers SHOULD write it at export, into the archive's copy of `egatari.json` only (the author's working folder is not changed), so that unpacking reproduces the file byte for byte and `pack(unpack(x))` equals `x`; rebuilding an unpacked lesson then does not silently switch component versions. A folder whose `egatari.json` has no pin follows the producer's default versions, and the export records what it used.
- Adding, removing or changing attachments is a tier A edit (§7.2).
- Producers and hosts MUST check attachments without executing them (§11) and SHOULD reject a file whose content does not match its declared media type or that fails the conditions above.

**Attachments for learners.** The runtime block `deck-attachments` lists the attachments the author chose to offer to learners: `[{path, role, title, description?, mime, bytes, src}]` with `src` = `egatari:<blobId>`. A play-only derivative (§3.7) keeps the blobs it references and so carries exactly these attachments. The author chooses file by file; producers MAY preselect `pdf`, `data` and `supplement` and SHOULD leave `source` and `code` unselected. Information that must be kept from learners (§3.7) MUST NOT be listed. Players offer the files of `deck-attachments`; editors show all of `index.attachments`.

## 4. Runtime layer

The runtime layer contains the compiled slides (`<section class="slide" data-key="…">` elements), the runtime, and these JSON blocks (`type="application/json"`):

| id | Content |
|---|---|
| `deck-meta` | `{format:"egatari", version, contracts, generator, docId, title, lang, portable, sourceSha256?, completion?, tracking, license?, copyright?, attribution?}` — schema [`schema/deck-meta.schema.json`](schema/deck-meta.schema.json). `tracking` lists the tracking adapters the runtime implements (e.g. `["scorm12","postmessage","local"]`), so that packagers and hosts need not read the archive |
| `deck-narration` | `{slideKey: {stepKey: [{role, text}]}}` — display text |
| `deck-marks` | `{stepKey: [{type:"cue"} \| {type:"mark", id, effect, hold} \| {type:"clear"} \| {type:"zoom", id, scale?}]}` — boundaries, only for steps with marks or zooms (zoom: §8.3A, draft) |
| `deck-audio` | `{stepKey: {src, dur, cues}}` — `src` is a `data:` URI or `egatari:<blobId>`; `dur` seconds; `cues` the time of every boundary in order (§5.3); `sync` (`auto`, `manual`, `none`; default `auto`); optional `mime` (the audio media type, so that players of play-only derivatives need not sniff), `startOffset` (§5.2) and `kind` (`tts`, `recorded` or `imported`, copied from the audio record so that play-only derivatives and folder builds keep it; producers SHOULD write it) — schema [`schema/deck-audio.schema.json`](schema/deck-audio.schema.json) |
| `deck-timing` | `{stepKey: {dur?, hold?, lead?, pad_after?}}` — explicit overrides |
| `deck-attachments` | attachments offered to learners, with `src` = `egatari:<blobId>` (§3.8, draft) |
| `deck-extensions` | `{<extension name>: <data>}` — the extension data that players consume (§9A), copied from the index's `extensions` because play-only derivatives have no index; only extensions whose definition says so (e.g. [`live`](extensions/live.md)) |

Every slide MUST carry a `data-key`: the slide's `id` attribute if present, otherwise its normalized heading text (legacy). Producers SHOULD give every slide an explicit, stable id (§8.1), so that editing a title does not break narration and audio associations.

A portable file SHOULD reference audio as `egatari:<blobId>` so that audio bytes are stored once, in the archive layer. A player resolves `egatari:<blobId>` by decoding that blob.

## 5. Audio and timing

### 5.1 Formats

| Format | Producer | Player |
|---|---|---|
| MP3 (`audio/mpeg`), mono, 44.1 kHz | RECOMMENDED for new audio | MUST play |
| AAC-LC in MP4 (`audio/mp4`) | MAY (existing audio SHOULD be kept as is) | SHOULD play |
| WAV PCM 16-bit (`audio/wav`) | MAY, emergency only | MUST play |

Producers SHOULD normalize speech to −20 LUFS integrated, −1.5 dBTP, and trim silence at the ends (−45 dB, keeping 0.05 s), and SHOULD insert 0.35 s of silence between turns, but not at boundaries inside a turn nor at the end of the step. Encoder delay (priming) MUST be compensated so that time 0 of `dur` and `cues` is the first audible sample a player presents: either by trimming, by container metadata that players honor, or by `startOffset` (§5.2). `dur` is the duration of the audible content (the processed PCM), not of the encoded file.

### 5.2 Audio records

`index.audio[stepKey]` describes the step's audio (schema: [`schema/egatari-audio.schema.json`](schema/egatari-audio.schema.json)):

| Member | Req. | Meaning |
|---|---|---|
| `file` | MUST | archive path under `audio/` |
| `dur`, `cues` | MUST | as in `deck-audio` |
| `kind` | MUST | `tts`, `recorded`, or `imported` |
| `inputHash` | MUST | §5.4; `null` when unknown (e.g. audio imported from an older build), which players and editors treat as stale |
| `recipe` | MUST for `tts` | `{engine, model, voice, seed, dictionary, processing}`; `voice` is a public identifier, never a path; `dictionary` an identifier of the effective reading dictionary and rules (SHA-256 RECOMMENDED); `processing` a free-form profile string, RECOMMENDED as `key=value` pairs separated by `;`. `engine`, `model` and `processing` identifiers are producer-defined and SHOULD be stable and versioned |
| `processing` | MAY | for every kind: identifier of the post-processing applied (as `recipe.processing`). Producer-defined; SHOULD be stable and versioned |
| `startOffset` | MAY | seconds of encoder delay at the start of the file not removed by container metadata; players MUST start playback at this media time and treat it as time 0 of `dur` and `cues` |
| `recipeDigest` | MAY | the producer's content-address of input + recipe (e.g. the reference implementation's 12-hex `segDigest`) |
| `alternatives` | MAY | `[{file, mime, startOffset}]` other encodings of the same take |
| `watermark` | MAY | `{scheme, embeddedBy?}`: an audio watermark the producer knows the take carries, e.g. `{"scheme":"synthid","embeddedBy":"google"}` for a provider that watermarks its speech, or `{"scheme":"audioseal","embeddedBy":"producer"}` when the producer embeds one itself (draft; open issue 11) |

Editors MUST NOT replace `recorded` audio unless the user explicitly selects that step. For `recorded` and `imported` audio, `inputHash` is that of the narration the person read (or the audio was matched to) when it was recorded or imported. Records MUST NOT carry device names, original file names or other capture metadata that may identify a person (§3.6).

### 5.3 Boundaries and cues

The boundaries of a step, listed in order across its turns, correspond one-to-one with `cues`. Players align component `cues(k)` with the `cue` boundaries only, and start marks at `cue + lead`. When counts do not match, **or `sync` is `none`**, players MUST fall back to unsynchronized deterministic timing (no component stretching; marks every 0.9 s after the step's motion ends). Producers of recorded audio MUST NOT reuse cue times from a previous take; until cues are placed for that take — by the user (e.g. pressing a key at each boundary while reading or while it plays; `sync` `manual`) or measured from that take's own audio against the narration text (e.g. forced alignment; `sync` `auto`) — the record (and its `deck-audio` entry) MUST have `"sync":"none"` and `cues: []`. A record whose cues were measured SHOULD say how in `processing` (e.g. the aligner and its version), and editors SHOULD let the user correct them. **TTS made elsewhere** (e.g. by the same engine on another machine or in a hosted notebook) is a `tts` record, not an import: when it comes with its record — `cues` measured by the producer that synthesized it, `inputHash` and `recipe` — an editor MAY take it over unchanged if its `inputHash` equals that of the current narration of the step, keeping `sync` `auto`; otherwise it MUST treat the audio as stale or refuse it. Editors SHOULD let the user place cues on recorded or imported audio (e.g. by tapping while it plays, or while recording with the narration shown), which sets `sync` to `manual`.

### 5.4 Staleness and identity

Three hashes serve three purposes and MUST NOT be substituted for one another:

1. **`inputHash`** — lowercase hex SHA-256 of the UTF-8 bytes of the canonical string `JSON.stringify(turns.map(t => [t.role, t.ttsParts, t.bounds.map(token)]))` (ECMAScript `JSON.stringify`, no whitespace), where `role` is `"expert"` or `"novice"`, `ttsParts` are the spoken text pieces between boundaries (readings substituted, trimmed, empty pieces kept), and `token` is `"cue"`, `"mark:clear"`, or `"mark:<id>|<effect>"` followed by `"|hold=<n>"` when a hold is given (`<n>` formatted by ECMAScript `Number.prototype.toString`). The slide key is not part of the hash. Test vectors: [`fixtures/input-hash/`](fixtures/input-hash/). Audio is **stale** when the current narration's `inputHash` differs from the record's. Editors MUST show stale steps and MUST NOT silently delete or regenerate their audio. When a step's narration is removed altogether, its audio is removed with it, with a warning.
2. **`recipe` / `recipeDigest`** — records how the audio was generated. Identical recipes do **not** imply identical bytes: GPU-based synthesis is not bit-reproducible across hardware. Readers MUST NOT use audio bytes to decide whether a step needs regeneration.
3. **`sha256`** of the blob — integrity only.

### 5.5 Timeline

The length of step *(i, k)* is

```
dur = override.dur ?? max(anim, audio ? lead + audio.dur + pad_after : max(hold, marksEnd + pad_after))
```

with defaults `lead = 0.25`, `pad_after = 0.6`, `hold = 1.2` seconds; `anim` is the step's motion length including the slide transition (0.35 s) or morph (0.9 s) at step 0. `video` mode MUST use this function; so MUST any video export.

## 6. Components and profiles

Animated figures are custom elements (Web Components) following the component contract (§8.4). Each entry of `index.components` is `{tag, name, version, sha256, source}` where `source` is `registry` or `embedded`. For registry entries, `name` MUST match `^[a-z][a-z0-9-]{0,63}$` (a single identifier, never a path). A component's `sha256` covers its code file (`index.js`) only. **Line endings are normalized before hashing** a component's code or a theme's text files: every CRLF and every lone CR becomes LF (a UTF-8 BOM at the start is removed), so that a checkout on any platform yields the same hash; JavaScript and CSS mean the same with either line ending. Producers SHOULD store these files with LF. Distribution archives of a registry (e.g. a release tarball) are verified byte for byte by their own hash; the normalization applies only to the identity hash recorded in `index.components` and `index.themes`. Each entry of `index.themes` is `{name, version, sha256, source}`; a theme's `sha256` is SHA-256 over the lines `"<relative path>\t<sha256>\n"` of its files, sorted by path. `version` is the registry release for registry entries; embedded entries without a version use `"local"`.

| Profile | Components | Editor behavior |
|---|---|---|
| **Core** | Only `registry` components: identified by name, version and the SHA-256 of their code in a public component registry. The archive contains no component code. | The editor supplies its own trusted copy and verifies the hash. A component it does not have is shown as its final-state image or text equivalent. |
| **Extended** | `embedded` components: code is in the archive (pinned at export). | The editor MUST run component code only in a sandbox with an opaque origin and a policy that forbids network access, and MUST tell the user that the lesson contains its own interactive parts before any of that code runs. "Forbids network access" means at least `connect-src 'none'`, with every other resource type limited to `data:` and `blob:`. |

The runtime layer of either profile contains the component code needed to play offline. An Extended document MAY mix registry and embedded components. A document is Extended if any archived file other than registry components and attachments (§3.8) contains executable script (a `<script>` element without a data `type`, or a JavaScript file); otherwise it is Core. Readers MUST NOT rely on the declared `profile`: they MUST determine whether code can run from the validated content — at least: `<script>` elements of any non-data type (except one with no `src` attribute whose content is empty or only whitespace, which is not code); event-handler attributes (`on*`); `javascript:`/`vbscript:` URLs in any URL-valued attribute, including SVG animation values; `srcdoc`; embedding elements (`iframe`, `object`, `embed`, `frame`) and `meta http-equiv=refresh`; JavaScript files; and HTML or SVG documents the source includes or references. Registry components that evaluate expressions written in attributes are a code path even in a Core document (trusted code, untrusted data): such components MUST restrict what those expressions can do (e.g. arithmetic only), and readers SHOULD treat expressions outside that restriction as code. A registry MAY withdraw a release, for example after a security fix; the release then stays available, and the registry's manifest marks it withdrawn and names the replacement version. An editor that opens a document recording a withdrawn version SHOULD tell the user and offer to rebuild with the replacement; it MUST NOT substitute the replacement silently, because the identity hash and the rendered result may change. Until the document is rebuilt, an editor MAY still play and preview it, but SHOULD run it isolated from the editor's own origin (e.g. a sandboxed frame), and SHOULD NOT relax the editor's own content security policy for it. An editor whose isolation cannot run a withdrawn component's code MAY show that component as its final-state image or text equivalent, as for a component it does not have, and SHOULD say so in the notice; the rest of the document still plays. Classification MUST be performed on the expanded source — after every include or preprocessing step, covering every dependency read as text regardless of its file extension — and on the same bytes that are then rendered; a dependency that cannot be read makes the document count as containing code. Classification MUST parse HTML as a browser does with scripting enabled (e.g. `<noscript>` content is raw text), or take the union of the scripting-enabled and scripting-disabled interpretations. and treat a document whose content contradicts its declared profile as Extended or reject it. If an editor cannot obtain a trusted copy of a registry component with the recorded hash, it MUST disable tier B and C edits for that document and MAY still perform tier A edits.

## 7. Versioning and editing

### 7.1 Versions

- `version` (this specification): minor versions only add optional members; editors MUST preserve unknown members through edits, at every level of the index — including inside `metadata`, audio records and component entries. A reader MUST refuse to edit a file with an unknown **major** version, and SHOULD still play it. It MAY extract the source using the rules of the highest major version it implements, if the index validates against them; otherwise it refuses extraction too.
- `contracts.source`: the authoring syntax (§8). Editors migrate older source contracts with deterministic migrators, and refuse newer ones.
- `contracts.runtime`: the runtime behavior. See §7.2.
- `generator.version` is informative.

### 7.2 Edit tiers

An editor MUST NOT execute a builder or runtime supplied by the document in its own trusted context.

| Tier | Change | Required behavior |
|---|---|---|
| **A** (default) | narration text, audio, timing overrides (`timeline.json` / `deck-timing`; durations themselves are computed, §5.5) only | Do not rebuild. Only these regions may change: the affected entries of the runtime JSON blocks; the affected entries of the readable layer (§2.1); `sourceSha256` (index and `deck-meta`) and the index hash; archive entries, audio records, attachment records (`index.attachments` and `egatari.json`, §3.8) and blobs; and **append-only font supplements** — new `<style id="egatari-font-supplement-<n>">` elements carrying glyphs for characters not covered by the embedded fonts. When saving under a new `docId` (§7.3), `deck-meta.docId`, the index `docId`, `metadata.derivedFrom` and `egatari.json` are also tier A regions. Every byte outside these regions, including existing font data, MUST stay identical. |
| **B** | slide content (text, math, figures) | Rebuild with the editor's runtime of the same `contracts.runtime`, using the archived (pinned) components and themes. Before saving, compare the final state of every slide before and after; show the user every slide that changed besides the edited ones. |
| **C** | `contracts.runtime` differs from the editor's | Only on explicit request ("upgrade"), with the same comparison as B. Without upgrade, only tier A edits are allowed. |

Re-export MUST copy untouched blobs byte-for-byte and MUST preserve `docId` (unless saving as a new lesson, §7.3).

**Font supplements.** `<n>` in `egatari-font-supplement-<n>` is canonical decimal, one greater than the largest existing supplement (starting at 0); a supplement follows the last existing font style element. It contains `@font-face` rules with the same family, weight and style as each embedded face that needs the new characters. Producers SHOULD declare `unicode-range` on every embedded `@font-face`; editors MAY add a supplement for any character whose coverage they cannot establish from those ranges.

### 7.3 Rights

Egatari cannot prevent anyone from modifying a file (§11). It carries the rights holder's terms so that conforming software states them and keeps credit intact:

- Producers SHOULD copy `license`, `copyright` and `attribution` (and `offer`, §1.2) from the metadata into `deck-meta`, so that play-only derivatives (§3.7) keep them.
- Players SHOULD show title, creators, copyright, license and attribution in an information panel.
- When any step's audio is synthesized (`kind: "tts"`, in `deck-audio` or the audio record), players SHOULD say so in the information panel and near the playback controls (e.g. "This narration is AI-synthesized"), so that learners know a voice is not a recording of a person. A step recorded by a person (`recorded`) carries no such notice; `imported` audio of unknown origin is described as such. The declared `kind` is a claim (§11): hosts SHOULD check uploaded audio with the watermark detectors available to them, and when a detector finds a synthetic-speech watermark in audio declared `recorded` or `imported`, SHOULD treat it as synthesized and tell the uploader about the mismatch. The absence of a detected watermark MUST NOT be presented as evidence that a voice is human, since many synthesizers add none and processing can weaken one. Producers that synthesize speech SHOULD apply post-processing (loudness, encoding) before embedding a watermark of their own, so that it survives.
- Each time a document is opened for editing, before the first change, an editor MUST show its license. If the license does not permit derivatives (e.g. any Creative Commons `-ND` license, or no license with a copyright notice), the editor MUST warn that modifying or redistributing the lesson may infringe the rights holder's copyright and MUST require explicit confirmation.
- An editor that saves a document under a new `docId` (e.g. "save as a new lesson") MUST keep the original `copyright`, `attribution` and `creators`, MUST set `derivedFrom` (§3.6.1), and MAY add the new editor's name to `creators`. An editor that keeps the `docId` MUST NOT set or change `derivedFrom`.
- Editors MUST NOT remove or alter `copyright` and `attribution` without the user's explicit action.

## 8. Authoring source (contract version 1)

> This section will incorporate, normatively, the contract of the reference implementation: [`docs/contract.md`](https://github.com/moiku/motion-academic-slides/blob/main/docs/contract.md) §1–§5, §7, §8 (position and time, modes, components, narration syntax, timeline, attention marks, morphs). Until then, that document is normative for `contracts.source = 1` and `contracts.runtime = 1`.

### 8.1 Slide identifiers

- A slide is `<section class="slide" id="…">`. Ids match `^[A-Za-z][A-Za-z0-9_-]{0,63}$` and are unique in the document — including against every other `id` in it, such as attention-mark targets.
- Generated ids SHOULD be `s-` followed by 6 random base32 characters (`[a-z2-7]`). They MUST NOT be derived from the heading, so that renaming a heading never changes the id.
- In `narration.md`, a slide is addressed as `## <heading> {#<id>}` (RECOMMENDED), `## <id>`, or `## <heading>` (legacy, only for slides without id). When an `{#id}` is present it wins over the heading text.
- A deck MAY mix slides with and without ids; each slide is keyed independently.
- **Key derivation in `deck.html`.** A slide's key is, in order of precedence: its `id`; a hand-written `data-key` attribute (legacy); the normalized text of its first heading element; `s<n>` with *n* the 1-based position of the slide (legacy). Producers SHOULD warn when a slide is keyed by a legacy rule.
- **Key derivation in `narration.md`.** A heading line is `## ` followed by the heading text, optionally followed — with or without whitespace before it — by `{#<id>}` at the end of the line (`## {#<id>}` alone is allowed). If `{#…}` is present, its content is the key; if that content is not a valid id (§8.1 pattern), readers MUST report an error and still use the content as the key. Otherwise the key is the **normalized heading**: HTML tags removed, `&nbsp;` treated as a space, and **all** whitespace removed. (A heading consisting of an id normalizes to that id.)
- **Normalized keys.** The same normalization applies to heading text in `deck.html`.
- Two slides with the same key make the document invalid. Producers MUST NOT write such documents; a producer MAY refuse to proceed until the author resolves the collision (e.g. by adding an id by hand) rather than guess.
- **Step markers.** Step numbers are written in canonical decimal (`0`, `1`, … without leading zeros), at most 999, or `concl`. Readers MUST NOT treat a non-canonical marker such as `[01]` or `[1000]` as a step and SHOULD report it; lines up to the next marker or heading then belong to no step.

### 8.2 Narration syntax (summary)

```markdown
## <heading> {#<id>}
[0] text…
[2] Expert: text with {cue} and {mark:ID|circle|hold=2} and {φ|ファイ}
    Novice: question…
[concl] text…
```

**Extension lines.** Inside a step's block, a line of the form `@x-<name>-<field> <value>` (after optional indentation; `<name>` as in §9A, `<field>` matching `^[a-z][a-z0-9-]{0,31}$`, `<value>` the rest of the line, single-line UTF-8) carries extension data for that step. Extension lines:

- are not part of any turn: they are excluded from display text, `ttsParts`, boundaries and `inputHash` (§5.4), so editing them never makes audio stale;
- are never spoken or displayed, and a player that ignores them renders exactly the same;
- are preserved by editors through tier A, B and C edits;
- are folded by producers into `extensions.<name>[<stepKey>].<field>`; repeated lines with the same name and field become an array in their order;
- have as value the rest of the line after the first run of whitespace following the field name, with trailing whitespace kept;
- outside any step block (before the first marker of a slide, or after an invalid marker) are ignored with a warning;
- keep their position when an editor rewrites a step: lines that stood before the first turn stay directly after the `[k]` marker line, others stay after the turn they followed.

### 8.3 Readings

`{display|reading}` stores the reading in kana (or the lesson language's ordinary spelling). Producers MAY export readings as SSML `<sub alias>`, W3C PLS lexicon entries, or HTML `<ruby>`.

### 8.3A Camera (feature `camera-v1`, draft)

> Draft. Motivation: let any figure — inline SVG, HTML, an equation, a component's output — be zoomed and panned in time with the narration, so that a lesson-specific figure (e.g. a code tree followed downwards) needs no component of its own (§6).

A **camera** frames part of the stage. It is written in the narration like an attention mark and is determined by *(i, k, t)* alone:

```markdown
[2] {zoom:root}根から見ていきます。{zoom:n01|3}0 の次に 1 を読むと、ここに着きます。{zoom:reset}全体に戻ります。
```

- **Syntax.** `{zoom:ID}` frames the target with a margin; `{zoom:ID|s}` frames it at scale *s* (a decimal number between 1 and 8, the stage scale after the move); `{zoom:reset}` returns to the whole stage. Targets are found as for attention marks: an element of the slide with `id="ID"` or `data-mark="ID"`, including elements inside inline SVG and inside a component's rendered output.
- **Timing.** Each `{zoom}` is a boundary, timed like a mark (at its cue plus lead when audio is synchronized; otherwise at the fallback interval). A move takes 0.6 s, eased; with `prefers-reduced-motion` it is instant.
- **State.** At *(i, k, t)* the camera is the result of the step's zooms whose time has passed, starting from the whole stage at the start of every step unless the step's first boundary is a zoom at time 0. *(i, k, ∞)* is the final framing of the step. Jumping, going back and seeking render that framing directly; the camera never depends on call order.
- **Rendering.** The camera transforms the whole stage (a CSS transform of the slide content in stage coordinates, 1280×720); text stays vector, so zoomed text is sharp. Attention marks are drawn in the transformed space. The camera does not change layout, the readable layer (§2.1) or printing: printed and `flow`/`pages` views show each step's final framing, or the whole stage when the author marks the step `data-print="whole"`.
- **Checking.** Producers MUST report a target that does not exist on the rendered slide and SHOULD warn when the framed area would make body text smaller than 24 px or larger than the stage.
- **Requirements.** A lesson that uses `{zoom}` lists `camera-v1` in `requires` (§3.5): an editor that does not implement it would drop the camera when rebuilding.
- In `deck-marks`, a zoom is `{type:"zoom", id, scale?}` (`id` = `"reset"` for a reset).

### 8.4 Component contract (summary)

`steps`, `props`, `mount(ctx)`, `duration(k)`, `cues(k)`, `render(k, t, ctx)`; `render` gives the same output for the same *(k, t)*; colors only through theme CSS variables. The runtime calls `mount` only after the stage has been laid out (the component has its final, non-zero size) and the web fonts in use have loaded, so that a lesson started in a hidden or not yet laid-out context (a hidden frame, a background tab, before printing) renders the same as one started visibly; seeks requested before that are applied after mounting. A component MAY let the viewer interact with it (rotate a model, drag a value) during a step; that state is not part of *(i, k, t)*: entering any step (including the same one again) restores the rendering `render(k, t)` gives, and video, print and the presenter's view always show that rendering.

## 9. Player requirements

### 9.1 Playback

A conforming player MUST: render any *(i, k, t)* deterministically; implement the `talk`, `learn` and `video` modes and the preview option (§1.2); play the formats in §5.1; start audio only after a user gesture (a visible start/resume control); pause when the page is hidden; honor `prefers-reduced-motion` by rendering final states; and work from `file://` with no network access.

### 9.1A Links to slides

- A link to a slide is an ordinary anchor whose fragment is a slide id: `<a href="#s-k3f9q2">`; `#<slide id>:<stepKey>` addresses a step. Such links contain no script and are allowed in Core documents. The same fragments in the file's URL select the starting position.
- Following a link moves to step 0 of that slide (or the given step) at its final state in `talk` mode; in `learn` and `video` mode it seeks there and keeps the current playing state. In the `flow` and `pages` layouts it scrolls to that step's block (in `split`, both sides move). Players SHOULD offer "back" to the position before the most recent link.
- Players MUST keep link navigation inside the document (no top-level navigation). When embedded (§9.4), a link produces a `position` event with `cause: "link"`, and a host that restricts navigation (§1.2) MAY veto it; players then stay where they are.

### 9.1B Learner data

Notes, ink, bookmarks, highlights and other data a learner creates MUST NOT be written into the Egatari file. Players MAY keep them in local storage keyed by `docId` (hosts MAY keep them per learner).

- **Anchors.** Each note is anchored to a position that survives revisions of the lesson: a slide key and step key, or an article section id, optionally with a point or range inside it. A note made on a stage pane carries a point in stage coordinates (1280×720); a note made on a text pane carries a text range (a quote of the selected text with a little context before and after, as in the W3C Web Annotation text-quote selector), so that it survives reflow and small edits. Because slide ids are stable (§8.1), notes stay attached when the lesson is revised; a note whose anchor no longer exists is kept and shown as detached, never discarded silently.
- **Kinds.** Typed text and ink (pen strokes with pressure, in stage or page coordinates), as in note-taking applications.
- **Export.** Players SHOULD let the learner export notes: as PDF (each slide's final state or each page of the text, with the learner's notes and ink drawn over or beside it), and as Markdown with the anchors. Notes are output: importing them back is optional.

### 9.2 Tracking

A player SHOULD expose progress through a tracking adapter, detected in this order: SCORM 1.2 API (`window.API` in a parent frame), then `postMessage` to the parent, then local storage. Events: `started`, `step` (`{slideKey, stepKey, index, total}`), `completed`, `suspend` (`{location, data}`). The SCORM 1.2 binding is defined in [`bindings/scorm12.md`](bindings/scorm12.md). A player lists the adapters it implements in `deck-meta.tracking`; completion rules are read from `deck-meta.completion` so that play-only files can be tracked. Completion defaults to "every step visited"; `metadata.completion` MAY set `{"visitedFraction": number}` or `{"reachedEnd": true}`.

### 9.3 Source extraction

A player SHOULD offer to save the archive layer as a ZIP of `files` plus `audio/manifest.json`, so the source remains recoverable without any editor.

### 9.4 Embedding

A host page (a learning platform, an LMS plugin, a video tool) MAY embed an Egatari file in an `<iframe>` and drive it. A player that supports embedding MUST, when loaded with the query parameter `embed=1`, accept messages from `window.parent` via `postMessage` (objects with a string member `egatari`) and ignore messages from any other source. Query parameters `mode`, `layout`, `controls=0` and `preview=1` set the initial state. Every command MAY carry an `id`; the player echoes it in the reply or acknowledgement. Times are seconds as floating-point numbers.

Commands (host → player):

| Message | Effect / reply |
|---|---|
| `{egatari:"seek", id?, slide, step, t}` | go to *(slide, step, t)*; `slide` is a slide key or index, `step` a step key, `t` seconds or `null` for ∞. Reply `seeked` |
| `{egatari:"play", id?}` / `{egatari:"pause", id?}` | start / pause timeline playback with audio. If the browser refuses to start audio, reply `playBlocked` |
| `{egatari:"rate", id?, value}` | playback rate (§1.2) |
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
| `{egatari:"turn", slideKey, stepKey, index}` | OPTIONAL: when narration turn `index` starts; `index` is 0-based within the step's turns (§4). It marks the same moments at which a text pane highlights the current turn |
| `{egatari:"ended"}` | after the last step of the timeline |
| `{egatari:"error", id?, code, message}` | a command failed or the file cannot be played |

The first start of audio SHOULD happen through the player's own start control, because browsers (notably Safari on iPad) may not pass a user gesture in the host page into the frame; hosts SHOULD allow `autoplay` on the frame and MUST handle `playBlocked`. Since a sandboxed frame has the origin `null`, hosts MUST identify the player by `event.source === iframe.contentWindow`. The same messages serve the `postMessage` tracking adapter (§9.2). Embedding commands are unprivileged: they can only do what a viewer could do with the controls. Narration text is not sent at run time; hosts read `deck-narration` from the file.

## 9A. Extensions

Platforms may need information that Egatari does not define (e.g. questions to ask the learner at a step, grouping of steps into chapters). Such information is carried as **extensions** without changing Egatari itself.

- **Index:** `extensions` is an object whose keys are extension names (`^[a-z][a-z0-9]{0,31}$` — no hyphen, so that `x-<name>-<field>` is unambiguous) and whose values are objects with at least `v` (integer version of that extension; producers write `1` unless the extension's definition says otherwise). Data addressed to a step uses step keys.
- **Source:** in the slide source, extension data MAY be written as attributes `data-x-<name>-<field>` on slides and elements, and in `narration.md` as extension lines (§8.2). Producers MAY fold them into `extensions.<name>` at export.
- Readers MUST ignore extensions they do not implement. Editors MUST preserve them byte-for-byte through tier A edits — except entries derived from extension lines (§8.2) that the edit changed — and preserve their content through tier B and C edits, except entries whose step or slide no longer exists, which they MAY drop with a warning.
- An extension MUST NOT change how a player that ignores it renders or times the lesson. Information without which the lesson cannot be played correctly is not an extension; it needs a new feature in `requires` and a new version of this specification.
- Extension data in a portable file is public to anyone holding the file (§3.7).
- Extension names are registered first-come in [`extensions.md`](extensions.md) with a link to their definition.

## 9B. Signatures (feature `signatures-v1`, draft)

> Draft. Not part of the 1.0 conformance requirements until this note is removed. Interoperability with C2PA Content Credentials is planned for a later version (statement → claim and hard binding, `derivedFrom` → ingredient, affiliation → identity assertion).

A rights holder MAY sign a lesson so that players can show who signed it and whether it has changed since. Signatures make genuine copies verifiable; they cannot prevent modification, and an attacker can remove the signature block entirely. `signatures-v1` is ignorable and MUST NOT be listed in `requires`.

### 9B.1 Block

```html
<script type="application/vnd.egatari+json" id="egatari-signatures">{"signatures":[…]}</script>
```

Each entry is a JWS in JSON Serialization (RFC 7515 §7.2.2 flattened form) whose payload is the UTF-8 bytes of a **statement** (carried as is, so no canonicalization is needed):

| Statement member | Meaning |
|---|---|
| `type` | `"egatari-signature/1"` |
| `docId` | the lesson's `docId` |
| `signedAt` | RFC 3339 time claimed by the signer |
| `signer` | `{name, affiliation?, orcid?, keyId}` — claims, verified only through §9B.3 |
| `fileSha256` | SHA-256 of the whole file with the `egatari-signatures` element (from `<script` to `</script>` inclusive) removed |
| `indexSha256` | the index's `data-sha256`, if portable |
| `sourceSha256` | as §3.4, if portable |
| `derivedFrom` | copy of `metadata.derivedFrom`, plus `signatureDigest` of the original's signature when known |
| `supersedes` | digest of an earlier signature by the same signer on a previous revision |

Algorithms: `EdDSA` with Ed25519 (RECOMMENDED) and `ES256` (P-256). Verifiers MUST support both. The protected header carries `alg` and `kid`; the JWK of the public key MAY be included as `jwk`.

### 9B.2 Verification and display

A player that implements this feature computes `fileSha256` and verifies each signature, then shows exactly one of:

- **Signed, unmodified** — signature valid and `fileSha256` matches; with the identity level (§9B.3).
- **Modified since signing** — signature valid for an earlier state but `fileSha256` differs.
- **Signature invalid** — the signature does not verify.
- No indication when there is no signature block. Players MUST NOT present the absence of a signature as evidence of forgery, nor any unsigned lesson as verified (§11).

Tier A edits by the signer SHOULD be followed by a new signature with `supersedes`. Edits by anyone else leave the old signature in place, which then shows *modified since signing*. (A later revision may sign a frame hash excluding tier A regions plus per-step narration and audio hashes, so that players can say which steps changed.)

### 9B.3 Identity levels

| Level | Evidence | Shown as |
|---|---|---|
| L0 | key only (`did:key`), name self-declared | "signed with key <fingerprint>, name as declared" |
| L1 | the key fingerprint is published by the signer on a site they control (`did:web`), ORCID or researchmap; checked when online | "<name>, key confirmed at <site>" |
| L2 | an attestation by an organization (university, or an Egatari key registry) binding the key to the person and affiliation, embedded and verifiable offline | "<name>, <affiliation>, confirmed by <organization>" |

Any organization MAY issue L2 attestations; this specification names none. Which attesting organizations a player or host trusts is its own configuration (e.g. a host for one university trusts that university), and a player MUST show the attesting organization's name rather than a generic "verified".

Signing certificates that contain personal data beyond name and affiliation (e.g. national ID card certificates) MUST NOT be embedded. Authors SHOULD also publish each lesson's `docId` and their key fingerprint on an official distribution page, so that copies can be checked against it.

## 9C. Article layer (feature `article-v1`, draft)

> Draft. Motivation: one file as *paper + code + talk* ("arXiv + GitHub + conference"). Not part of 1.0 conformance until this note is removed.

A lesson MAY carry an **article**: long-form text (a paper, a textbook chapter) that is the *reading face* of the same content whose *talking face* is the slides and narration. Neither face is the master; they are linked both ways.

### 9C.1 Article

- The runtime layer contains the article as HTML in `<article id="egatari-article">`: headings with ids, paragraphs, figures, tables, equations (rendered like slide math), citations and a reference list. HTML is the canonical reading form, as on arXiv's HTML pages.
- The archive layer contains the article's authoring source (e.g. `article.md`, or HTML converted from TeX or Word). Producers convert TeX (e.g. with LaTeXML or pandoc), Markdown and Word to this source when importing; conversion fidelity is the producer's responsibility. After import, the Egatari source is the original (§1.0): later edits are made to it, not to the TeX or Word file, which MAY be kept as an attachment (`role: source`) for provenance.
- A figure in the article MAY be a component (`<m-…>`), rendered at its final state when read and interactive in `read` mode; the same Core/Extended rules apply (§6).
- The article satisfies the readable layer (§2.1) for the content it covers.

### 9C.2 Links between the faces

- A slide MAY name the article sections it presents: `<section class="slide" data-article="sec-method sec-results">`.
- The article MAY link to positions in the talk: `<a data-egatari-step="<stepKey>">` (and to a slide with a slide key).
- Players offer "watch this part" from an article section and "read more" from a slide.
- **Staleness:** when a link is made or confirmed, the producer records the SHA-256 of the section's text in `index.articleLinks[slideKey][sectionId]`. If the section changes, editors show the linked slides as possibly out of date, as for narration audio (§5.4).

### 9C.3 Attachments

See §3.8. An article commonly carries its typeset PDF (`pdf`), its TeX or Word source (`source`), and its code and data.

### 9C.4 Modes

A `read` mode shows the article face. `learn` mode MAY show the linked article section beside the slides. `talk` and `video` are unchanged.

## 10. Conformance classes

| Class | Requirement summary |
|---|---|
| **Document — Core / Extended** | valid runtime layer; if portable, valid archive layer of that profile; readable layer (§2.1) |
| **Player — Core / Extended** | §9.1; resolves `egatari:` audio; Extended players run embedded component code |
| **Editor** | safe import (§11), tier A at least, §7, preserves unknown members and `docId` |
| **Producer** | writes conforming documents; §3.3 exclusions; §5 audio rules |
| **LMS Binding** | packages a document for a learning platform per a binding document (SCORM 1.2 in 1.0) |
| **Host** | a platform that accepts and plays Egatari files: §10.1 |

Conformance is tested with the fixtures in [`fixtures/`](fixtures/).

### 10.1 Host

A conforming host MUST:

1. Validate uploaded files on the server per §11 without executing them (limits, hashes, `requires`), and reject unsupported `requires` with a clear message. Hosts whose platform limits are lower than §11's recommendations MUST stream uploads rather than buffer them.
2. Play files through §9.4 in an iframe with `sandbox="allow-scripts"` and without `allow-same-origin`, and serve the file itself with a `Content-Security-Policy` that sandboxes it and forbids network access even when its URL is opened directly, e.g. `sandbox allow-scripts; default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' blob:; font-src data:`.
3. Store the original bytes unmodified and return them unchanged to users authorized to edit. It MAY serve learners a play-only derivative (§3.7), and MUST do so when extensions carry information to be withheld from learners.
4. Play files that carry no extensions for that host.
5. Record progress from §9.2/§9.4 events, keeping Egatari completion (`deck-meta.completion`) distinct from the host's own grading.
6. Never write learner data into files (§9.1B).

A host MAY supply its own controls and restrict navigation (§1.2), and MAY restrict the modes and faces it offers beyond `deck-meta.offer`; restrictions are enforced by the host's own frame and controls, never by the file. Conformance covers Egatari content only; other kinds of material a platform offers are out of scope.

## 11. Security considerations

- **Opening an Egatari file as a web page runs its scripts**, as with any HTML file. Being importable safely by an editor does not make arbitrary HTML trustworthy.
- **A conforming runtime makes no network requests**, with one opt-in exception: the [`live`](extensions/live.md) extension, which a player may honour only for the one endpoint and time window the author declared, visibly to the learner. A lesson that connects elsewhere, or outside that window, is not conforming.
- An editor MUST read an imported file as bytes and extract the index and blobs with a parser that neither executes scripts nor loads resources. It MUST NOT navigate to, `srcdoc`, or insert the file into a document. It MUST validate the index hash, blob hashes, MIME types, and archive paths (§3.3) before constructing any workspace.
- An editor MUST enforce limits before allocation and account for them in this order: file size before parsing; index size before parsing and member count while parsing, before allocating beyond the limit; each chunk's encoded length (at most 262 144 characters) before decoding; cumulative decoded bytes while decoding; and the **logical** extracted size — the sum over all paths of their blob sizes, since several paths may share one blob — before allocating per-path copies. Recommended limits an editor may refuse beyond: 100 MiB file, 128 MiB decoded archive, 3000 files, path depth 10, 4 MiB index, 32 MiB per file.
- Messages from a preview MUST NOT authorize mutations. A write happens only as an operation initiated and scoped by the editor's own UI; preview code cannot create that authorization (it may only send hints such as the selected slide, step or element).
- A preview's policy MUST be in force before any untrusted byte is parsed: editors construct the preview document from a trusted prefix that carries the policy, never by searching untrusted markup for a place to insert it. Every document the preview can load (including other documents served from the same location) MUST carry the same policy, or be served so that it cannot render (e.g. `Content-Security-Policy: sandbox` with `default-src 'none'`, `nosniff`, a non-HTML type and `Content-Disposition: attachment`). Because navigation is an exfiltration channel even under `connect-src 'none'` (the requested URL carries data), the embedding page MUST restrict `frame-src` to the exact preview endpoint (a CSP source ending in `/` is a prefix match), so that the preview cannot navigate itself to the editor's origin, `data:`, `blob:` or external URLs. A preview document MUST NOT be served for top-level navigation (where no embedder's policy applies); servers SHOULD require evidence of the controlled embedding context (e.g. a per-session capability issued to the embedding page, or `Sec-Fetch-Dest: iframe`).
- Previews MUST run in a sandboxed frame with an opaque origin and a content security policy forbidding network connections, forms and external resources. File handles, microphone access, model workers and write operations MUST stay in the editor's own context; messages from the preview MUST be treated as untrusted hints.
- Producers and editors that read a lesson from a folder MUST read only regular files (not FIFOs, devices or sockets), MUST count the bytes actually read against their limits (a size reported before reading is only an estimate), and MUST NOT follow symbolic links, junctions or aliases that resolve outside the lesson folder (or outside the authorized component or theme root), for reads as well as writes, including backups and their cleanup; a file read from outside would be exposed to the lesson's own scripts.
- Hashes in this format detect corruption; they do not authenticate authorship.
- **Modification cannot be prevented, and authenticity is not guaranteed by Egatari 1.0.** Anyone can alter a lesson and present it as someone else's original (e.g. to misrepresent what a teacher teaches). The optional feature `signatures-v1` (§9B, draft) lets a rights holder sign a lesson so that players can show whether a copy is unmodified since signing and who signed it; signatures make genuine copies verifiable, they do not make forgery impossible. Until then, players and hosts MUST NOT present any lesson as verified or authentic, and metadata such as `creators` MUST be described as claims.

## 12. Media type and identification

- Distribution: `text/html`. Extension `.ega.html`.
- The extension `.ega` (without `.html`) is reserved for a future in which browsers and operating systems recognize Egatari files natively; a `.ega` file will have exactly the same content as the corresponding `.ega.html`. Until then, producers MUST use `.ega.html`, so that current browsers open the file.
- Index block: `application/vnd.egatari+json` (to be registered with IANA when 1.0 is frozen).
- Detection: a reader identifies an Egatari file by `deck-meta.format == "egatari"` or an `egatari-index` block.

## References

- [RFC 2119], [RFC 8174] Key words. [RFC 4648] Base64. [BCP 47] Language tags.
- W3C EPUB 3.3 Media Overlays; Readium Guided Navigation; WebVTT; W3C PLS 1.0; SSML 1.1 — interoperability targets for exports.
- ADL SCORM 1.2 Run-Time Environment.

## Appendix A. Open issues

1. **Blocker for 1.0:** normative text of §8 (import and freeze `docs/contract.md`), component/theme dependency manifests and hash scope, schemas for every runtime block, archive↔runtime consistency rules.
2. Public component registry: direction — releases of a dedicated repository (`egatari/components`), each publishing a manifest of component names, versions and code hashes; proposals collected as issues. To settle: whether a Core document may use a component only from a published release, how old releases stay available so that earlier lessons remain editable (tier B) (withdrawn releases: §6), and naming rules for contributed components.
3. Whether a lesson may embed a custom reference voice (size, privacy).
4. Tolerances for loudness and cue timing across browsers.
5. File-picker availability on `file://`; download as the baseline save path.
6. `signatures-v1`: what is signed (index and runtime layer), interaction with tier A edits and derived lessons, key identity (e.g. did:web, GitHub keys, Sigstore, C2PA certificates), timestamps and long-term verification.
7A. `camera-v1` (§8.3A): margin and easing values, interaction with morphs (§8 of the contract) at step 0, and whether a host may disable camera moves for accessibility.
7. `article-v1` (§9C): section-to-slide link granularity, TeX/Word conversion profiles, and an optional Python-in-browser feature for simulations. **Citations — direction:** the archive carries references as CSL-JSON (e.g. `references.json`), the format of citeproc, pandoc, Zotero and Crossref; slides, narration and the article cite with pandoc-style keys (`[@key]`, `[@key, p. 3]`), which producers resolve at build time into rendered citations and a reference list (players need no bibliography engine); BibTeX is converted when importing and MAY be kept as an attachment (`role: source`); citations in narration are excluded from speech or given a reading; quality checks report keys without a reference. Presentation is the author's choice, recorded in `metadata.citations` = `{style, placement, list}`: `style` a CSL style id (default a common author–date style; a lesson imported from TeX SHOULD default to the CSL style matching its `\bibliographystyle`, or keep the references as the TeX build typeset them, from its `.bbl`, so that a journal's notation is preserved); `placement` `inline` (e.g. "(Vaswani et al., 2017)", default), `footer` (the works cited on a slide listed in that slide's footer, e.g. by short title) or `both`; `list` `end` (a reference list at the end, default), `section` (per article section) or `none`. To settle with `article-v1` (v0.7), together with DOIs.
8. Scholarly use (submission and open review): (a) review comments as separate documents anchored into a lesson with the W3C Web Annotation Data Model (targets by `docId` + `sourceSha256`, selectors by step key, article section id or text quote), never written into the author's file; (b) revision history of one paper (same `docId`, successive `sourceSha256`) and per-step diffs; (c) an anonymized derivative for double-blind review (creators, copyright, attribution, signatures and personal metadata removed).
9. Document fixtures (fixtures/README.md), including tier A edits that introduce new glyphs and SCORM lifecycle cases, must exist before freezing.
9A. Multilingual lessons: narration, audio and captions in several languages within one lesson (viewer-selectable), a narration language distinct from the slide language (e.g. Japanese slides with English captions), and `translate="no"` on math, code and component output so that browser translation does not break them. Right-to-left scripts (Arabic, Hebrew, Persian, Urdu): `dir="rtl"` on the lesson or a slide, which layout regions mirror (heading, conclusion line, progress bar, step order of side-by-side columns), and which stay left-to-right (math, code, numbers, components unless they declare RTL support); bidirectional text inside one line; and how a vertical-writing slide (`layout-tate`) relates to these writing modes.
10. Attachments (§3.8): whether to allow audio and video attachments; the outer package format (RO-Crate based) for material that does not belong in the file; measured size budgets.
11. Audio watermarks (§5.2, §7.3): which schemes to name, whether producers of cloned voices should embed one by default, detection without network access, and how robust common schemes are to the reference post-processing (−20 LUFS, MP3).
