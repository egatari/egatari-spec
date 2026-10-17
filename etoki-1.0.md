# Etoki 1.0 — Editor's Draft

**Status:** Editor's Draft, 2026-10-17. Not stable. Anything may change before 1.0 is frozen.
**Editors:** Gendo Kumoi (Nagaoka University of Technology).
**Reference implementation:** [motion-academic-slides](https://github.com/moiku/motion-academic-slides) (producer, player, editor).
**License of this document:** [CC BY 4.0](LICENSE.md). Schemas and fixtures in `spec/` are MIT, like the rest of the repository.

Etoki (絵解き, "explaining pictures") is a file format for **narrated, animated lessons**. One Etoki file is a single HTML document that

1. plays offline in a current web browser as a self-narrating lesson, a live presentation, or a lecture handout, and
2. carries its own authoring source, so that an Etoki editor can reopen the file *without the original folder*, change one sentence or one step's narration, replace that step's audio, and save the same kind of file again.

The name is always written *Etoki* (or 絵解き). It has no abbreviation.

## 0. Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in BCP 14 [RFC 2119] [RFC 8174] when, and only when, they appear in all capitals.

JSON structures are normatively defined by the JSON Schemas in [`schema/`](schema/). Where prose and schema disagree, the schema wins and the disagreement is a bug in this document.

"Step key" means `"<slideKey>:<stepKey>"`, where `stepKey` is a non-negative integer in decimal or the literal `concl`. Slide keys may themselves contain `:`; a step key is split at its **last** `:`.

## 1. Model

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

**Preview of later steps** is an option of every interactive mode, not a mode: steps not yet reached are either hidden (default) or shown faintly. The current step renders and animates as usual; only content of later steps is shown faintly, and components keep rendering their current step. `?mode=lecture` is a legacy alias for `talk` with preview on.

In `learn` mode, a player MUST offer playback rates of at least 0.75, 1, 1.25, 1.5 and 2, keeping the pitch of speech; the timeline clock advances at the same rate, so the screen stays a function of *(i, k, t)*. Presenter-only tools (presenter view, laser) SHOULD be hidden.

### 1.3 Narration

Each step MAY have narration: an ordered list of **turns**, each with a **role** (`expert` or `novice`; single-speaker lessons use `expert` only) and text. Text MAY contain **boundaries** — `cue` (a synchronization point for an animated component) and `mark` (an attention mark on a target element) — and **readings** (display text with a separate spoken form, e.g. φ read as ファイ). The authoring syntax is defined in §8.

## 2. File structure

An Etoki file is an HTML document (`text/html; charset=utf-8`). The RECOMMENDED file name extension is `.etoki.html`. A file has two layers:

| Layer | Purpose | Required for |
|---|---|---|
| **Runtime layer** | compiled slides, runtime script, styles, fonts, and the runtime JSON blocks (§4) | playing |
| **Archive layer** | the index (§3) and blob blocks: authoring source and media | editing |

A file with only the runtime layer is a **play-only** Etoki file. A file with both is a **portable** Etoki file.

All JSON blocks are `<script>` elements with a non-executable `type` and a unique `id`. Before embedding (and before hashing), every U+003C `<` in serialized JSON MUST be written as the six ASCII characters `\u003c`. Serialized JSON uses LF line endings only. (A non-executable `type` does not stop the HTML parser from ending the element at a literal `</script`.)

### 2.1 Readable layer without script

A conforming document MUST also contain, as ordinary DOM outside any `<script>`, for every step: the display text of its narration. It SHOULD contain, for every slide, either a static image of the final state or text equivalent to it. This layer serves archiving, accessibility, search, and recovery when no script runs.

## 3. Archive layer

### 3.1 Index

```html
<script type="application/vnd.etoki+json" id="etoki-index" data-sha256="…">{…}</script>
```

- `data-sha256` is the lowercase hex SHA-256 of the exact UTF-8 text content of the element. Readers MUST verify it before use.
- The content is a JSON object without duplicate member names, valid against [`schema/etoki-index.schema.json`](schema/etoki-index.schema.json). Its main members:

| Member | Req. | Meaning |
|---|---|---|
| `format` | MUST | the string `"etoki"` |
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
| `metadata` | MUST | descriptive metadata (§3.6) |
| `excluded` | MAY | informative list of categories the producer deliberately left out |

### 3.2 Blob blocks

```html
<script type="application/octet-stream" id="etoki-b-s0-0">PCFkb2N0eXBlIGh0bWw+…</script>
```

- Every blob — including UTF-8 text — is stored base64-encoded (RFC 4648 §4, no line breaks) in one or more chunk blocks listed in order in `blobs[id].chunks`.
- Each chunk MUST decode to at most 196 608 bytes (192 KiB). A reader concatenates the **decoded** bytes of the chunks, never the base64 strings.
- The decoded length MUST equal `bytes` and its SHA-256 MUST equal `sha256`; otherwise the blob is corrupt.
- Blob ids match `^[A-Za-z0-9_]{1,32}$`. Chunk ids are `etoki-b-<blobId>-<n>` with `<n>` the zero-based chunk number in canonical decimal (at most 9999). Duplicate ids make the file invalid.
- Version 1.0 blobs are uncompressed. A future feature (e.g. `gzip-v1`) may add compression; it will be listed in `requires`.

### 3.3 Archive paths

Keys of `files` are archive paths: `/`-separated, relative, UTF-8, NFC. A reader MUST reject the whole file if any path

- is absolute, starts with `/`, contains a drive letter (`C:`), a UNC prefix, a backslash, a NUL or other control character;
- has a segment that is empty, `.` or `..`, ends in a dot or space, or is a Windows reserved device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, with or without extension);
- collides case-insensitively with another path;
- is `__proto__`, `constructor` or `prototype` in any segment;
- contains any of `< > : " | ? *` or U+007F, or ends with `/`;
- has a segment that is a Windows device name with a superscript digit (`COM¹`–`COM³`, `LPT¹`–`LPT³`);
- equals another path followed by `/…` (a path cannot be both a file and a directory).

