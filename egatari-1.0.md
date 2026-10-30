# Egatari 1.0 — Editor's Draft

**Status:** Editor's Draft. Not stable. Anything may change before 1.0 is frozen. Dated snapshots: [CHANGES.md](CHANGES.md) (latest: WD 2026-10-26).
**Editors:** Gendo Kumoi (Nagaoka University of Technology).
**Companion:** [Egatari Player 1.0](egatari-player-1.0.md) — how players show a lesson (modes, layouts, playback, links, embedding), versioned separately.
**Reference implementation:** [Egatari Studio](https://github.com/egatari/egatari-studio) (producer and editor, https://studio.egatari.org/), which bundles Egatari Player.
**License of this document:** [CC BY 4.0](LICENSE.md). Schemas, fixtures and tools are MIT ([LICENSE](LICENSE)).
**Repository:** https://github.com/egatari/egatari-spec · **Site:** https://egatari.org/

Egatari (絵語り, "narrating with pictures") is a file format for **narrated, animated lessons**. One Egatari file is a single HTML document that

1. plays offline in a current web browser as a self-narrating lesson, a live presentation, or a lecture handout, and
2. carries its own authoring source, so that an Egatari editor can reopen the file *without the original folder*, change one sentence or one step's narration, replace that step's audio, and save the same kind of file again.

**Self-contained by design.** Everything a lesson shows — images, fonts, styles, data, audio, components — is inside the file; a lesson never loads a resource from elsewhere by address. This keeps lessons working offline and years later (no broken links), keeps viewing private (nothing is told to a third party when a lesson is opened), and makes what a viewer sees depend only on the file and the position (§1). Links the viewer follows by choice are navigation, not loading. Anything that does reach the network — a live session, embedded third-party content shown only after the viewer asks for it — is an optional extension (§9A) that states exactly what it connects to.

The name is written *Egatari* (or 絵語り). The file extension is `.ega.html`.

## 0. Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals.

JSON structures are normatively defined by the JSON Schemas in [`schema/`](schema/). Where prose and schema disagree, the schema wins and the disagreement is a bug in this document.

"Step key" means `"<slideKey>:<stepKey>"`, where `stepKey` is a non-negative integer in decimal or the literal `concl`. Slide keys may themselves contain `:`; a step key is split at its **last** `:`.

## 1. Model

### 1.0 One source, many views

A lesson has **one source of content**: its Egatari source — the slides (`deck.html`), the narration (`narration.md`) and, when present, the article (§9C), all written in the syntax this specification defines and rendered as HTML. Everything a person sees or hears is produced from that source:

- the faces (talk: slides and narration; read: the article), the display modes (§1.2), the layouts (Player P2) and printing are **views** of the same source; no view carries content of its own;
- a PDF of the lesson is an **output** — any reader can produce one by printing in the `pages` layout — never a part of the source;
- files in other formats (PDF, Word, TeX, spreadsheets) never supply content. Content written elsewhere is **imported** into the Egatari source (e.g. a TeX textbook converted to the article, §9C.1); after import, the Egatari source is the original, and the imported file MAY be kept as an attachment for provenance (§3.8, `role: source`);
- attachments (§3.8) travel with the lesson for readers — an official version typeset elsewhere, the original manuscript, data and code for verification — and are never rendered.

### 1.1 Position

A lesson is a sequence of slides. Each slide has steps `0..n` and optionally a final `concl` step. The **position** is the triple *(i, k, t)*: slide index, step, and seconds since the step began.

- **Determinism.** The rendered screen MUST be a function of *(i, k, t)* alone (plus the display mode and viewport). Content MUST NOT depend on wall-clock time, timers, animation-frame callbacks, call order, or unseeded randomness. The only additional input is the **transition source**: at step 0, a slide transition (cross-fade or morph) depends on an explicit source slide parameter. Without that parameter, a player renders without a transition. Final states never depend on transition history.
- *t = ∞* denotes the final state of the step. A player MUST be able to render any *(i, k, ∞)* directly (jumping, going back, printing, reduced motion).

### 1.2 Faces and views

A lesson has up to two **faces**: `talk` (slides and narration) and `read` (the article, §9C). How a player shows them — the display modes (`talk`, `learn`, `video`), the option to preview later steps, layouts, panes and detached windows — is specified separately in **Egatari Player 1.0** ([egatari-player-1.0.md](egatari-player-1.0.md)), referred to below as *Player*. Players are separate from the format and anyone may write one (§4.1). The file carries only the author's intent:

- **Primary face.** `metadata.primary`: `"talk"` or `"read"` (default `"talk"`; an article-only lesson is `"read"`, §4).
- **Offered views.** `metadata.offer`: `{modes?, faces?, open?}` — `modes` a non-empty subset of `talk`, `learn`, `video` (identifiers defined in Player P1); `faces` a non-empty subset of `talk`, `read`; `open` `{mode?, face?}`. Producers copy it into `deck-meta.offer`, so that play-only derivatives keep it. **This is the author's intent, not access control:** anyone who has the file can play it in any mode (§11); a host that must enforce a policy does so in its own frame (Player P8, §10.1). How players apply it: Player P1.

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

Structure: one `<section id="egatari-readable">` containing, per slide, `<article data-slide-key="…">` with the slide title, and per step `<div data-step-key="…">` with one `<p data-role="expert|novice">` per turn (display text). Images, if any, are `<img alt="…">` inside the article or step. The runtime hides this section when it starts; without script it stays visible. Within an article, step `div`s are in step order (numbers ascending, `concl` last). Narration addressed to a slide key that matches no slide has no article: such steps are omitted from the readable layer and reported. Tier A edits update the affected `div` elements (§7.2). When the lesson has an article (§9C), its `<article id="egatari-article">` is the last child of `#egatari-readable`, after the slide entries; it has no `data-slide-key`. Readers MUST select slide entries by `article[data-slide-key]`, never by element name or position alone.

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
| `contracts` | MUST | `{source}` integer version of the authoring syntax (§7.1, §8) |
| `player` | MUST | `{name, version, title?}` of the bundled player (§4.1); `title` is the name to show people (e.g. "Egatari Player"), `name` a stable identifier |
| `generator` | MUST | `{name, version, title?}` of the producing software (informative; may differ from the player); `title` as for `player` |
| `docId` | MUST | a UUID identifying the lesson across edits; editors MUST preserve it |
| `entry` | see below | archive path of the slide source (normally `deck.html`). A lesson has slides, an article (§9C), or both: at least one of `entry` and `article` MUST be present |
| `sourceSha256` | MUST | hash of the source set the runtime layer was built from (§3.4) |
| `files` | MUST | archive path → blob id |
| `blobs` | MUST | blob id → `{mime, bytes, sha256, chunks}` |
| `audio` | MAY | step key → audio record (§5.2) |
| `components` | MAY | components used (§6) |
| `themes` | MAY | themes used, same shape as `components` (§6) |
| `metadata` | MUST | descriptive metadata (§3.6) |
| `excluded` | MAY | informative list of categories the producer deliberately left out |
| `attachments` | MAY | files carried for readers rather than for rendering (§3.8) |
| `article` | MAY | `{path, references?}`: the article's source and bibliography (§9C.1, draft) |
| `articleLinks` | MAY | `{slideKey: {sectionId: {article, slide}}}`: hashes of linked slides and article sections when last confirmed (§9C.7, draft) |
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

Paths under `audio/` are reserved for narration audio; their blobs MUST have an audio media type from §5.1. `audio/manifest.json` MUST NOT appear in `files`: it is derived from `index.audio` when an archive is unpacked. Producers SHOULD include a root file `egatari.json` (`{"docId", "metadata"?, "attachments"?, "components"?, "articleLinks"?}`) so that an unpacked folder keeps its `docId` and attachment records (§3.8); when present, its `docId` MUST equal the index's, and its `attachments`, when present, MUST equal `index.attachments`. Editors MAY add it to a document that lacks it (this changes `sourceSha256`, which the edit updates anyway). A producer MAY keep its own state in `egatari.json` under one member named after the producer (e.g. `studio`); other producers and editors MUST preserve such members unchanged and MUST NOT give them meaning. An archive MUST include the slide source (`entry`), `narration.md` if the lesson has narration, `article.md` and its references file if the lesson has an article (§9C.1), and the complete dependency closure needed to rebuild the runtime layer (images of the slides and the article, data, styles, deck-local components and themes, macros, `timeline.json`, a voice configuration without private paths). When `egatari.json` carries `articleLinks`, it MUST equal `index.articleLinks`. Registry components (§6) are excluded from the closure; they are resolved by exact name, version and hash. Metadata embedded in images (EXIF, XMP) SHOULD be stripped when an image is first added to a lesson rather than at export, so that rebuilds stay byte-identical. It MUST NOT include: absolute or machine-specific paths, credentials, editor review notes, caches, backups, unreferenced audio, private reference-voice recordings, or personal identifiers not deliberately entered as content.

### 3.4 Source hash

`sourceSha256` is computed as SHA-256 over the UTF-8 bytes of the lines `"<path>\t<sha256>\n"`, one per entry of `files` excluding paths under `audio/`, sorted by path in code-point order. Producers MUST also write the same value into the runtime layer's `deck-meta.sourceSha256` (§4). Readers MUST recompute it from `files` and the blob hashes; a mismatch with the index value is treated like a mismatch with `deck-meta`. An editor that finds any two of these values different MUST warn that the compiled lesson and its source disagree and MUST NOT perform a tier A edit (§7.2).

### 3.5 Features

`requires` lists feature identifiers (`^[a-z0-9-]+$`). Version 1.0 defines `sources-v1` (archive layer present) and `audio-v1` (§5.2 records). A reader MUST refuse to edit or re-export a file whose `requires` contains an identifier it does not implement; it MAY still play the file and extract its source (Player P7) when the index and blobs validate. Source extraction is not re-export. Optional information that a reader may ignore MUST NOT be listed in `requires`.

### 3.6 Metadata

`metadata` MUST contain `title` and `lang` (BCP 47). It MAY contain `license` (SPDX identifier or URL), `copyright` (e.g. `© 2026 Gendo Kumoi`), `attribution` (the credit line the rights holder asks reusers to show), `creators` (display names the author chose to publish), `description`, `accessibility` (schema.org terms such as `accessMode`, `accessibilityFeature`, `accessibilityHazard`), `curriculum` (array of curriculum codes, e.g. Japanese 学習指導要領 codes from the MEXT education data standard), `completion` (§9.2), `series` (§9C.1A), `citations` (§9C.4), and the members of §3.6.1. Producers MUST NOT add timestamps, device identifiers, account e-mail addresses, or file-system locations.

#### 3.6.1 Derivation, authorship and audience

These OPTIONAL members support lessons made for one learner, by learners, or by software agents.

- `derivedFrom`: `{docId, sourceSha256, anchor?}` — the lesson this one was derived from (e.g. a version adapted for one learner, or a short branch answering a question, where `anchor` is the step key it branches from). An editor that changes the original can then find derived lessons and offer to carry a fix over, step by step, using slide ids.
- `importedFrom`: `[{mime, sha256, title?, attachment?}]` — non-Egatari material the lesson was made from (e.g. a PDF, a slide file, scans or photos of printed pages with handwritten comments, a separate errata sheet). `sha256` identifies the original bytes; `attachment` is its path when the original is carried as an attachment with role `source` (§3.8). Steps produced by conversion (e.g. by an AI reading the scans) SHOULD be marked in `authorship` as `by: "ai"`, `reviewed: false` until a person has checked them against the original.
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
- `egatari.json` MAY likewise carry `themes`: `{<name>: <version>}` pinning the themes a rebuild must use, with the same rules as `components` (written into the archive's copy at export; when present it MUST list exactly the entries of `index.themes` with their versions; a rebuild never switches a theme's version silently, and an editor that offers a newer version shows what changes). `index.themes[].version` is the theme's own version, not the producer's.
- Adding, removing or changing attachments is a tier A edit (§7.2).
- Producers and hosts MUST check attachments without executing them (§11) and SHOULD reject a file whose content does not match its declared media type or that fails the conditions above.

**Attachments for learners.** The runtime block `deck-attachments` lists the attachments the author chose to offer to learners: `[{path, role, title, description?, mime, bytes, src}]` with `src` = `egatari:<blobId>`. A play-only derivative (§3.7) keeps the blobs it references and so carries exactly these attachments. The author chooses file by file; producers MAY preselect `pdf`, `data` and `supplement` and SHOULD leave `source` and `code` unselected. Information that must be kept from learners (§3.7) MUST NOT be listed. Players offer the files of `deck-attachments`; editors show all of `index.attachments`.

## 4. Runtime layer

The runtime layer contains the compiled slides (`<section class="slide" data-key="…">` elements), the runtime, and these JSON blocks (`type="application/json"`):

| id | Content |
|---|---|
| `deck-meta` | `{format:"egatari", version, contracts, player, generator, docId, title, lang, portable, sourceSha256?, completion?, tracking, license?, copyright?, attribution?}` — schema [`schema/deck-meta.schema.json`](schema/deck-meta.schema.json). `tracking` lists the tracking adapters the runtime implements (e.g. `["scorm12","postmessage","local"]`), so that packagers and hosts need not read the archive |
| `deck-narration` | `{slideKey: {stepKey: [{role, text, ttsParts?}]}}` — display text; `ttsParts` (OPTIONAL, the spoken pieces of §5.4 with readings applied) lets a player read a step aloud with the device voice (§5.6) as the audio would say it. Producers SHOULD include it; it is the same value that enters `inputHash` |
| `deck-marks` | `{stepKey: [{type:"cue"} \| {type:"mark", id, effect, hold} \| {type:"clear"}]}` — boundaries, only for steps with marks |
| `deck-audio` | `{stepKey: {src, dur, cues}}` — `src` is a `data:` URI or `egatari:<blobId>`; `dur` seconds; `cues` the time of every boundary in order (§5.3); `sync` (`auto`, `manual`, `none`; default `auto`); optional `mime` (the audio media type, so that players of play-only derivatives need not sniff), `startOffset` (§5.2) and `kind` (`tts`, `recorded` or `imported`, copied from the audio record so that play-only derivatives and folder builds keep it; producers SHOULD write it) — schema [`schema/deck-audio.schema.json`](schema/deck-audio.schema.json) |
| `deck-timing` | `{stepKey: {dur?, hold?, lead?, pad_after?}}` — explicit overrides |
| `deck-attachments` | attachments offered to learners, with `src` = `egatari:<blobId>` (§3.8, draft) |
| `deck-extensions` | `{<extension name>: <data>}` — the extension data that players consume (§9A), copied from the index's `extensions` because play-only derivatives have no index; only extensions whose definition says so (e.g. [`live`](extensions/live.md)) |

Every slide MUST carry an `id` (§8.1) and a `data-key` equal to it, so that editing a title never breaks narration and audio associations.

**Lessons without slides.** A lesson MAY consist of an article only (§9C; no `entry`). It then has no slides and no steps; `deck-narration`, `deck-audio`, `deck-marks` and `deck-timing` are absent; `#egatari-readable` holds only `<article id="egatari-article">`; `deck-meta.title` and `lang` come from the article's front matter; its primary face is `read` and printing uses `pages`. In 1.0 narration and audio are bound to steps, so an article-only lesson has neither.

A portable file SHOULD reference audio as `egatari:<blobId>` so that audio bytes are stored once, in the archive layer. A player resolves `egatari:<blobId>` by decoding that blob.

### 4.1 The bundled player

The runtime script in a file is **the bundled player**: one conforming player, carried in the file so that the lesson plays in any current browser without installing anything. It is not part of the format. `player` (in the index and in `deck-meta`) names it; `generator` names the software that wrote the file, which may be different.

- The lesson MUST be playable without the bundled player, given a host that provides the component interface of §8.4: everything a player needs is in the compiled slides, the runtime JSON blocks (§4), the styles and fonts, and the components (§6). Parts reach the player only through the context of §8.4 and each other only through the registry of §6.1. Files written to WD 2026-10-26 and earlier use components that rely on the bundled player's globals; for them this holds only without components. Nothing a player needs may exist only in the bundled script or in undocumented state; every player, the bundled one included, plays from these documented parts.
- A different player MAY play the file by reading those parts and ignoring the bundled player's script.
- Tier A edits (§7.2) change neither `player` nor `generator`: a file keeps its bundled player and its producer through narration, audio and timing edits. An editor that rebuilds the runtime layer (tier B or C) replaces the bundled player with its own and writes its own `player`, `generator` and `deck-meta.tracking` (which describes the bundled player's adapters). When the new player's `name` differs from the old one, the editor MUST tell the user before saving which player the saved file will carry.
- Players and hosts SHOULD show the format version, the bundled player and the producer in their information panel, in that order (e.g. "Egatari 1.0 · Player X 1.2 · made with Y"), using `title` when present and `name` otherwise.

### 4.2 Network policy in the file

Every Egatari file MUST carry, as the first element of `<head>` after `<meta charset>`, a `<meta http-equiv="Content-Security-Policy">` that applies to all scripts in the file, the bundled player and components included. Its baseline is:

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'self' file:; worker-src 'none'; object-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'
```

- The only permitted additions are the destinations declared by an extension whose definition allows network access (§9A), as carried in the runtime block `deck-extensions` (§4; so that play-only files can be checked), and only in the directive that extension names; several such extensions combine, each adding to its own directive (e.g. `live` adds its endpoint to `connect-src`; `embed` adds its listed hosts to `frame-src`). Nothing else may be loosened.
- The policy element MUST precede every `<script>`, `<style>` and `<link>`, every element with a URL-bearing attribute (`src`, `href`, `srcset`, `poster`, `data`) and every event-handler (`on*`) attribute; only `<!DOCTYPE>`, `<html>`, `<head>` and `<meta charset>` may come before it (`<meta charset>` may also follow it, within the first 1024 bytes), and none of them carries an event-handler attribute. The file MUST NOT carry a second policy.
- Validators, editors and hosts MUST compare the policy with the baseline plus the declared extensions as parsed directives and source lists (directive order and spacing are not significant), and MUST NOT describe a file whose policy differs as conforming.
- The file's policy binds the file's own scripts in a browser. It is not evidence that an editor may trust the file: the preview rules of §11 (a policy from a trusted prefix, never found by searching untrusted markup) are unchanged.
- The policy does not restrict links the viewer follows by choice (§11), nor navigation started by script; hosts therefore still serve files with their own headers (§10.1), and players still apply §11.

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
| `recipe` | MUST for `tts` | `{engine, model, voice, seed, dictionary, processing}`; `voice` is a public identifier, never a path; a lesson MUST NOT carry the reference recording a voice was cloned from (in the archive, as an attachment or in any block): it carries only the narration audio synthesized with it, so that a person's voice sample does not travel with every copy of the lesson, and an editor that regenerates audio needs the reference voice from elsewhere; `dictionary` an identifier of the effective reading dictionary and rules (SHA-256 RECOMMENDED); `processing` a free-form profile string, RECOMMENDED as `key=value` pairs separated by `;`. `engine`, `model` and `processing` identifiers are producer-defined and SHOULD be stable and versioned |
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

### 5.6 Reading with the device voice

A player MAY read the narration of a step that has no audio with a speech synthesizer of the viewer's device (e.g. the Web Speech API), when the viewer asks for it. It MUST use only voices that run on the device (in the Web Speech API, `localService` voices), since other voices send the text off the device (spec, *Self-contained by design*); it SHOULD substitute readings (§4) before handing over the text (from `ttsParts` in `deck-narration` when present), and MUST say that the narration is being read by the device. Such reading is not audio of the lesson: it is never written into the file or a video, it is not part of the timeline (a step being read lasts as long as the reading), and *(i, k, t)* rendering and `video` mode are unaffected. Editors MAY offer the same as a preview.

## 6. Components and profiles

Animated figures are custom elements (Web Components) following the component contract (§8.4). Each entry of `index.components` is `{tag?, name, version, sha256, source, requires?, license?}` where `source` is `registry` or `embedded`; `version` is the part's own version (§6.1), `requires` the parts it imports (§6.1), `license` an SPDX license expression (e.g. `MIT AND OFL-1.1`); `tag` is present for parts that define an element. For registry entries, `name` MUST match `^[a-z][a-z0-9-]{0,63}$` (a single identifier, never a path). A component's `sha256` covers its code file (`index.js`) only. **Line endings are normalized before hashing** a component's code or a theme's text files: every CRLF and every lone CR becomes LF (a UTF-8 BOM at the start is removed), so that a checkout on any platform yields the same hash; JavaScript and CSS mean the same with either line ending. Producers SHOULD store these files with LF. Distribution archives of a registry (e.g. a release tarball) are verified byte for byte by their own hash; the normalization applies only to the identity hash recorded in `index.components` and `index.themes`. Each entry of `index.themes` is `{name, version, sha256, source}`; a theme's `sha256` is SHA-256 over the lines `"<relative path>\t<sha256>\n"` of the files a build reads from it (its stylesheets, its declaration file and the assets they reference; documentation such as `README` files is not part of it), sorted by path. `version` is the registry release for registry entries; embedded entries without a version use `"local"`. A theme MAY declare the geometry of its frame (where the body, the conclusion line and, for vertical slides, the columns lie, in stage pixels of 1280×720) for authoring tools and quality checks, so that a theme may move these boxes and checks still measure against the right limits; players MUST NOT use that declaration for rendering (themes render only through their CSS), and it is covered by the theme's `sha256` like any other theme file. Declared geometry changes where limits lie, never the limits themselves (minimum text sizes, title and conclusion lengths). A theme that moves any of these boxes from the defaults of the reference themes MUST declare its geometry when it is bundled with a producer or published in a producer's official theme library, and producers SHOULD test that the declaration matches what the CSS renders; for other themes (a user's own) the declaration is RECOMMENDED, and checks SHOULD warn when a theme's rendered boxes differ from its declaration, or when an undeclared theme moves them.

| Profile | Components | Editor behavior |
|---|---|---|
| **Core** | Only `registry` components: identified by name, version and the SHA-256 of their code in a public component registry. The archive contains no component code. | The editor supplies its own trusted copy and verifies the hash. A component it does not have is shown as its final-state image or text equivalent. |
| **Extended** | `embedded` components: code is in the archive (pinned at export). | The editor MUST run component code only in a sandbox with an opaque origin and a policy that forbids network access, and MUST tell the user that the lesson contains its own interactive parts before any of that code runs. "Forbids network access" means at least `connect-src 'none'`, with every other resource type limited to `data:` and `blob:`. |

The runtime layer of either profile contains the component code needed to play offline. An Extended document MAY mix registry and embedded components. A document is Extended if any archived file other than registry components and attachments (§3.8) contains executable script (a `<script>` element without a data `type`, or a JavaScript file); otherwise it is Core. Readers MUST NOT rely on the declared `profile`: they MUST determine whether code can run from the validated content — at least: `<script>` elements of any non-data type (except one with no `src` attribute whose content is empty or only whitespace, which is not code); event-handler attributes (`on*`); `javascript:`/`vbscript:` URLs in any URL-valued attribute, including SVG animation values; `srcdoc`; embedding elements (`iframe`, `object`, `embed`, `frame`) and `meta http-equiv=refresh`; JavaScript files; and HTML or SVG documents the source includes or references. Registry components that evaluate expressions written in attributes are a code path even in a Core document (trusted code, untrusted data): such components MUST restrict what those expressions can do (e.g. arithmetic only), and readers SHOULD treat expressions outside that restriction as code. A registry MAY withdraw a release, for example after a security fix; the release then stays available, and the registry's manifest marks it withdrawn and names the replacement version. An editor that opens a document recording a withdrawn version SHOULD tell the user and offer to rebuild with the replacement; it MUST NOT substitute the replacement silently, because the identity hash and the rendered result may change. Until the document is rebuilt, an editor MAY still play and preview it, but SHOULD run it isolated from the editor's own origin (e.g. a sandboxed frame), and SHOULD NOT relax the editor's own content security policy for it. An editor whose isolation cannot run a withdrawn component's code MAY show that component as its final-state image or text equivalent, as for a component it does not have, and SHOULD say so in the notice; the rest of the document still plays. Classification MUST be performed on the expanded source — after every include or preprocessing step, covering every dependency read as text regardless of its file extension — and on the same bytes that are then rendered; a dependency that cannot be read makes the document count as containing code. Classification MUST parse HTML as a browser does with scripting enabled (e.g. `<noscript>` content is raw text), or take the union of the scripting-enabled and scripting-disabled interpretations. and treat a document whose content contradicts its declared profile as Extended or reject it. If an editor cannot obtain a trusted copy of a registry component with the recorded hash, it MUST disable tier B and C edits for that document and MAY still perform tier A edits.

### 6.1 Parts and their dependencies

Everything a component needs at play time travels in the file as **parts**: element parts (custom elements such as `m-bars`), and library parts that other parts use (a shared base class and helpers, a heavy library). A player provides nothing to parts beyond the context of §8.4.

- **Names and versions.** A part has a name (`^[a-z][a-z0-9-]{0,63}$`; its version is declared in its catalogue entry and in `define`) and its own version (semantic versioning: the version changes when the part's behaviour does, not when unrelated parts are released). A collection of parts released together (a parts library) has a catalogue version of its own; files record part versions, not catalogue versions.
- **Registry.** Before any part, the producer writes a small registry script whose behaviour this section defines; it is not the bundled player's. It exposes one global, `egatariParts`, with `define(meta, factory)`, the only member parts may rely on, and `status()`, for players and tools: it returns `{defined: ["<name>@<version>", …], failed: [{name, version, element?, reason}, …]}` in the order of the calls (`element` as in the part's `meta`, so that a player can tell which elements to show as their final-state image), where `reason` is `meta` (`meta` is not an object with a valid name and version), `factory` (the factory is not a function, throws, or, for an element part, does not return a custom element constructor), `missing` (a required part is not defined), `dependency` (a required part failed), `duplicate` (a second `define` of a `name@version` already defined, which is ignored; the first is kept) or `element` (the custom element name is already defined, or defining it fails). This section defines the registry's behaviour; any code that behaves so conforms (the reference implementation's is informative). `meta` is `{name, version, requires?, element?}`; `requires` maps part names to exact versions; `element` names the custom element a part defines. `meta` MUST be written as the first argument of `define` as a static object literal: keys are identifiers or double-quoted strings, values are double-quoted strings or objects of the same form (e.g. `{name: "bars", version: "2.0.0", requires: {base: "1.0.0", "boxplot-core": "1.0.0"}, element: "m-bars"}`), with no comments, computed keys, spreads, other values or trailing commas, so that a producer can read a part's name, version, requirements and element without running it; producers record them in the part's `index.components` entry (`name`, `version`, `requires`, `tag`), for embedded parts as for published ones. The registry calls `factory(deps)` with an object holding, for every required name, the value that part's factory returned, and keeps the result under `name@version`; the registry freezes that value (shallowly) and parts MUST NOT modify what another part returned; for an element part, the returned class is defined as a custom element under `element` (only if not already defined).
- **Order.** The producer writes parts in an order in which every part follows the parts it requires; a file never refers to a part that comes later. Two versions of the same library part may both be present; each is kept under its own `name@version`. Custom element names are global to the document, so a file MUST NOT contain two element parts that define the same element name, whether two versions of one part or two differently named parts: a producer that cannot satisfy every requirement with one definition per element name refuses to build and reports the conflict (the author then updates the parts, §7.2 tier C), rather than dropping a version that another part requires. A registry that meets a second definition of an element name records it as failed (`element`) and leaves the first. Versions in a file are always exact; version ranges exist only in a library's own sources and are resolved by the producer.
- **No other import.** Parts do not use `import`, `require`, network access or globals of the player; the file's network policy (§4.2) forbids loading code from anywhere else.
- **Data shapes.** A part checks its own data against its declared shape (typically through a library part) and reports a mismatch with `ctx.report`; players do not validate component data.
- **Failure.** When a factory throws or a required part is missing, the registry records the failure for that part and its dependants, which are then shown as their final-state image or text equivalent; nothing else on the slide is affected.
- **Containment.** An exception thrown by an element part while the player calls it (`steps`, `mount`, `render`, `layout`, or a handler it registered) MUST NOT escape to the player or affect other parts. A shared base class SHOULD catch it, call `ctx.report` once for that instance, and show the final-state image or text equivalent; the element then counts as having 0 steps beyond any declared in its `steps` attribute. Players SHOULD also catch such exceptions, as a second layer, with the same result.
- **Identifiers.** Identifiers a part writes into the document (e.g. `clipPath` or gradient ids referenced by `url(#…)`) MUST be unique across parts and part versions present in the same file, e.g. by prefixing them with the part's name and version, and MUST be deterministic (no randomness, no dependence on timing), so that rendering stays a function of (i, k, t) (§1).
- **Notices.** A part that carries data under a license other than its code's (e.g. font outlines under OFL in an MIT part) places the copyright line and the license name directly before that data, in the same file, so that the notice travels wherever the bytes go; `license` in the index states the combined expression.

### 6.2 Rendering at build time

Some content a part shows is expensive to draw at play time (typeset math, music notation) or larger than a lesson needs (glyph data for every character). A part declares such fields, and the producer prepares them when it builds the file; players never run these renderers.

- **Render.** A part declares `build: {fields: {<path>: <renderer>}}`, where `<path>` names a field of its data (e.g. `nodes[].tex`, `abc`) and `<renderer>` one of the renderers below. The producer renders each such field and adds the result to the data next to it, under names formed by appending a suffix to the field's name: `katex` adds `<field>Html` (e.g. `texHtml` beside `tex`); `abcjs` adds `<field>Svg` and `<field>Map` (e.g. `abcSvg` and `abcMap` beside `abc`), and records each renderer once, at the top level of the part's data, as `renderers: {<name>: {version, options}}` (one record per renderer, not per field); the part's `index.components` entry repeats the same `renderers`. Rendering is deterministic: the same input with the same renderer version and options gives the same bytes.
- **Renderers in 1.0:** `katex` (TeX math with the macros of §8.0; `options.output` is `htmlAndMathml`, the default, or `html`, which a part declares as `build.options: {katex: {output: "html"}}` and may use only for fields whose meaning is also given as text, e.g. in the element's `aria-label`, which authors give every component) and `abcjs` (ABC music notation to SVG). In the output, every element a part needs to address carries a build-assigned attribute (`data-note`, `data-beam`, `data-measure`, `data-arc` for notation); parts select by these attributes only, never by a renderer's own class names, so that a renderer can change without changing parts.
- **Subset.** A part whose data is keyed by character (e.g. stroke data for kana) declares `build: {subset: {data: <path>, key: <field>}}` (or an array of such entries); the producer keeps only the entries whose keys occur in the lesson's text and removes the rest. The lesson's text is every character of the slide source (text and attribute values, so that an attribute such as `text="…"` counts), of the narration and of the data the lesson passes to parts, together with the part's `glyphs`. Each entry is subset on its own; when a part declares several, they are applied in the order declared. `data` is `block:<name>`, a data block carried in the part's own code (subsetting data that a lesson passes to a part is not part of 1.0): a JSON value between the comments `/*@egatari-block <name>*/` and `/*@egatari-block-end*/` (`<name>` matches `^[a-z][a-z0-9-]{0,63}$`), whose members or items are keyed by `key`. The producer re-serialises a subset block canonically — `JSON.stringify` of the kept value with members in their original order and no added whitespace; members whose names begin with `_` (such as a licence notice) are kept unchanged and stay first — and leaves every byte outside the markers as it was, so that an editor applying the same subset to its trusted copy obtains the same bytes. Parts declare the characters they generate at play time in `glyphs` (a string of characters), which the producer adds to the font subset (§7.2) as well. The identity of a subset part stays that of the full part: its `index.components` entry keeps the `sha256` of the published part and adds `subset: {keys, sha256}` — the kept keys (a string of characters: the union of the keys kept by every entry, each once, in code-point order) and the SHA-256 of the subset code as written into the file — so that an editor can apply the same subset to its own trusted copy and compare. **Subset by name.** An entry MAY set `match: "name"` (the default is `"char"`, as above) when its keys are names rather than characters, such as icon names. Its keys MUST match `^[a-z0-9]+(-[a-z0-9]+)*$`. The producer splits the lesson's text (as defined above) at every character outside `a`–`z`, `0`–`9` and `-`, and keeps an entry when its key equals one of the resulting tokens exactly; case is not folded. A part that chooses names at play time lists them in the entry's `keep` (an array of keys), which are always kept. A name that also occurs in prose (e.g. `home`) is kept too; this costs only that entry, and keeps the result a pure function of the lesson. For such entries `subset` in `index.components` adds `names`: the kept names, each once, in code-point order, as an array; `keys` then holds only the characters kept by `char` entries (the empty string when there are none).
- **Rendered output is data.** A part inserts rendered markup into its own tree only through a reader that admits exactly the elements, attributes and values listed in [`schema/rendered-markup-1.json`](schema/rendered-markup-1.json) (normative); it never assigns it as HTML. The reader creates each element in its namespace (HTML, SVG, MathML) and sets each admitted attribute; `style` is admitted only as the listed properties and shorthands with lengths or listed keywords, set one property at a time (`color` only as `transparent`, which hides phantom content; no other colour, since colours come from classes and the theme); `fill` and `stroke` only as `none` or `currentColor`; no URL-valued attribute at all. A dropped element is removed with its subtree, a dropped attribute or declaration only by itself, and the part reports drops once per instance and kind (`ctx.report("data", …)`). `xmlns` is checked against the element's namespace and never set. Documented losses of the list: with `katex`, `\color`, `\textcolor`, `\colorbox`, `\fcolorbox` and `\pmb` lose their colour, background or shadow; with `abcjs`, text loses `font-family` (the theme's fonts apply) and `text-decoration`. A file may have been altered after it was built.
- **Missing output.** When a declared field has no rendered result (a file built without the renderer, or after a tier A edit of that field), the part shows the field's source as plain text and reports it once (`ctx.report("data", "[<name>] … not rendered at build time")`).
- **Editors.** A tier A edit (§7.2) leaves rendered fields as they are. A rebuild (tier B) renders again; an editor without the recorded renderer version tells the user before rendering with another.

## 7. Versioning and editing

### 7.1 Versions

- `version` (this specification): minor versions only add optional members; editors MUST preserve unknown members through edits, at every level of the index — including inside `metadata`, audio records and component entries. A reader MUST refuse to edit a file with an unknown **major** version, and SHOULD still play it. It MAY extract the source using the rules of the highest major version it implements, if the index validates against them; otherwise it refuses extraction too.
- `contracts.source`: the authoring syntax (§8). Editors migrate older source contracts with deterministic migrators, and refuse newer ones.
- `player` names the bundled player (§4.1); `generator.version` is informative.
- **Drafts before 1.0.** Files written to Working Drafts before the 1.0 file shape carry no `player` member and no file policy (§4.2). They keep playing with their own bundled player. Editors implementing 1.0 MAY refuse to edit them; when they do, they SHOULD say that the file was made with an earlier draft and point to an editor of that draft or to migration instructions. There is no reader requirement to accept the earlier shapes.

### 7.2 Edit tiers

An editor MUST NOT execute a builder or runtime supplied by the document in its own trusted context.

| Tier | Change | Required behavior |
|---|---|---|
| **A** (default) | narration text, audio, timing overrides (`timeline.json` / `deck-timing`; durations themselves are computed, §5.5) only | Do not rebuild. Only these regions may change: the affected entries of the runtime JSON blocks; the affected entries of the readable layer (§2.1); `sourceSha256` (index and `deck-meta`) and the index hash; archive entries, audio records, attachment records (`index.attachments` and `egatari.json`, §3.8), article link records (`index.articleLinks` and `egatari.json`, §9C.7) and blobs; and **append-only font supplements** — new `<style id="egatari-font-supplement-<n>">` elements carrying glyphs for characters not covered by the embedded fonts. When saving under a new `docId` (§7.3), `deck-meta.docId`, the index `docId`, `metadata.derivedFrom` and `egatari.json` are also tier A regions. Every byte outside these regions, including existing font data, MUST stay identical. |
| **B** | slide content (text, math, figures) | Rebuild with the editor's player (§4.1), using the archived (pinned) components and themes. Before saving, compare the final state of every slide before and after; show the user every slide that changed besides the edited ones. |
| **C** | components or themes in versions other than the pinned ones | Only on explicit request ("update"), with the same comparison as B. |

An editor that does not implement `article-v1` MUST NOT perform tier B or C edits on a document whose index has an `article` member, since a rebuild would drop the article (§9C); it MAY perform tier A edits. Changing the article is a tier B edit that rebuilds only the article (§9C.1).

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

The authoring source is `deck.html` (the slides), `narration.md` (the script) and, when present, `article.md` (§9C), with the files they refer to. This section defines the source syntax of `contracts.source = 1`: what a producer turns into the runtime layer and what an editor must understand to rebuild a lesson (tier B, §7.2). The source is ordinary HTML and Markdown with a small vocabulary; everything an author writes is in this section. Timing constants are given in seconds; together with §5.5 they make every player and every video export time a lesson the same way.

### 8.0 Slides (`deck.html`)

**Structure.** `deck.html` is an HTML document whose slides are `<section class="slide">` elements, in lesson order, inside the element with `id="stage"`. A slide is a stage of 1280×720 CSS pixels. Within a slide:

- the heading is the first `<h2>` (`<h1>` on cover and divider slides); producers write its plain text into `data-title` on the heading unless the author wrote one (a shorter title for lists), and players use `data-title` (else the heading's text) for slide lists, captions of navigation and the information panel;
- the body is `<div class="body">`;
- the conclusion line is `<div class="concl"><span>…</span></div>`: one sentence that states what the slide shows; it is always the slide's last step (step key `concl`).

**Kinds of slide** (classes on the section; presentation is the theme's, the meaning is this list):

| Class | Meaning |
|---|---|
| `cover` | the lesson's cover: title (`<h1>`), and optionally `.venue` (course or venue) and `.au` (authors) |
| `sec` | a chapter divider: starts a chapter named by its heading; players MAY list chapters |
| `sec appendix` | an appendix divider: the following slides are the appendix (players number them as appendix) |
| `static` | no steps: everything is visible at step 0 and the conclusion line is not a separate step |
| `nostep` | list items are not turned into steps automatically (below) |
| `noconcl` | the slide has no conclusion line, so the body may use its space |
| `layout-tate` | vertical writing for the whole slide (heading, body and conclusion in vertical columns) |

`data-chapter="<name>"` on a slide starts a chapter like a `sec` slide without being a divider.

**Steps.** Every element of a slide belongs to one step:

- an element with `data-step="k"` (canonical decimal, 1 ≤ k ≤ 999) and its descendants belong to step *k*, unless a descendant carries its own `data-step`;
- otherwise an element belongs to step 0 (visible on entering the slide);
- **automatic list steps:** on a slide that is neither `static` nor `nostep` and has no `data-step` and no `data-from` anywhere, each `li` child of a `ul` or `ol` that is a direct child of `.body` becomes steps 1, 2, … in document order;
- the conclusion line is step *max* + 1, where *max* is the largest step of the slide (including components' ranges, §8.4), and its step key is `concl`;
- a slide's steps are 0 … *max* and `concl`.

At step *k* a player shows the elements of steps ≤ *k* (with the preview option, later steps faintly, Player P1). An element of step *k* appears during step *k* over `fade` = 0.45 s, starting `data-at` seconds (a non-negative number, default 0) after the step begins.

**Drawn strokes.** An SVG element with class `draw` (and `pathLength="1"`) is drawn in along its path rather than faded: it belongs to the step of its own `data-step`, else of its closest ancestor with `data-step`, else 0; drawing starts `drawDelay` = 0.1 s plus its `data-at` after the step begins and lasts `draw` = 0.7 s (`drawslow` also present: 1.4 s).

**Motion length.** `anim` of step *k* (§5.5) is the latest end among: appearing elements of step *k* (`data-at` + `fade`), drawn strokes of step *k* (`data-at` + `drawDelay` + duration), components (`duration(k)` in real time, §8.4), and at step 0 the slide transition (`slide` = 0.35 s) or a morph (0.9 s, §8.6).

**Text and colour.** Body classes for meaning: `term` (terms, questions), `emph` (conclusions, problems, goals), `muted` (known results), `b` (bold); colours only through the theme vocabulary (§8.4). Other layout classes (`sub`, `big`, `note`, `thm`, `box`, `cols`, `fig`, `figcap`, `cite`, `tate`, `mincho`, `tcy`) are presentation, defined by themes; players need not know them.

**Line breaking.** Text in Japanese (and Chinese) is broken into lines by the rules of W3C *Requirements for Japanese Text Layout* (JLREQ), in horizontal and vertical writing alike: no line starts with closing brackets, `、` `。` `，` `．`, `・` `：` `；`, `！` `？`, `ー` or small kana (行頭禁則); no line ends with an opening bracket (行末禁則); and `……`, `――` and runs of digits are not split (分離禁止). In CSS this is at least `line-break: strict`; themes and players MUST apply it to slides, the text pane, captions and the presenter's script, and MAY hang `、` `。` at the line end (`hanging-punctuation`).

**Math.** `\( … \)` and `\[ … \]` are inline and display math in TeX syntax, rendered by the producer into the runtime layer (HTML with MathML); players never render TeX. Allowed beyond standard TeX math: `\hlE{…}`, `\hlT{…}`, `\hlM{…}` (colour a part as `emph`, `term`, `muted`), `\htmlId{ID}{…}` and `\htmlData{mark=ID}{…}` (emphasis targets, §8.5), `\morph{ID}{…}` (= `\htmlData{id=ID}{…}`, morph pairing, §8.6) and `\htmlClass{name}{…}`; no other `\html…` command. Macros come from `macros.tex` (`\newcommand`, `\def`) and `<script type="text/x-tex-macros">` in `deck.html`. Math is not recognised inside `script`, `style`, `svg`, `textarea` or comments.

**References in the source.** The source may refer to other files of the archive: `{{FIG:<name>}}` is replaced by `figs/<name>.svg` inlined (its ids prefixed with `<name>-`); `{{JSON:<file>}}` by the minified JSON of `data/<file>` (normally inside a component's `<script type="application/json">`); `/*INCLUDE:<file>*/` by the file's text; and relative `src`, `href`, `srcset`, `poster` and CSS `url()` references are embedded as `data:` URIs. Every reference MUST resolve inside the archive; references that leave it are refused. In the runtime layer no reference remains (§4.2).

**Not part of the source vocabulary.** `data-key` is written by producers (§4), never by authors. Attributes and classes not listed in §8 have no meaning to players.

### 8.1 Slide identifiers

- A slide is `<section class="slide" id="…">`. Ids match `^[A-Za-z][A-Za-z0-9_-]{0,63}$` and are unique in the document — including against every other `id` in it, such as attention-mark targets.
- Generated ids SHOULD be `s-` followed by 6 random base32 characters (`[a-z2-7]`). They MUST NOT be derived from the heading, so that renaming a heading never changes the id.
- Every slide in a file MUST have an id, and its key is that id. In the archived `narration.md`, every slide is addressed as `## <heading> {#<id>}`; the heading text is for readers and never a key. Authoring tools MAY accept slides and headings without ids while a lesson is being written (e.g. from an AI), and MUST assign ids (to the slide and its narration heading together) before writing a file.
- **Heading lines in `narration.md`.** A heading line is `## ` followed by the heading text and `{#<id>}` at the end of the line, with or without whitespace before it (`## {#<id>}` alone is allowed). Its content is the key; a heading line without `{#…}`, or whose content is not a valid id, is an error.
- Two slides with the same key make the document invalid. Producers MUST NOT write such documents.
- **Step markers.** Step numbers are written in canonical decimal (`0`, `1`, … without leading zeros), at most 999, or `concl`. Readers MUST NOT treat a non-canonical marker such as `[01]` or `[1000]` as a step and SHOULD report it; lines up to the next marker or heading then belong to no step.

### 8.2 Narration syntax (`narration.md`)

```markdown
## <heading> {#<id>}
[0] text…
[2] Expert: text with {cue} and {mark:ID|circle|hold=2} and {φ|ファイ}
    Novice: question…
[concl] text…
```

**Blocks and turns.** After a slide's heading line (§8.1), each step is a block that starts with a marker `[k]` or `[concl]` at the beginning of a line and runs to the next marker or heading. A block holds one or more **turns**; a turn starts with `Expert:` or `Novice:` (the speaker, `role` `expert` or `novice`) or, without a speaker, is an `expert` turn (single-speaker lessons). Following lines without a speaker or marker continue the turn. Within a turn:

- `{cue}` is a boundary that synchronises the component's `cues(k)` (§5.3, §8.4);
- `{mark:…}` is an emphasis mark (§8.5) and also a boundary;
- `{display|reading}` is a reading (§8.3);
- `{note:…}` is a stage direction (below).

Boundaries are listed in order across the turns of a step (`bounds`); they correspond one to one with the audio's cue times (§5.3). The display text of a turn is its text with boundaries, notes and the reading part of readings removed; `ttsParts` are the spoken pieces between boundaries with readings applied (§5.4). Every step of a slide, from 0 to `concl`, SHOULD have a block.

**Stage directions.** `{note:<text>}` inside a turn is a direction for the presenter (e.g. `{note:ask for a show of hands}`), not narration. `<text>` runs to the first `}` and MUST NOT contain `{` or `}`. A note is removed from the display text, captions, `ttsParts` and `inputHash` (§5.4), so it is never spoken and editing it never makes audio stale; it is not a boundary. Players SHOULD show notes in the presenter's view at their place in the turn, and MUST NOT show them on the stage, in captions, in video or in print. Producers keep notes in the archive layer only (the runtime narration may omit them). Parentheses in narration are ordinary text and are spoken.

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

### 8.4 Component contract

`steps`, `props`, `mount(ctx)`, `duration(k)`, `cues(k)`, `render(k, t, ctx)`; `render` gives the same output for the same *(k, t)*; colors only through theme CSS variables. The runtime calls `mount` only after the stage has been laid out (the component has its final, non-zero size) and the web fonts in use have loaded, so that a lesson started in a hidden or not yet laid-out context (a hidden frame, a background tab, before printing) renders the same as one started visibly; seeks requested before that are applied after mounting. A component MAY let the viewer interact with it (rotate a model, drag a value) during a step; that state is not part of *(i, k, t)*: entering any step (including the same one again) restores the rendering `render(k, t)` gives, and video, print and the presenter's view always show that rendering.

**Steps of a component.** A component has `steps` steps (its declared number, or the `steps` attribute, a non-negative integer, when present). The declared number depends only on the element's attributes and content, never on the context: players read it before `mount`, and it is the same for every viewer and language. The component starts at the slide step given by `data-from` (default 1). When the slide is at step *K*, the component's step is *k* = clamp(*K* − `from` + 1, 0, `steps`). When *K* − `from` + 1 lies outside 1…`steps`, the player renders the component at *(k, ∞)*. Within its range, *t* is the step's time; when the narration of step *K* has audio whose cue times *c₁…cₙ* (§5.3) match the component's `cues(k)` *d₁…dₙ* in number, the player maps *t* piecewise linearly so that each *cᵢ* falls on *dᵢ* (after *cₙ* the time runs on at rate 1); otherwise it passes *t* unchanged. `duration(k)` is in the component's time; the step's length in real time is the mapped end.

**Declarations in the component.** What a player needs to know about a component at play time is declared on the component class itself, in the file: `steps`, `props`, `variants`, `clock` (it shows elapsed time as content, Player P3) and `preview` (`"none"` when its later steps are answers). What a producer needs is declared in the part's catalogue entry and repeated on the class: `build` and `glyphs` (§6.2). A component release manifest (§6) repeats them for catalogues and tools; players read the class, never the manifest.

**Context passed to components.** `mount(ctx)` and `render(k, t, ctx)` receive one object. Its members are the interface between a player and a component; a component MUST NOT rely on anything else a player happens to expose.

| Member | Meaning |
|---|---|
| `mode` | `"talk"`, `"learn"` or `"video"` (Player P1) |
| `preview` | `true` when later steps are shown faintly (Player P1) |
| `slide` | the slide's key (§8.1), a string. A component finds its own slide element in the document if it needs it; the player passes no element |
| `instant` | `true` when the player renders final states without motion (jumping, printing, reduced motion) |
| `reset` | `true` once, on step entry, when the viewer had changed the component by hand (interaction state, above) |
| `entered` | `true` on the first render after the viewer entered this slide from another slide or by a jump (the moment viewer input is reset, Viewer input below); `false` otherwise. Renders for printing, export, thumbnails or video frames, and the render that returns to the viewer's position after them, are not entering: `entered` stays `false` and viewer input survives them |
| `lang` | the lesson's language (BCP 47, `deck-meta.lang`); always present |
| `slides` | the lesson's slides in order, `[{key, title, steps, concl}]`, read-only; `title` is the slide's title as players show it in slide lists (§8, the heading's `data-title`, else the heading's text); `steps` is the slide's largest numbered step key (0 when it has none; `concl` is not counted); `concl` is `true` when the slide has a conclusion step |
| `go(slideKey, stepKey?)` | asks the player to move there on the viewer's action (e.g. a table of contents); handled as a link to that slide (§9.1A), which a host may veto (Player P8) |
| `report(code, message)` | reports a problem; players make every report available to quality checks. A report does not by itself change what is shown: a part that cannot draw (code `error`, or a part that decides it cannot show its data) shows its final-state image or text equivalent (§6.1 Containment); a part that still draws (e.g. `size`, `theme`, or `data` for dropped rendered markup, §6.2) keeps drawing. `code` is one of `data` (data does not fit its shape), `attr` (an attribute value the part does not know), `range` (a value outside what the part can show), `size` (too much to fit), `layout` (no room at the laid-out size), `theme` (theme colours the part needs are too close to tell apart), `error` (a contained exception, §6.1); quality checks treat any other code as `error`. `message` is for people and starts with `[<part name>]` |
| `visited(slideKey)` | whether the viewer has shown that slide in this viewing (`true`/`false`); viewer state, never written into the file |
| `extend(seconds)` | viewer input only: extend or shorten the live running time of the current step; returns the total extension (Viewer input, below) |
| `live?.poll(id)` | under the `live` extension only: the revealed counts of a poll, `number[]` or `null` ([extensions/live.md](extensions/live.md) §2.5) |

`ctx.deck`, which the bundled player of current drafts also passes, is that player's internal object and not part of the interface.

**Layout.** A component MAY define `layout(ctx)`. The player calls it when the stage's laid-out size changes (scaling the whole stage by a transform, which does not change the stage's 1280×720 coordinates, is not a change of size), when fonts in use have finished loading, each time the component's slide becomes the current slide, and when the document becomes visible after being hidden; it passes the same context as `render`, with `instant` `true` and `entered` `false`, and then renders the component again at the current position; a component measures its text there, never by listening to the player's own events. Players MAY call `layout` at other times too (e.g. on every window resize); a call at an unchanged size MUST be harmless, and a part SHOULD do nothing then.

**Answers under preview.** When a player previews later steps faintly (Player P1), a component SHOULD draw the content of its later steps faintly, at `--preview-opacity` (below), and keep its controls inert for them, unless its later steps reveal an answer the audience should work out first (a prediction's answer, the digits of a computation); such a component declares `preview: "none"` on itself (Declarations in the component, below) and shows nothing ahead. Authors MAY mark any element of a slide `data-preview="none"` for the same effect (e.g. the answer of an exercise). Such an element, and a component that declares `preview: "none"`, stays hidden for its later steps even when an ancestor is shown faintly.

**Theme colours.** Colour carries meaning in Egatari: the roles below say what a colour means, and themes choose only what each role looks like. Components MUST use colours only through these CSS custom properties; slides SHOULD (an author MAY use other colours, and producers then report it, but the document stays valid). Every theme keeps their meaning: `--fg` body text; `--bg` the background; `--emph` conclusions and problems; `--term` terms and side notes; `--accent2` a second accent (contrasts, objections); `--muted` known results and secondary text; `--line` decoration only, never the only carrier of information. Also in the vocabulary: `--term-tint` and `--emph-tint`, light fills behind `--term` and `--emph` content; `--series-1` … `--series-4`, colours for data series in order (a theme MAY map them to the roles above); and the font families `--font-sans` (body), `--font-mincho` (Mincho, e.g. classical Chinese) and `--font-cap` (captions; falls back to `--font-sans`). One non-colour property belongs to the same vocabulary: `--preview-opacity`, the opacity of later steps shown faintly (Player P1; default 0.45 when the theme does not set it); components read it rather than using a number of their own. Themes MAY add properties; components MUST NOT depend on them.

**Viewer input.** A component MAY accept values from the viewer during a step (a count typed or stepped with +1/−1, a number changed to see the result move): from the presenter on the stage or from the presenter's view, or from a learner studying alone. Such values are viewer state: they are outside *(i, k, t)* and, unlike the interaction state above, **persist while the viewer stays on the same slide** (moving forward or back between its steps), so that a count entered at one step can be compared with an answer revealed at a later step. They are reset to the author's values when the slide is entered from another slide or by a jump (link, slide list, page number) — the render with `ctx.entered` — and only then: `ctx.reset` on a step entry restores the component's interaction state (an open card, a rotated view) but MUST NOT clear viewer input, and they never change `steps`, `duration(k)`, `cues(k)` or the meaning of colors, and video, print and the presenter's script use the values the author wrote. A component with viewer input MAY let the viewer extend or shorten the running time of the current step (e.g. a countdown timer's +1 min / −1 min): it asks the player through `ctx.extend(seconds)`, which returns the step's total extension so far in seconds (`ctx.extend(0)` only reads it), and the player keeps advancing that step's live clock past `duration(k)` by the amount asked (or ends it earlier), as viewer state that persists like other input: the player keeps the step's total extension through `ctx.reset` and clears it only when the slide is entered from elsewhere or by a jump (the render with `ctx.entered`). `duration(k)`, the timeline, video and print are unaffected and use the author's durations. A player that offers the presenter's view SHOULD forward the presenter's input to the stage and show the same values in the presenter's view, and MUST NOT accept input commands in video mode. A component that shows such values re-renders when they change (including counts arriving from `ctx.live`). Inside a component's input field, the player MUST NOT act on the keys the field uses (arrows, Space, digits typed into it); digit keys are never assigned to component input, because digits followed by Enter move between pages. Where a lesson carries the `live` extension, a component MAY show the aggregated counts of a poll it is bound to, read from `ctx.live` (`null` without `live`), under the rules of that extension; such counts are viewer state too.

**Component sounds.** A component MAY declare sound events for step *k* through `events(k)` → `[{t, sound, …}]` (seconds within the step). It never produces audio itself. The player synthesizes the sounds with the Web Audio API from a small fixed set (no files, no network): `bell` with `count` 1–3 (rings about 0.6 s apart), `chime`, and `note` with `pitch` (a MIDI number or a name such as `"C4"`), `dur` (seconds) and `vel` (0–1); several `note` events at the same *t* form a chord. A `note` MAY last beyond the end of its step: on a forward crossing into the next step in live playback and in video it keeps sounding for its `dur`; going back, jumping or seeking stops it. Tempo is the component's own: it converts note values to seconds and reports durations through `duration(k)`. Unknown sounds are ignored. During playback in `talk` and `learn` the player sounds an event only when *t* crosses its time moving forward, never when going back, jumping, seeking, in the presenter's view or in print, and it offers one setting that mutes all component sounds. Video export renders the same events into the audio track at their times, so the output stays a function of *(i, k, t)*. When the viewer extends the step (`ctx.extend`), the live player re-times the step's events by the extension; video uses the author's times. Sounds MUST NOT be the only carrier of information (a timer that rings also shows the time). The rule that audio starts only after a user gesture (Player P3) applies; the presenter's step key is such a gesture.

**Presentation variants.** A component MAY offer several ways of showing the same content (variants: how things appear within a step and where the eye is led), each with a name declared on the component (`variants`, Declarations in the component, above); the first is its default. A component carries the variant it shows as `variant="<name>"`; without it, or with a name it does not offer, it shows its default. Variants are chosen by name only: there is no seed and no computed choice. A variant MUST NOT change `steps`, `duration(k)`, `cues(k)`, the content of the final state (text, numbers, positions, the meaning of colors) or the colors, and MUST NOT move more than the default; narration, captions, video timing, print and the presenter's view are therefore the same for every variant. Producers MAY write variant names into the source when a lesson is made (so that lessons do not all look alike, and so that the same component looks the same throughout one lesson); editors preserve them.

### 8.5 Emphasis marks (`{mark}`)

A mark points at part of the slide while the narration names it. Marks are part of the position: at *(i, k, t)* the visible marks are a function of the step's marks and *t*.

- **Syntax.** `{mark:ID}`, `{mark:ID|effect}`, `{mark:ID|effect|hold=s}`, and `{mark:clear}` (from that point, removes the step's marks).
- **Effects.** `underline` (default), `circle`, `box`, `spot` (everything except the target dimmed), `laser` (a point of light that stays briefly). The effect names are the vocabulary; how each is drawn is the player's, in `--emph` over `--bg`.
- **Targets.** An element of the slide with `id="ID"` or `data-mark="ID"` (use `data-mark` when the same target name occurs on several slides), or a part of math marked with `\htmlId{ID}{…}` or `\htmlData{mark=ID}{…}`.
- **Timing.** A mark starts at its boundary's cue time plus `lead` (§5.5) when the step's audio is synchronised (§5.3); otherwise the marks start one after another every `gap` = 0.9 s from the end of the step's motion. A mark takes `draw` = 0.5 s to appear, lasts until the end of the step or for `hold` seconds (`laser`: 1.5 s by default), and fades over 0.3 s. At most one `spot` and one `laser` are shown at a time. At *(i, k, ∞)* only the marks still shown at the step's end are visible; each step's marks are its own.
- Marks are not printed. In a step without audio, `max(hold, marksEnd + pad_after)` replaces `hold` in §5.5.
- In the runtime layer, `deck-marks` (§4) lists each step's boundaries.

### 8.6 Morphs (`data-morph`)

A morph moves elements that two consecutive slides share from their place on the earlier slide to their place on the later one, instead of a cross-fade.

- `data-morph` on a slide asks for a morph when it is entered from the previous slide; `data-morph="<slide key>"`, when it is entered from that slide.
- Elements are paired by equal `data-id` on the two slides (in math, `\morph{ID}{…}`); an id is used once per slide (later ones are ignored; when nested, only the outer one moves). Only elements visible at step 0 of the later slide move; elements inside SVG are not paired.
- The morph happens at step 0 when the slide is entered from its source, lasts 0.9 s, and does not happen when going back, jumping, printing or under `prefers-reduced-motion` (the slide is then shown at its final state). Unpaired elements of the earlier slide disappear during the first 45 % of the morph and unpaired elements of the later slide appear during the last 55 %.
- Positions are measured on the stage (1280×720) from the earlier slide's final state and the later slide's step 0, so the result does not depend on the order of calls.

## 9. Playing a lesson

How players play a lesson — playback, following links, learner data, tracking adapters, source extraction and embedding — is specified in Egatari Player 1.0 (Player P3–P8). This section keeps what the file itself guarantees to every player.

### 9.1A Links to slides

- A link to a slide is an ordinary anchor whose fragment is a slide id: `<a href="#s-k3f9q2">`; `#<slide id>:<stepKey>` addresses a step. Step links in the article carry the same fragment and `data-egatari-step` (§9C.6). Such links contain no script and are allowed in Core documents. The same fragments in the file's URL select the starting position.
- How players follow such links: Player P4.

### 9.1B Learner data

Notes, ink, bookmarks, highlights and other data a learner creates MUST NOT be written into the Egatari file. Players MAY keep them in local storage keyed by `docId` (hosts MAY keep them per learner).

Anchors, kinds and export of learner data: Player P5.

### 9.2 Completion

`deck-meta.completion` carries the completion rule, so that play-only files can be tracked: by default "every step visited"; `metadata.completion` MAY set `{"visitedFraction": number}` or `{"reachedEnd": true}`. A step is visited when it is played on a stage or read in a text pane (Player P6); adding `"played": true` counts only steps played on a stage (e.g. `{"visitedFraction": 0.9, "played": true}`). `deck-meta.tracking` lists the tracking adapters the bundled player implements (Player P6). The SCORM 1.2 binding ([`bindings/scorm12.md`](bindings/scorm12.md)) is outside 1.0.

## 9A. Extensions

Platforms may need information that Egatari does not define (e.g. questions to ask the learner at a step, grouping of steps into chapters). Such information is carried as **extensions** without changing Egatari itself.

- **Index:** `extensions` is an object whose keys are extension names (`^[a-z][a-z0-9]{0,31}$` — no hyphen, so that `x-<name>-<field>` is unambiguous) and whose values are objects with at least `v` (integer version of that extension; producers write `1` unless the extension's definition says otherwise). Data addressed to a step uses step keys.
- **Source:** in the slide source, extension data MAY be written as attributes `data-x-<name>-<field>` on slides and elements, and in `narration.md` as extension lines (§8.2). Producers MAY fold them into `extensions.<name>` at export.
- Extensions are optional layers on Egatari: conformance to this specification never requires implementing one, and each extension is versioned and defined on its own (registry: [extensions.md](extensions.md)). A lesson that uses an extension plays the same in a player that ignores it, apart from what the extension adds.
- Readers MUST ignore extensions they do not implement. Editors MUST preserve them byte-for-byte through tier A edits — except entries derived from extension lines (§8.2) that the edit changed — and preserve their content through tier B and C edits, except entries whose step or slide no longer exists, which they MAY drop with a warning.
- An extension MUST NOT change how a player that ignores it renders or times the lesson. Information without which the lesson cannot be played correctly is not an extension; it needs a new feature in `requires` and a new version of this specification.
- Extension data in a portable file is public to anyone holding the file (§3.7).
- **Versions of an extension.** Within one `v`, a definition may only add optional members that readers of that version ignore; any other change is a new `v`. A reader that implements an extension up to version *n* and finds a higher `v` MUST treat the extension as not implemented (ignore it and preserve it as above), unless the definition states that version is compatible with *n*.
- Extension names are registered in [`extensions.md`](extensions.md), which also says how an extension is proposed, reviewed and marked `draft`, `candidate`, `stable` or `withdrawn`. Ordinary names are first-come. An extension that connects to the network (§4.2) or sends data off the device is registered only after the editors have reviewed its definition (§11). A withdrawn name is never reused.
- Something that is not optional in this sense — information without which a lesson cannot be played correctly, or a change to the core — is a **feature** listed in `requires` (§3.5, e.g. `article-v1`, `signatures-v1`) and comes only with a version of this specification, not through the registry.

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

> Draft. Motivation: one file as *paper + code + talk* ("arXiv + GitHub + conference"). Not part of 1.0 conformance until this note is removed. Open questions: Appendix A, issue 7.

A lesson MAY carry an **article**: long-form text (a paper, a textbook chapter) that is the *read face* of the same content whose *talk face* is the slides and narration (§1.0). Neither face is the master; they are linked both ways (§9C.5).

`article-v1` is ignorable for playing: a player that does not implement it still plays the lesson, and shows the narration in its text pane and readable layer as for a lesson without an article (§9C.10). Producers MUST NOT list `article-v1` in `requires` (§3.5). Editors that do not implement it are limited to tier A edits (§7.2).

### 9C.1 Source and placement

- The article's source is one or more archive files written in **Egatari Text** (§9C.2). `index.article` is `{path, references?}` or `{chapters, references?}`, with exactly one of `path` and `chapters`:
  - `path` is `"article.md"`, at the archive root: the article is one file (a paper, or one chapter of a larger work, §9C.1A);
  - `chapters` is a non-empty array of distinct archive paths of the form `article/<name>.md` (e.g. `["article/03.md", "article/04.md"]`), in reading order: the article is a **book** of several chapters, one file each.

  `references`, when the article cites anything, is the archive path of its bibliography, normally `"references.json"` (§9C.4); one bibliography serves every chapter. All of these MUST be present in `files`. In this section, an **article file** is `article.md` or a chapter file. A lesson without `index.article` has no article; an article file without `index.article` is an ordinary archive file and producers SHOULD warn.
- The dependency closure (§3.3) includes every article file, the references file and every image the article uses. Image paths in article files are archive paths (§3.3); they MUST NOT be URLs or point outside the archive. Producers resolve them at build time (§9C.6); players never read archive paths.
- Producers import TeX (e.g. with pandoc or MyST's TeX reader), Word (e.g. with pandoc) and other Markdown into Egatari Text; conversion fidelity is the producer's responsibility, and a practical path is a converter's draft corrected by a person or an AI (§9C.14). Converters are used only when importing and are not part of a lesson. After import, the Egatari source is the original (§1.0): later edits are made to the article files, not to the TeX or Word file, which MAY be kept as an attachment (`role: source`, §3.8). BibTeX is converted to CSL-JSON when importing and MAY likewise be kept as an attachment. When TeX is imported (informative): each `\chapter` of the book and report classes becomes a chapter file with its number in `chapter`; `\section`, `\subsection` and `\subsubsection` become level 2, 3 and 4 headings; the article class (no `\chapter`) gives one `article.md` without a chapter number; `\part` has no counterpart (use a series, §9C.1A), and `\paragraph` becomes a paragraph that starts with a strong phrase.
- Changing the article (an article file, the references file or an article image) re-renders `#egatari-article` (§9C.6) only. It is a tier B edit (§7.2) in which no slide is rebuilt: every byte of the runtime layer outside `#egatari-article`, and outside the affected tier A regions, MUST stay identical.

### 9C.1A Chapters and series

- **Chapter number.** An article file MAY state a chapter number in its front matter (`chapter`, a positive integer, §9C.2). Every chapter file listed in `chapters` MUST state its `chapter` and its `title` (the chapter's title; the book's title is `metadata.title`), with chapter numbers strictly increasing in reading order. They need not start at 1: a lesson may carry chapters 3 to 5 of a book. A single `article.md` with a chapter number is one chapter of a larger work, typically one lesson of a course.
- **Numbering.** Producers number headings, figures, tables and labelled equations (§9C.6). With a chapter number *c*, every number starts with it: sections *c*.1, *c*.1.1 and *c*.1.1.1 for levels 2 to 4; figures, tables and equations *c*.1, *c*.2, … counted per kind within the chapter (e.g. "図 4.1", "Figure 4.1", "式 (4.1)"), as TeX's book and report classes do. Without a chapter number, numbers run through the article (sections 1, 1.1, …; "図 1"), as TeX's article class does. Front matter `numbering: false` turns off the section numbers of that file; figures, tables and labelled equations stay numbered. Section and figure numbers are the stable way to point at a place in the text; page numbers are not (Player P2).
- **Series.** `metadata.series` = `{id, title, part?}` places the lesson in a series published as one course or book: `id` is the same string in every lesson of the series (e.g. a URL or a random identifier; never derived from a person's name), `title` the series' title, `part` a positive integer giving the lesson's place in it (e.g. the week). The chapter number and `part` are independent: a lesson for week 5 may carry chapter 4. A reference to another lesson of the series is written as text (e.g. "第 3 章 3.2 節"), not as a link into another file. Players MUST NOT fetch other lessons of a series by themselves; a host or a viewer application MAY offer to open them when they are in the same collection (§10.1, Player P4.2).
- **Lessons and books (informative).** The usual form of a course is one lesson per session, each carrying its chapter as `article.md` with `chapter`, so that the slides and the chapter cover the same ground and each file stays small. A producer MAY build a book from such lessons: one lesson whose `chapters` lists their chapter files in order, with or without their slides. It then relabels figure, table and equation labels that collide, together with every cross-reference to them; keeps section and slide ids, regenerating one only when it collides (§8.1); merges the bibliographies, keeping an entry once when the key and the content are the same and putting the same key with different content to the author; and carries `articleLinks` (§9C.7) over unchanged. Carrying the whole textbook in every weekly lesson is allowed but not recommended: the copies drift apart, and most sections are then linked to no slide (§9C.8 warns).

### 9C.2 Egatari Text

**Egatari Text** is a subset of MyST Markdown, written down in this section and frozen with this specification. It is versioned with this specification and does not follow changes to upstream MyST (whose specification states that it may change without notice). A document in Egatari Text is valid MyST, so that MyST tools can read it, and it is also readable as CommonMark: every Egatari construct degrades to visible text or an ordinary link in other Markdown tools. This version is **Egatari Text 1**; a later version that adds constructs will add a feature identifier (e.g. `article-v2`).

The file is UTF-8 without BOM, in Unicode Normalization Form C, with LF line endings. It MAY begin with a YAML front matter block (`---` … `---`) containing only these members: `title` (string; default `metadata.title`), `subtitle` (string), `lang` (BCP 47; if present it MUST equal `metadata.lang`), `bibliography` (if present it MUST equal `index.article.references`), `writing-mode` (`horizontal-tb`, the default, or `vertical-rl`, as in CSS), `chapter` (a positive integer, §9C.1A), `numbering` (boolean, default `true`, §9C.1A). The article's language is `metadata.lang`; `lang`, `writing-mode` and `bibliography` MUST be the same in every chapter file. With `vertical-rl` the article is set in vertical writing (e.g. for Japanese language arts) and its pages progress from right to left, as EPUB's `page-progression-direction="rtl"`; figures, tables, display math and slides placed in the article stay horizontal blocks.

The constructs of Egatari Text 1 are exactly these. The node types are those of mdast and the MyST specification, plus one Egatari node, so that a conforming parser can be written without MyST's own tools. The tree is the one a MyST parser gives after its structural steps (directives and roles lifted into their nodes, targets attached, a figure's paragraphs split into caption and legend) and before resolution (links to `crossReference`, roles to `egatariStep`) and numbering, which are the producer's (§9C.6). Conformance fixtures (input and expected tree) are in [`fixtures/article-text/`](fixtures/article-text/).

| Construct | Syntax | Node type(s) | Notes |
|---|---|---|---|
| Paragraphs, line breaks | CommonMark | `paragraph`, `text`, `break` | soft line breaks are text |
| Headings | ATX `##`, `###`, `####` (setext `---` for level 2 is equivalent) | `heading` (`depth` 2–4) | `#` (level 1) MUST NOT be used: the title comes from the front matter. Level 5–6 MUST NOT be used |
| Emphasis, strong, code span | `*…*`, `**…**`, `` `…` `` | `emphasis`, `strong`, `inlineCode` | |
| Lists | CommonMark bullet and ordered lists | `list` (`ordered`, `start`, `spread`), `listItem` | |
| Block quote | `>` | `blockquote` | |
| Thematic break | `---`, `***` | `thematicBreak` | |
| Code block | fenced (backtick or tilde) or indented; info string = language | `code` (`lang`, `value`) | never executed. An info string starting with `{` is a directive and outside the subset |
| Links | `[text](url "title")`, `<url>`, reference links | `link` | a reference link is resolved by the parser into a `link`, and its definition leaves no node. External URLs follow §11 when followed. A link whose URL starts with `#` is a cross-reference (below) |
| Inline image | `![alt](path)` | `image` | `path` an archive path (§9C.1). Images that need a number or caption use a figure |
| Inline math | `$…$` | `inlineMath` | TeX math in the subset KaTeX supports, as on slides |
| Display math | `$$…$$` on its own lines, optionally followed on the closing line by `(label)`; or preceded by a `(label)=` line | `math` (`identifier`, `label`) | numbered only when labelled (§9C.6) |
| Target | a line `(label)=` directly before a heading, display math, a figure or a table | attaches `label` and `identifier` to the next node; no node of its own remains | labels: §9C.3 |
| Figure | colon fence `:::{figure} <path>` with options `:label: <label>` and `:alt: <text>`; the first paragraph of the body is the caption, further paragraphs the legend | `container` (`kind: "figure"`, `identifier`) with `image`, `caption`, `legend` | `:alt:` is REQUIRED for a figure whose caption does not describe the image. Numbered when it has a name |
| Table | GFM pipe table; optionally wrapped in `:::{table} <caption>` with `:label: <label>` | `table`, `tableRow`, `tableCell` (`header`, `align`); `container` (`kind: "table"`) with `caption` | cells hold inline content only. Numbered when wrapped and named |
| Cross-reference | `[](#label)` (empty text); `[text](#label)` | `link` resolved to `crossReference` (`identifier`, `kind`) | with empty text, the producer fills in the number or title (§9C.6); other Markdown tools still see a link. With text, the text is shown as written |
| Citation | `[@key]`, `[@key, <locator>]`, several separated by `;` (`[@a; @b, p. 3]`) | `citeGroup` (`kind: "parenthetical"`) with `cite` (`identifier`, `label`; the locator as `suffix`) | keys and locators: §9C.4 |
| Step link | `` {step}`<slideKey>:<stepKey>` `` or `` {step}`<text> <<slideKey>:<stepKey>>` `` | `mystRole` (`name: "step"`) resolved to `egatariStep` (`slideKey`, `stepKey`, children = the text, if any) | the only Egatari role. Target: §9C.5 |
| Escapes | CommonMark backslash escapes and entity references | `text` | e.g. `\$`, `\@`, `\[` |

Everything else is **outside the subset**: raw HTML (blocks and inline), every other directive and role (admonitions, `{code-cell}`, `{list-table}`, `{numref}`, `{eq}`, `{cite:p}`, `{math}`, `{glossary}`, `{include}`, …), backtick-fenced directives, footnotes, MyST comments (a line starting with `%`), block breaks (`+++`), substitutions (`{{ … }}`), bare-word citations (`@key` outside brackets), GFM autolinks of bare URLs, strikethrough, task lists, definition lists, and any front matter member not listed above. A producer that reads `article.md` MUST reject a construct outside the subset, or convert it into the subset and tell the author what it converted; it MUST NOT pass it into the runtime layer. Informative conversions: `{numref}`/`{ref}`/`{eq}` → `[](#label)`; `{cite:p}` → `[@key]`; `{math}` role and directive → `$…$`, `$$…$$`; backtick-fenced `{figure}` → colon fence; `{list-table}` → pipe table; admonitions → block quote with a strong first word. Because a MyST parser treats a line starting with `%` as a comment and `@word` as a citation, authors escape them (`\%`, `\@`) when they mean the characters; producers MUST report such lines instead of silently dropping text.

### 9C.3 Identifiers

- **Sections.** A section is the content from a level-2 heading up to the next level-2 heading or the end of the article. Every level-2 heading MUST carry a target `(sec-xxxxxx)=` on the line before it, where the id is `sec-` followed by 6 random base32 characters (`[a-z2-7]`), with the same rules as slide ids (§8.1): never derived from the heading, never changed when the heading changes. Level-3 and level-4 headings MAY carry targets of the same form.
- **Section ids are assigned by tools, never by authors.** Producers and editors add a missing section id when the article is saved or built, and SHOULD write it back into `article.md`; AI authors MUST NOT be asked to write them (§9C.14; the same rule as slide ids). A build MUST NOT export an article with a level-2 heading without an id.
- **Figures, tables, equations.** Their labels are written by the author (person or AI), since the text refers to them; they SHOULD be readable and start with `fig-`, `tbl-` or `eq-` (e.g. `fig-bitmap`).
- Every label matches the id pattern of §8.1 and is unique in the whole document, across all chapter files and including against slide ids and every other `id` in the runtime layer. Labels other than section ids MUST NOT start with `sec-`, `s-`, `ref-` or `egatari-` (`ref-` is used for the reference list, §9C.4).

### 9C.4 Citations

- The bibliography is a CSL-JSON array (the format of citeproc, pandoc, Zotero and Crossref) at `index.article.references`. Each item's `id` is unique and is the citation key. Keys match `^[A-Za-z0-9_]+([.:-][A-Za-z0-9_]+)*$` and are at most 64 characters.
- **Locators.** A citation MAY give a locator after a comma: `[@key, p. 3]`, `[@key, 3 頁]`, `[@key, ch. 2]`. The locator is free text, parsed as the `suffix` of the `cite` node (as myst-parser does); producers render it with the citation as the style says (e.g. "(Shannon, 1948, p. 3)") and do not interpret it. Text before a key (`[see @key]`) is outside Egatari Text 1.
- Producers resolve citations at build time into rendered in-text citations and reference lists (§9C.6); players need no bibliography engine. The presentation follows `metadata.citations` = `{style?, list?}`, chosen by the author:
  - `style`: the id of a style in the Citation Style Language styles repository (e.g. `apa`, `ieee`, `sist02`). Producers MUST offer at least one author–date and one numeric style. Without `style`, the producer uses an author–date style of its choice. A producer that does not have the named style uses its default, warns, and keeps `style` unchanged. A lesson imported from TeX SHOULD get the style that matches its `\bibliographystyle`.
  - `list`: `end` (one reference list at the end of the article; the default), `chapter` (a list at the end of each chapter, of the works cited in it; only with `chapters`) or `none`.

  A list holds only works cited, in the order the style gives. The member `placement` is reserved for citations on slides and in narration (Appendix A, issue 7).
- Producers SHOULD warn about entries that are never cited.

### 9C.5 Links between the faces

- **Article → talk.** A step link `` {step}`s-k3f9q2:3` `` points to step 3 of slide `s-k3f9q2`. The slide key is a slide id (§8.1), and the step MUST exist on that slide (`0`…`n` or `concl`). Both parts MUST be written (`:0` for the start of a slide). A step link without text is given generated text naming the slide (e.g. its title and the step).
- **Talk → article.** A slide MAY name the article sections it presents, in order of relevance: `<section class="slide" data-article="sec-k2m4q7 sec-p9x3ab">` (a space-separated list of section ids).
- **Linked pairs.** A slide and a section are **linked** when the slide's `data-article` names the section, or when the section's source contains a step link to that slide. Linked pairs are what staleness tracks (§9C.7).
- **Section of a slide; slide of a section.** For synchronization (Player P2), the section of a slide is the first id in its `data-article`, otherwise the first section (in article order) containing a step link to it; the slide of a section is the target of the first step link in the section, otherwise the first slide (in deck order) whose `data-article` names it. A slide or section without one leaves the other pane where it is.
- Players SHOULD offer "watch this part" on a section linked to slides, and "read more" on a slide that has a section. Producers MAY render "watch this part" links into the article (as step links to step 0); players MUST NOT depend on them.
- Following a step link moves the position as a link to a step does (§9.1A). In a layout without a stage (`flow`, `pages`) that shows the article, a player SHOULD show that step's stage without leaving the article (e.g. in an overlay or inline), and return to the same article position afterwards.

### 9C.6 Runtime form

- The runtime layer contains the article as HTML, built by the producer from `article.md`: one `<article id="egatari-article" lang="…">` as the last child of `<section id="egatari-readable">` (§2.1), so that a player that does not implement `article-v1` hides it together with the readable layer, and a reader without script sees it. It carries no `data-slide-key`. HTML is the canonical reading form, as on arXiv's HTML pages.
- Structure: an optional `<header>` with `<h1>` (the title; for a numbered chapter, its number and title in the words of the lesson language, e.g. "第 4 章 ハフマン符号", "Chapter 4 Huffman codes") and the subtitle; then each section as `<section id="<section id>" data-section-id="<section id>">` beginning with its `<h2>`; content before the first level-2 heading precedes the first section; the reference list, if any, as a final `<section data-egatari-references>` whose items are `<li id="ref-<key>">`. With `chapters`, the `<header>` holds the book's title as `<p class="egatari-book-title">` and each chapter is a `<section data-egatari-chapter="<number>">` holding its own `<h1>` as above, its sections and, with `list: "chapter"`, its own reference list, whose items are `<li id="ref-<number>-<key>">`. Heading levels are thus the same in a single file and in a book.
- **Numbers.** Producers number headings (unless `numbering: false`), figures, tables and labelled equations as §9C.1A says, and write the numbers into the HTML: before heading text, in captions, after display equations, and as the text of empty-text cross-references (`<a href="#<label>" class="egatari-xref">`), using the words of the lesson language (e.g. "図 1", "Figure 4.1", "式 (2)"). An empty-text cross-reference to a section shows its number in those words (e.g. "4.1 節", "Section 4.1"), or its heading text when the section is not numbered.
- **Math** is rendered at build time, as on slides; producers SHOULD include MathML with the TeX source as an annotation (`<annotation encoding="application/x-tex">`), for accessibility and export (§9C.13).
- **Images** become `data:` URIs or inline SVG, so that they show without script, or `egatari:<blobId>` references (§4), which only a player resolves. SVG follows the profile rules of §6.
- **Citations** are `<a class="egatari-cite" href="#ref-<key>">` (`#ref-<number>-<key>` with `list: "chapter"`) with the rendered citation as text; with `list: "none"` they are `<span class="egatari-cite">`.
- **Step links** are `<a data-egatari-step="<slideKey>:<stepKey>" href="#<slideKey>:<stepKey>">`. The `href` is the step fragment of §9.1A, so that a player that knows step links but not articles still navigates; `data-egatari-step` marks it for players that implement `article-v1`.
- The article contains no script, no event-handler attributes and no embedding elements; it never changes the profile (§6). Interactive figures (components) are not part of `article-v1`; an article shows them by a step link or a still image.

### 9C.7 Staleness

- When a link between a slide and a section (§9C.5) is made or confirmed, the producer records two hashes in `index.articleLinks[slideKey][sectionId]` = `{article, slide}` (lowercase hex SHA-256 of UTF-8):
  - `article` — of the section's **source text**: the lines of the article file that holds the section, from the section's heading line up to, not including, the next heading of the same or higher level (or the end of the file), without the target line `(…)=` that belongs to that next heading; normalized to NFC and LF and trimmed of leading and trailing whitespace. Step links, citations and cross-references count as written in the source. Rendered text MUST NOT be used: renumbering a figure elsewhere would otherwise make every section stale.
  - `slide` — of `JSON.stringify([deckText, narrationText])`, where `deckText` is the slide's element in `deck.html` from `<section` to its matching `</section>` and `narrationText` is the slide's block in `narration.md` from its heading line up to the next `## ` heading (`""` if none), each normalized as above.
- An editor compares the recorded hashes with the current ones. When `article` differs, it shows the linked slides as possibly out of date; when `slide` differs, it shows the linked section as possibly out of date, as for narration audio (§5.4). A linked pair without a record is shown as unconfirmed. Confirming (the author says the two still agree) records both current hashes. Editors MUST NOT change either text automatically to resolve staleness.
- Records of pairs that are no longer linked are removed when the lesson is built. Staleness is for editors only; players ignore `articleLinks`.
- `articleLinks` is carried in `egatari.json` with the same value (§3.3), so that an unpacked folder keeps it.

### 9C.8 Validation

Producers MUST report as errors, and MUST NOT export an article that has any of them:

1. a step link to a slide that does not exist, to a slide key that is not a slide id, or to a step the slide does not have;
2. a citation key with no entry in the references file (or a citation when there is no references file);
3. a cross-reference to a label that does not exist;
4. a section id in a slide's `data-article` that is not a section of the article;
5. a construct outside Egatari Text (§9C.2) that was not converted, an invalid or duplicate label (§9C.3), or a level-2 heading without a section id;
6. an image path that is not in the archive;
7. an `index.article` with both or neither of `path` and `chapters`; a chapter file without `chapter` or `title`; chapter numbers that do not increase; `lang`, `writing-mode` or `bibliography` that differ between chapter files; `list: "chapter"` without `chapters`.

Producers SHOULD warn about uncited references, figures without alt text, sections linked to no slide, and a citation style they do not have (§9C.4).

### 9C.9 Narration and article

The narration and the article are independent texts written for different purposes (speech and reading); neither is generated from the other at build or run time, and neither is checked into agreement with the other automatically. Numbers that appear in both (results, counts, values in figures) SHOULD be produced from the same data files in the archive (e.g. the CSV a component draws), not typed twice. Quality checks MAY compare the narration of linked slides with the linked section (e.g. numbers, terms, the order of claims) and report differences; they MUST NOT rewrite either text.

### 9C.10 Panes, pagination and players without article support

- When a lesson has an article, the text pane (Player P2) shows the article, not the narration. The narration remains in the readable layer and in `deck-narration`, and players MAY offer it as an alternative text.
- When the text pane is paginated, page breaks MUST NOT split a figure, a table or a display equation, and SHOULD NOT separate a heading from the text that follows it; a block taller than a page is scaled down to fit rather than split. Pagination stays outside the *(i, k, t)* determinism (§1.1, Player P2).
- A player that does not implement `article-v1` plays the lesson unchanged: it hides `#egatari-readable` (with the article in it) when it starts, its text pane shows the narration, and the readable layer still lists every step's narration (§2.1). Step links keep working as fragment links if such a player shows the article at all.
- Faces and modes: the article is the read face (§1.2 `faces`); `talk`, `learn` and `video` are unchanged. In `learn` mode a `split` layout shows the article beside the stage. Video export never includes the article.

### 9C.11 Attachments

See §3.8. An article commonly carries its typeset PDF (`pdf`), its TeX or Word source and BibTeX (`source`), and its code and data.

### 9C.12 Requirements summary

| Role | Requirements |
|---|---|
| Producer | §9C.1–§9C.9; writes `index.article`, `index.articleLinks` and `egatari.json` `articleLinks`; never lists `article-v1` in `requires` |
| Player implementing `article-v1` | shows `#egatari-article` in the text pane; §9C.5 navigation and synchronization; §9C.10 pagination |
| Player not implementing it | nothing beyond §2.1 and §9.1A |
| Editor implementing it | §9C.3 id assignment, §9C.7 staleness, §9C.8 validation; article edits as in §9C.1 |
| Editor not implementing it | tier A edits only on a lesson with `index.article`; preserves the article files, the references file, `index.article`, `index.articleLinks` and `#egatari-article` (§7.1, §7.2) |

### 9C.13 Exports (informative)

- **Print and PDF.** Printing the `pages` layout of the read face produces a PDF of the article (§1.0); it is an output, not a part of the lesson, and SHOULD NOT be attached (§3.8). Step links print as text naming the slide and step (e.g. "slide 4, step 3"). Producers MAY also typeset the article through MyST's LaTeX or Typst export; the result is likewise an output.
- **JATS.** For archiving and for journals and preprint servers, producers SHOULD offer an export to JATS (NISO Z39.96, version 1.3 or later). The subset maps as follows:

| Egatari Text | JATS |
|---|---|
| article, front matter `title` / `subtitle`, `metadata.lang` | `<article xml:lang>`; `<front><article-meta><title-group><article-title>` / `<subtitle>` |
| `metadata.creators`, `license`, `copyright` | `<contrib-group>`; `<permissions><copyright-statement>`, `<license>` |
| level-2 section with id; level-3/4 heading | `<sec id><title>`; nested `<sec>` |
| `paragraph`, `emphasis`, `strong`, `inlineCode` | `<p>`, `<italic>`, `<bold>`, `<monospace>` |
| `list` / `listItem` | `<list list-type="bullet\|order">` / `<list-item>` |
| `blockquote`, `code`, `thematicBreak`, `break` | `<disp-quote>`, `<code language>` (or `<preformat>`), `<hr/>`, `<break/>` |
| `link` (external) | `<ext-link ext-link-type="uri" xlink:href>` |
| `image` (inline) | `<inline-graphic xlink:href>` |
| `inlineMath` | `<inline-formula><alternatives><mml:math>…</mml:math><tex-math>` |
| `math` with label | `<disp-formula id><label>(n)</label><alternatives>…` |
| figure | `<fig id><label>Figure n</label><caption><p>…</p></caption><graphic xlink:href><alt-text>` |
| table | `<table-wrap id><label>Table n</label><caption>…</caption><table>` (XHTML table model) |
| `crossReference` | `<xref ref-type="sec\|fig\|table\|disp-formula" rid>` |
| `cite` | `<xref ref-type="bibr" rid="ref-<key>">`, locator as following text |
| references file | `<back><ref-list><ref id="ref-<key>"><element-citation publication-type>` (type from CSL `type`) |
| `egatariStep` | `<ext-link ext-link-type="egatari-step" xlink:href="#<slideKey>:<stepKey>">` (or its text alone when the export does not travel with the lesson) |

### 9C.14 Authoring by AI (informative)

Trials with six chat models (2026-10-24) found that models write valid Egatari Text, correct step links and correct citations, and fail mainly on length, on writing ids, and on link density. Producers that ask an AI to write or revise `article.md` SHOULD:

- ask for `article.md` (and `references.json` when sources are cited) **without section ids**: no `(sec-…)=` lines; tools add them afterwards (§9C.3). Figure, table and equation labels are written by the AI, since its text refers to them;
- state a length limit of the producer's choosing (e.g. 1,500–2,500 characters for a single lesson) and check it before accepting the result;
- ask for at most one step link per paragraph, placed where the slide shows something the text cannot;
- ask for cross-references (`[](#fig-…)`) instead of literal numbers such as "図 1" or "Figure 1", which go wrong when figures move;
- give the slide ids and step keys that exist, and check every link, citation and cross-reference with §9C.8 before accepting the result;
- mark AI-written sections in `metadata.authorship` (§3.6.1), keyed by section id, until a person has reviewed them.

**Book first.** A common order of work is source material → article → slides: an article-only lesson (§4) is a normal stage, not an incomplete one. When slides are made from an article, producers SHOULD ask for the slides of one section (or a few paragraphs) at a time, giving the AI that section's text; give the new slides ids themselves (§8.1); link each new slide to the section it came from (§9C.5) and record the pair as confirmed (§9C.7), so that later edits on either side are shown as possibly out of date. Narration is written for the new slides' steps; the article itself carries none (§4).

## 10. Conformance classes

| Class | Requirement summary |
|---|---|
| **Document — Core / Extended** | valid runtime layer; if portable, valid archive layer of that profile; readable layer (§2.1) |
| **Player — Core / Extended** | conforms to Egatari Player 1.0 (Player P9); resolves `egatari:` audio; Extended players run embedded component code |
| **Editor** | safe import (§11), tier A at least, §7, preserves unknown members and `docId` |
| **Producer** | writes conforming documents; §3.3 exclusions; §5 audio rules |
| **LMS Binding** | packages a document for a learning platform per a binding document (SCORM 1.2 in 1.0) |
| **Host** | a platform that accepts and plays Egatari files: §10.1 |

Conformance is tested with the fixtures in [`fixtures/`](fixtures/).

### 10.1 Host

A conforming host MUST:

1. Validate uploaded files on the server per §11 without executing them (limits, hashes, `requires`), and reject unsupported `requires` with a clear message. Hosts whose platform limits are lower than §11's recommendations MUST stream uploads rather than buffer them.
2. Play files through Player P8 in an iframe with `sandbox="allow-scripts"` and without `allow-same-origin`, and serve the file itself with a `Content-Security-Policy` that sandboxes it and forbids network access even when its URL is opened directly, e.g. `sandbox allow-scripts; default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' blob:; font-src data:`.
3. Store the original bytes unmodified and return them unchanged to users authorized to edit. It MAY serve learners a play-only derivative (§3.7), and MUST do so when extensions carry information to be withheld from learners.
4. Play files that carry no extensions for that host.
5. Record progress from the tracking and embedding events (Player P6, P8), keeping Egatari completion (`deck-meta.completion`) distinct from the host's own grading.
6. Never write learner data into files (§9.1B).

A host MAY supply its own controls and restrict navigation (§1.2), and MAY restrict the modes and faces it offers beyond `deck-meta.offer`; restrictions are enforced by the host's own frame and controls, never by the file. Conformance covers Egatari content only; other kinds of material a platform offers are out of scope.

## 11. Security considerations

- **Opening an Egatari file as a web page runs its scripts**, as with any HTML file. Being importable safely by an editor does not make arbitrary HTML trustworthy.
- **Links that leave the lesson** are navigation, not loading, and a phishing surface as in PDF files; players open them only as Player P4.2 requires.
- **The file itself forbids network access** through its policy (§4.2), so that the guarantee holds for every script in it, not only for a well-behaved player.
- **A conforming runtime makes no network requests.** The only way a lesson may connect is an optional extension (§9A) whose own definition allows it — today only [`live`](extensions/live.md), honoured only for the one endpoint and time window the author declared and visibly to the learner. Players, editors and hosts conform to Egatari without implementing any extension; a lesson without such an extension, or played by a player that ignores it, never connects.
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

1A. **Component host interface — specified in §6.1–§6.2 and §8.4 (2026-10-26); to do: conformance fixtures.** History: In the current draft, components register and draw through globals of the bundled player (`DECK.define`, the base class `DECK.MotionElement`, helpers such as `DECK.el`, `DECK.lerp`, `DECK.svgMath` (which renders math with KaTeX at run time), and a few reads of player state: `DECK.seek`, `DECK.slides`, `DECK.mode`, `DECK.componentErrors`). Before 1.0 the interface a player must provide, and what travels with the components, must be defined so that §4.1 holds for lessons with components. Direction under study: the base class and helpers ship as a versioned, hashed module of the component release, archived in the file like any component; the host only discovers the custom elements, calls `mount`, `duration`, `cues`, `events` and `render`, and passes the context above, with navigation and error reporting as context members instead of player globals.
1. **Blocker for 1.0:** §8 is now normative (2026-10-26); still open: component/theme dependency manifests and hash scope, schemas for every runtime block, archive↔runtime consistency rules.
2. Public component registry: direction — releases of a dedicated repository (`egatari/components`), each publishing a manifest of component names, versions and code hashes; proposals collected as issues. To settle: whether a Core document may use a component only from a published release, how old releases stay available so that earlier lessons remain editable (tier B) (withdrawn releases: §6), and naming rules for contributed components.
3. ~~Whether a lesson may embed a custom reference voice.~~ Closed (owner, 2026-10-28): it may not (§5, `recipe`); only the synthesized narration audio is carried.
4. Tolerances for loudness and cue timing across browsers.
5. File-picker availability on `file://`; download as the baseline save path.
6. `signatures-v1`: what is signed (index and runtime layer), interaction with tier A edits and derived lessons, key identity (e.g. did:web, GitHub keys, Sigstore, C2PA certificates), timestamps and long-term verification.
7. `article-v1` (§9C): TeX/Word conversion profiles; footnotes, readings (ruby) and interactive figures (components) in Egatari Text 2; conformance fixtures for Egatari Text 1 (`fixtures/article-text/`); and an optional Python-in-browser feature for simulations. **Citations:** the article's syntax, locators, bibliography, style and lists are specified in §9C.4; chapters, numbering and series in §9C.1A. Still open: citations on slides and in narration (same keys and `references.json`; in narration excluded from speech or given a reading), recorded as `metadata.citations.placement`: `inline` (e.g. "(Vaswani et al., 2017)", default), `footer` (the works cited on a slide listed in that slide's footer, e.g. by short title) or `both`; keeping the references as a TeX build typeset them (from its `.bbl`) when no CSL style matches a journal's notation; DOIs. To settle with `article-v1` (v0.7).
8. Scholarly use (submission and open review): (a) review comments as separate documents anchored into a lesson with the W3C Web Annotation Data Model (targets by `docId` + `sourceSha256`, selectors by step key, article section id or text quote), never written into the author's file; (b) revision history of one paper (same `docId`, successive `sourceSha256`) and per-step diffs; (c) an anonymized derivative for double-blind review (creators, copyright, attribution, signatures and personal metadata removed).
9. Document fixtures (fixtures/README.md), including tier A edits that introduce new glyphs and SCORM lifecycle cases, must exist before freezing. Egatari Text fixtures for citation locators exist (`fixtures/article-text/valid/cite-grouped-locator`, `cite-locator-japanese`; the locator is the `cite` node's `suffix`).
9A. Multilingual lessons: narration, audio and captions in several languages within one lesson (viewer-selectable), a narration language distinct from the slide language (e.g. Japanese slides with English captions), and `translate="no"` on math, code and component output so that browser translation does not break them. Right-to-left scripts (Arabic, Hebrew, Persian, Urdu): `dir="rtl"` on the lesson or a slide, which layout regions mirror (heading, conclusion line, progress bar, step order of side-by-side columns), and which stay left-to-right (math, code, numbers, components unless they declare RTL support); bidirectional text inside one line; and how a vertical-writing slide (`layout-tate`) relates to these writing modes.
10. Attachments (§3.8): whether to allow audio and video attachments; the outer package format (RO-Crate based) for material that does not belong in the file; measured size budgets.
11. Audio watermarks (§5.2, §7.3): which schemes to name, whether producers of cloned voices should embed one by default, detection without network access, and how robust common schemes are to the reference post-processing (−20 LUFS, MP3).
12. ~~Extension governance.~~ Specified (2026-10-29): §9A (versions, review of extensions that connect or send data, features vs extensions) and [`extensions.md`](extensions.md) (statuses, how to propose, the definition template, criteria for `candidate` and `stable`). Still open: adding editors, and an outside review for extensions that connect, once there is an outside proposal (foresight C1).
13. Encrypted lessons: a mode where the archive and runtime layer are encrypted inside the same single file and the player asks for a key before showing anything (Web Crypto, AES-GCM), as an alternative to password-protected archives sent with the password by a second e-mail ("PPAP"). To settle: how the key reaches the viewer — a passphrase, a key in a link's fragment, keys wrapped for named recipients' public keys (age/X25519, or a passkey-based scheme), or the access control of the place the file is shared from — and how this interacts with signatures (6), play-only derivatives and editors.