Case-insensitive comparison uses NFC followed by Unicode default case folding. A path is at most 1024 bytes and 10 segments. Readers MUST build every key-indexed structure from untrusted input with maps that have no inherited keys.

Paths under `audio/` are reserved for narration audio. An archive MUST include the slide source (`entry`), `narration.md` if the lesson has narration, and the complete dependency closure needed to rebuild the runtime layer (images, data, styles, deck-local components and themes, macros, `timeline.json`, a voice configuration without private paths). Registry components (§6) are excluded from the closure; they are resolved by exact name, version and hash. It MUST NOT include: absolute or machine-specific paths, credentials, editor review notes, caches, backups, unreferenced audio, private reference-voice recordings, or personal identifiers not deliberately entered as content.

### 3.4 Source hash

`sourceSha256` is computed as SHA-256 over the UTF-8 bytes of the lines `"<path>\t<sha256>\n"`, one per entry of `files` excluding paths under `audio/`, sorted by path in code-point order. Producers MUST also write the same value into the runtime layer's `deck-meta.sourceSha256` (§4). An editor that finds the two different MUST warn that the compiled lesson and its source disagree and MUST NOT perform a tier A edit (§7.2).

### 3.5 Features

`requires` lists feature identifiers (`^[a-z0-9-]+$`). Version 1.0 defines `sources-v1` (archive layer present) and `audio-v1` (§5.2 records). A reader MUST refuse to edit or re-export a file whose `requires` contains an identifier it does not implement; it MAY still play the file. Optional information that a reader may ignore MUST NOT be listed in `requires`.

### 3.6 Metadata

`metadata` MUST contain `title` and `lang` (BCP 47). It MAY contain `license` (SPDX identifier or URL), `creators` (display names the author chose to publish), `description`, `accessibility` (schema.org terms such as `accessMode`, `accessibilityFeature`, `accessibilityHazard`), `curriculum` (array of curriculum codes, e.g. Japanese 学習指導要領 codes from the MEXT education data standard), and `completion` (§9.2). Producers MUST NOT add timestamps, device identifiers, account e-mail addresses, or file-system locations.

## 4. Runtime layer

The runtime layer contains the compiled slides (`<section class="slide" data-key="…">` elements), the runtime, and these JSON blocks (`type="application/json"`):

| id | Content |
|---|---|
| `deck-meta` | `{format:"etoki", version, contracts, generator, docId, title, lang, portable, sourceSha256?, completion?, tracking}` — schema [`schema/deck-meta.schema.json`](schema/deck-meta.schema.json). `tracking` lists the tracking adapters the runtime implements (e.g. `["scorm12","postmessage","local"]`), so that packagers and hosts need not read the archive |
| `deck-narration` | `{slideKey: {stepKey: [{role, text}]}}` — display text |
| `deck-marks` | `{stepKey: [{type:"cue"} \| {type:"mark", id, effect, hold} \| {type:"clear"}]}` — boundaries, only for steps with marks |
| `deck-audio` | `{stepKey: {src, dur, cues}}` — `src` is a `data:` URI or `etoki:<blobId>`; `dur` seconds; `cues` the time of every boundary in order (§5.3); `sync` (`auto`, `manual`, `none`; default `auto`) — schema [`schema/deck-audio.schema.json`](schema/deck-audio.schema.json) |
| `deck-timing` | `{stepKey: {dur?, hold?, lead?, pad_after?}}` — explicit overrides |

Every slide MUST carry a `data-key`: the slide's `id` attribute if present, otherwise its normalized heading text (legacy). Producers SHOULD give every slide an explicit, stable id (§8.1), so that editing a title does not break narration and audio associations.

A portable file SHOULD reference audio as `etoki:<blobId>` so that audio bytes are stored once, in the archive layer. A player resolves `etoki:<blobId>` by decoding that blob.

## 5. Audio and timing

### 5.1 Formats

| Format | Producer | Player |
|---|---|---|
| MP3 (`audio/mpeg`), mono, 44.1 kHz | RECOMMENDED for new audio | MUST play |
| AAC-LC in MP4 (`audio/mp4`) | MAY (existing audio SHOULD be kept as is) | SHOULD play |
| WAV PCM 16-bit (`audio/wav`) | MAY, emergency only | MUST play |

Producers SHOULD normalize speech to −20 LUFS integrated, −1.5 dBTP, and trim silence at the ends (−45 dB, keeping 0.05 s), and SHOULD insert 0.35 s of silence between turns, but not at boundaries inside a turn nor at the end of the step. Encoder delay (priming) MUST be compensated so that time 0 of `dur` and `cues` is the first audible sample a player presents.

### 5.2 Audio records

`index.audio[stepKey]` describes the step's audio (schema: [`schema/etoki-audio.schema.json`](schema/etoki-audio.schema.json)):

| Member | Req. | Meaning |
|---|---|---|
| `file` | MUST | archive path under `audio/` |
| `dur`, `cues` | MUST | as in `deck-audio` |
| `kind` | MUST | `tts`, `recorded`, or `imported` |
| `inputHash` | MUST | §5.4 |
| `recipe` | MUST for `tts` | `{engine, model, voice, seed, dictionary, processing}`; `voice` is a public identifier, never a path |
| `recipeDigest` | MAY | the producer's content-address of input + recipe (e.g. the reference implementation's 12-hex `segDigest`) |
| `alternatives` | MAY | `[{file, mime, startOffset}]` other encodings of the same take |

Editors MUST NOT replace `recorded` audio unless the user explicitly selects that step.

### 5.3 Boundaries and cues

The boundaries of a step, listed in order across its turns, correspond one-to-one with `cues`. Players align component `cues(k)` with the `cue` boundaries only, and start marks at `cue + lead`. When counts do not match, **or `sync` is `none`**, players MUST fall back to unsynchronized deterministic timing (no component stretching; marks every 0.9 s after the step's motion ends). Producers of recorded audio MUST NOT reuse cue times from a previous take; until the user places them, the record (and its `deck-audio` entry) MUST have `"sync":"none"` and `cues: []`.

### 5.4 Staleness and identity

Three hashes serve three purposes and MUST NOT be substituted for one another:

1. **`inputHash`** — lowercase hex SHA-256 of the UTF-8 bytes of the canonical string `JSON.stringify(turns.map(t => [t.role, t.ttsParts, t.bounds.map(token)]))` (ECMAScript `JSON.stringify`, no whitespace), where `role` is `"expert"` or `"novice"`, `ttsParts` are the spoken text pieces between boundaries (readings substituted, trimmed, empty pieces kept), and `token` is `"cue"`, `"mark:clear"`, or `"mark:<id>|<effect>"` followed by `"|hold=<n>"` when a hold is given (`<n>` formatted by ECMAScript `Number.prototype.toString`). The slide key is not part of the hash. Test vectors: [`fixtures/input-hash/`](fixtures/input-hash/). Audio is **stale** when the current narration's `inputHash` differs from the record's. Editors MUST show stale steps and MUST NOT silently delete or regenerate their audio.
2. **`recipe` / `recipeDigest`** — records how the audio was generated. Identical recipes do **not** imply identical bytes: GPU-based synthesis is not bit-reproducible across hardware. Readers MUST NOT use audio bytes to decide whether a step needs regeneration.
3. **`sha256`** of the blob — integrity only.

### 5.5 Timeline

The length of step *(i, k)* is

```
dur = override.dur ?? max(anim, audio ? lead + audio.dur + pad_after : max(hold, marksEnd + pad_after))
```

with defaults `lead = 0.25`, `pad_after = 0.6`, `hold = 1.2` seconds; `anim` is the step's motion length including the slide transition (0.35 s) or morph (0.9 s) at step 0. `video` mode MUST use this function; so MUST any video export.

## 6. Components and profiles

Animated figures are custom elements (Web Components) following the component contract (§8.4). Each entry of `index.components` is `{tag, name, version, sha256, source}` where `source` is `registry` or `embedded`.

| Profile | Components | Editor behavior |
|---|---|---|
| **Core** | Only `registry` components: identified by name, version and the SHA-256 of their code in a public component registry. The archive contains no component code. | The editor supplies its own trusted copy and verifies the hash. A component it does not have is shown as its final-state image or text equivalent. |
| **Extended** | `embedded` components: code is in the archive (pinned at export). | The editor MUST run component code only in a sandbox with an opaque origin and a policy that forbids network access, and MUST tell the user before opening that the lesson contains its own interactive parts. |

The runtime layer of either profile contains the component code needed to play offline. An Extended document MAY mix registry and embedded components. If an editor cannot obtain a trusted copy of a registry component with the recorded hash, it MUST disable tier B and C edits for that document and MAY still perform tier A edits.

## 7. Versioning and editing

### 7.1 Versions

- `version` (this specification): minor versions only add optional members; readers MUST preserve unknown members through edits. A reader MUST refuse to edit a file with an unknown **major** version, and SHOULD still play it and offer to extract the source (§9.3).
- `contracts.source`: the authoring syntax (§8). Editors migrate older source contracts with deterministic migrators, and refuse newer ones.
- `contracts.runtime`: the runtime behavior. See §7.2.
- `generator.version` is informative.

### 7.2 Edit tiers

An editor MUST NOT execute a builder or runtime supplied by the document in its own trusted context.

| Tier | Change | Required behavior |
|---|---|---|
| **A** (default) | narration text, audio, timing overrides only | Do not rebuild. Only these regions may change: the affected entries of the runtime JSON blocks; the affected entries of the readable layer (§2.1); `sourceSha256` (index and `deck-meta`) and the index hash; archive entries, audio records and blobs; and **append-only font supplements** — new `<style id="etoki-font-supplement-<n>">` elements carrying glyphs for characters not covered by the embedded fonts. Every byte outside these regions, including existing font data, MUST stay identical. |
| **B** | slide content (text, math, figures) | Rebuild with the editor's runtime of the same `contracts.runtime`, using the archived (pinned) components and themes. Before saving, compare the final state of every slide before and after; show the user every slide that changed besides the edited ones. |
| **C** | `contracts.runtime` differs from the editor's | Only on explicit request ("upgrade"), with the same comparison as B. Without upgrade, only tier A edits are allowed. |

Re-export MUST copy untouched blobs byte-for-byte and MUST preserve `docId`.

## 8. Authoring source (contract version 1)

> This section will incorporate, normatively, the current repository contract: `docs/contract.md` §1–§5, §7, §8 (position and time, modes, components, narration syntax, timeline, attention marks, morphs). Until then, that document is normative for `contracts.source = 1` and `contracts.runtime = 1`.

### 8.1 Slide identifiers

- A slide is `<section class="slide" id="…">`. Ids match `^[A-Za-z][A-Za-z0-9_-]{0,63}$` and are unique in the document — including against every other `id` in it, such as attention-mark targets.
- Generated ids SHOULD be `s-` followed by 6 random base32 characters (`[a-z2-7]`). They MUST NOT be derived from the heading, so that renaming a heading never changes the id.
- In `narration.md`, a slide is addressed as `## <heading> {#<id>}` (RECOMMENDED), `## <id>`, or `## <heading>` (legacy, only for slides without id). When an `{#id}` is present it wins over the heading text.
- A deck MAY mix slides with and without ids; each slide is keyed independently.
- **Key derivation.** A heading line is `## ` followed by the heading text, optionally followed by whitespace and `{#<id>}` at the end of the line. If `{#<id>}` is present, the slide key is the id. Otherwise, if the heading text equals an id of a slide, the key is that id. Otherwise the key is the **normalized heading**: HTML tags removed, `&nbsp;` treated as a space, and **all** whitespace removed. In `deck.html`, a slide without id is keyed by the normalized text of its first heading element.
- Two slides with the same key make the document invalid; producers MUST assign ids to resolve collisions.
- Step numbers are written in canonical decimal (`0`, `1`, … without leading zeros), at most 999.

### 8.2 Narration syntax (summary)

```markdown
## <heading> {#<id>}
[0] text…
[2] Expert: text with {cue} and {mark:ID|circle|hold=2} and {φ|ファイ}
    Novice: question…
[concl] text…
```

### 8.3 Readings

`{display|reading}` stores the reading in kana (or the lesson language's ordinary spelling). Producers MAY export readings as SSML `<sub alias>`, W3C PLS lexicon entries, or HTML `<ruby>`.

### 8.4 Component contract (summary)

`steps`, `props`, `mount(ctx)`, `duration(k)`, `cues(k)`, `render(k, t, ctx)`; `render` gives the same output for the same *(k, t)*; colors only through theme CSS variables.

## 9. Player requirements

### 9.1 Playback

A conforming player MUST: render any *(i, k, t)* deterministically; implement the `talk`, `learn` and `video` modes and the preview option (§1.2); play the formats in §5.1; start audio only after a user gesture (a visible start/resume control); pause when the page is hidden; honor `prefers-reduced-motion` by rendering final states; and work from `file://` with no network access.

### 9.1A Learner data

Notes, ink, bookmarks and other data a learner creates MUST NOT be written into the Etoki file. Players MAY keep them in local storage keyed by `docId`, and SHOULD let the learner export them (e.g. the final state of each slide with the learner's notes, as PDF or Markdown).

### 9.2 Tracking

A player SHOULD expose progress through a tracking adapter, detected in this order: SCORM 1.2 API (`window.API` in a parent frame), then `postMessage` to the parent, then local storage. Events: `started`, `step` (`{slideKey, stepKey, index, total}`), `completed`, `suspend` (`{location, data}`). The SCORM 1.2 binding is defined in [`bindings/scorm12.md`](bindings/scorm12.md). A player lists the adapters it implements in `deck-meta.tracking`; completion rules are read from `deck-meta.completion` so that play-only files can be tracked. Completion defaults to "every step visited"; `metadata.completion` MAY set `{"visitedFraction": number}` or `{"reachedEnd": true}`.

### 9.3 Source extraction

A player SHOULD offer to save the archive layer as a ZIP of `files` plus `audio/manifest.json`, so the source remains recoverable without any editor.

### 9.4 Embedding

A host page (a learning platform, an LMS plugin, a video tool) MAY embed an Etoki file in an `<iframe>` and drive it. A player that supports embedding MUST, when loaded with the query parameter `embed=1`, accept these messages from `window.parent` via `postMessage` (objects with a string member `etoki`) and ignore messages from any other source:

| Message | Effect |
|---|---|
| `{etoki:"seek", slide, step, t}` | `DECK.seek` to that position; `slide` is a slide key or index, `step` a step key, `t` seconds or `null` for ∞ |
| `{etoki:"play"}` / `{etoki:"pause"}` | start / pause timeline playback with audio (a user gesture inside the frame may still be required by the browser) |
| `{etoki:"mode", mode}` | switch display mode |

and post to `window.parent` (target origin `*`; the payload contains no private data):

| Message | When |
|---|---|
| `{etoki:"ready", version, timeline:[{slideKey, stepKey, title, dur}]}` | after loading |
| `{etoki:"position", slideKey, stepKey, t}` | on every step change, and at most 4 times per second during playback |
| `{etoki:"ended"}` | after the last step of the timeline |

The same messages serve the `postMessage` tracking adapter (§9.2). Embedding commands are unprivileged: they can only do what a viewer could do with the controls.

## 9A. Extensions

Platforms may need information that Etoki does not define (e.g. questions to ask the learner at a step, grouping of steps into chapters). Such information is carried as **extensions** without changing Etoki itself.

- **Index:** `extensions` is an object whose keys are extension names (`^[a-z][a-z0-9-]{0,31}$`) and whose values are objects with at least `v` (integer version of that extension). Data addressed to a step uses step keys.
- **Source:** in the slide source, extension data MAY be written as attributes `data-x-<name>-<field>` on slides and elements. Producers MAY fold them into `extensions.<name>` at export.
- Readers MUST ignore extensions they do not implement. Editors MUST preserve them byte-for-byte through tier A edits and preserve their content through tier B and C edits, except entries whose step or slide no longer exists, which they MAY drop with a warning.
- An extension MUST NOT change how a player that ignores it renders or times the lesson. Information without which the lesson cannot be played correctly is not an extension; it needs a new feature in `requires` and a new version of this specification.
- Extension names are registered first-come in [`extensions.md`](extensions.md) with a link to their definition.

## 10. Conformance classes

| Class | Requirement summary |
|---|---|
| **Document — Core / Extended** | valid runtime layer; if portable, valid archive layer of that profile; readable layer (§2.1) |
| **Player — Core / Extended** | §9.1; resolves `etoki:` audio; Extended players run embedded component code |
| **Editor** | safe import (§11), tier A at least, §7, preserves unknown members and `docId` |
| **Producer** | writes conforming documents; §3.3 exclusions; §5 audio rules |
| **LMS Binding** | packages a document for a learning platform per a binding document (SCORM 1.2 in 1.0) |

Conformance is tested with the fixtures in [`fixtures/`](fixtures/).

## 11. Security considerations

- **Opening an Etoki file as a web page runs its scripts**, as with any HTML file. Being importable safely by an editor does not make arbitrary HTML trustworthy.
- An editor MUST read an imported file as bytes and extract the index and blobs with a parser that neither executes scripts nor loads resources. It MUST NOT navigate to, `srcdoc`, or insert the file into a document. It MUST validate the index hash, blob hashes, MIME types, and archive paths (§3.3) before constructing any workspace.
- An editor MUST enforce limits before allocation and account for them in this order: file size before parsing; index size and member count before `JSON.parse`; each chunk's encoded length (at most 262 144 characters) before decoding; cumulative decoded bytes while decoding. Recommended limits an editor may refuse beyond: 100 MiB file, 128 MiB decoded archive, 3000 files, path depth 10, 4 MiB index, 32 MiB per file.
- Messages from a preview MUST NOT authorize mutations. A write happens only as an operation initiated and scoped by the editor's own UI; preview code cannot create that authorization (it may only send hints such as the selected slide, step or element).
- Previews MUST run in a sandboxed frame with an opaque origin and a content security policy forbidding network connections, forms and external resources. File handles, microphone access, model workers and write operations MUST stay in the editor's own context; messages from the preview MUST be treated as untrusted hints.
- Hashes in this format detect corruption; they do not authenticate authorship.

## 12. Media type and identification

- Distribution: `text/html`. Extension `.etoki.html`.
- Index block: `application/vnd.etoki+json` (to be registered with IANA when 1.0 is frozen).
- Detection: a reader identifies an Etoki file by `deck-meta.format == "etoki"` or an `etoki-index` block.

## References

- [RFC 2119], [RFC 8174] Key words. [RFC 4648] Base64. [BCP 47] Language tags.
- W3C EPUB 3.3 Media Overlays; Readium Guided Navigation; WebVTT; W3C PLS 1.0; SSML 1.1 — interoperability targets for exports.
- ADL SCORM 1.2 Run-Time Environment.

## Appendix A. Open issues

1. **Blocker for 1.0:** normative text of §8 (import and freeze `docs/contract.md`), component/theme dependency manifests and hash scope, schemas for every runtime block, archive↔runtime consistency rules.
2. Public component registry: location, naming, hash publication.
3. Whether a lesson may embed a custom reference voice (size, privacy).
4. Tolerances for loudness and cue timing across browsers.
5. File-picker availability on `file://`; download as the baseline save path.
6. Document fixtures (fixtures/README.md), including tier A edits that introduce new glyphs and SCORM lifecycle cases, must exist before freezing.
