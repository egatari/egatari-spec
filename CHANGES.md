# Changes

Egatari 1.0 is an Editor's Draft: `main` is the live draft and may change at any time. Dated snapshots are tagged `wd-YYYY-MM-DD` (Working Draft); a second snapshot on the same day adds a letter (`wd-YYYY-MM-DDb`). Implementations say which snapshot they follow (for example, "Egatari Studio 0.4.6 follows Egatari 1.0 WD 2026-10-24"). Nothing is stable before 1.0 is frozen; snapshots exist so that implementations and lessons can name the draft they were built against.

## Since WD 2026-10-26

Changes on `main` after the snapshot; they will be in the next Working Draft.

- **Dependencies and hash scope (open issue 1, first part; 2026-10-31).** §6.1: a part is one code file, and it reads no other file at play time. §6: `index.components` lists every required `name@version`, transitively, and each entry is hashed on its own; a producer that cannot carry a required part refuses to build, and checks report it; readers of such a file warn and play the rest. `index.themes` entries gain `extends` (schema), and the parent theme is its own entry. The minimum registry manifest is defined: parts keyed by name with `{version, sha256, requires, tag?, license, withdrawn?}` (`withdrawn` keyed by version), and themes with `{name, version, sha256, extends?, license}`.
- §6.2 **subset by name** (for icon sets, components 2.1): a subset entry may set `match: "name"`; keys are names `[a-z0-9-]`, kept when they equal a token of the lesson's text split at every other character; `keep` lists names chosen at play time; `index.components[].subset.names` records the kept names (schema). The default `"char"` is unchanged.
- **Extension governance (closes open issue 12).** §9A: within one `v` a definition may only add optional members; a reader that finds a higher `v` than it implements ignores the extension unless the definition says it is compatible; extensions that connect or send data off the device are registered only after the editors review them; what cannot be ignored is a feature in `requires`, not an extension. [extensions.md](extensions.md): statuses `draft` / `candidate` / `stable` / `withdrawn` (candidate: complete definition, schema, fixtures, one passing implementation; stable: 60 days released without breaking change), how to propose, and the definition template (purpose, data, authoring source, play-only derivatives, network, data leaving the device, when ignored, security, tests, changes). Appendix A 9: the citation-locator fixtures exist.
- §9C.2 fixtures: `fixtures/article-text/` (32 valid input/tree pairs, 20 invalid cases), made with myst-parser 1.7.5 and four structural myst-transforms steps; `npm test` re-parses and compares. The table now matches the tree: reference links are `link`, targets attach to the next node and leave none, `math` has no `enumerated`.
- **Book (§9C, owner decisions 2026-10-28).** §9C.1 `index.article` is `{path}` (one `article.md`) or `{chapters}` (`article/<name>.md` in reading order; a book); new §9C.1A: front matter `chapter` numbers a chapter, and numbers then run per chapter (sections 4.1, figures 4.1, equations (4.1), as TeX book/report); `numbering: false` turns off section numbers; `metadata.series` `{id, title, part?}`; one lesson per session carrying its chapter is the usual form of a course, and a book can be built from such lessons (informative merge rules); TeX import mapping (informative). §9C.4: locators are the `suffix` of `cite` (checked against myst-parser 1.7.5) and are not interpreted; `metadata.citations` `{style, list}` (CSL style id; at least one author–date and one numeric style; lists `end` / `chapter` / `none`); `placement` stays open (issue 7). §9C.6: headings are numbered and section cross-references show the number; chapter markup. §9C.8: chapter errors. Schemas: `index.article.chapters`, `metadata.series`, `metadata.citations`, `metadata.completion.played`.
- Player P2 (owner, 2026-10-28): during playback a text pane follows the current turn and stops following when the viewer scrolls it (MUST), with a control to return; reading aids for the article: table of contents, search and back (MUST), reopening where the viewer left off, page numbers not presented as references, a text-pane background choice that never changes the stage. P6 and §9.2: `step` carries `via` (`stage` played, `text` read); completion counts both unless `metadata.completion.played` is true.
- Fixtures: `fixtures/documents/` regenerated in the 1.0 shape from Egatari Studio v0.6.0-rc.1 (f112bb4, player 1.0.0); every `expect.json` unchanged. `legacy-heading-keys` stays a v0.3.1 file as the pre-1.0 draft case; new `idless-source` (ids assigned at export).
- §6.1–§6.2, §8.4, second round from the components 2.0 host (2026-10-28): `define` meta is a static object literal (identifier or double-quoted keys, double-quoted string or nested object values); `status().failed[]` carries `element` and the reasons `meta`, `factory` (not a function, throws, or no element constructor), `missing`, `dependency`, `duplicate`, `element` (name taken or defining fails); one definition per element name, else the producer refuses to build instead of dropping a required version; subset `data` is only `block:<name>` in 1.0; players MAY call `layout` more often, and a call at an unchanged size MUST be harmless.
- §5 `recipe` (owner, 2026-10-28; closes open issue 3): a lesson MUST NOT carry the reference recording a voice was cloned from; it carries only the synthesized narration audio.
- Player P9 (owner, 2026-10-28): the article's read face is part of the `article-v1` feature, not of the core: a conforming player MAY leave it out (it then shows slides and narration, §9C.10) and, if it implements it, follows P2 and §9C. `article-v1` is to be frozen together with 1.0.
- §6.1–§6.2, §8.4 gaps found by the first components 2.0 host (Studio v0.6.3-c2host, 2026-10-28): the registry adds `status()` for players and tools (defined parts; failures `factory`, `missing`, `dependency`, `duplicate`, `element`); a second `define` of the same `name@version` is ignored; `define`'s `meta` is a JSON object literal readable without running the part, recorded in `index.components` also for embedded parts; element names are unique per file (the producer keeps one version and reports the conflict). Rendered fields are named `<field>Html` (katex), `<field>Svg` and `<field>Map` (abcjs); `index.components[].renderers` in the schema. Subset: the lesson's text includes attribute values; several entries apply in order; `subset.keys` is the union of kept keys in code-point order. `ctx.report` does not itself switch a part to its fallback; only a part that cannot draw does. `layout(ctx)` is called on laid-out size changes (not transform scaling), font loading, each time the slide becomes current and when the document becomes visible, with `instant` true and `entered` false. `ctx.slides[].title` follows the slide-list title (§8).
- **Parts (components 2.0).** §6.1 parts and their dependencies: element and library parts, per-part versions, a producer-written registry `egatariParts.define({name, version, requires, element}, factory)` in dependency order, no imports or player globals, notices directly before third-party data, `license` and `requires` in `index.components`. §6.2 rendering at build time: `build.fields` with the renderers `katex` and `abcjs`, build-assigned `data-*` attributes, `build.subset` and `glyphs`, rendered output read through an element whitelist, renderer recorded. §8.4: context `lang`, `slides`, `go()`, `report()`; optional `layout(ctx)`. Appendix A 1A is specified.

- §8.4: a component's declared step count depends only on its attributes and content, never on the context (players read it before `mount`); `ctx.slides` entries carry `steps` (largest numbered step key) and `concl` (whether the slide has a conclusion step).
- §8.4: printing, export, thumbnails and video frames (and the return after them) are not entering a slide: `entered` stays false and viewer input survives. `ctx.report` codes: `data`, `attr`, `range`, `size`, `layout`, `theme`, `error`; messages start with `[<part name>]`.
- §6.2: the reader of rendered output admits exactly `schema/rendered-markup-1.json` (elements per namespace, attributes, value grammars; `style` as listed length/keyword properties set one at a time, no colour; `fill`/`stroke` only `none`/`currentColor`; no URLs). katex `options.output` may be `html` for fields whose meaning the part also gives as text. Renderers are recorded once per part as `renderers: {<name>: {version, options}}` in the data and in `index.components`. Missing rendered output shows the source as text and reports `data`. The list admits `color: transparent` (phantoms), margin/padding/border shorthands without colours, MathML `mathsize`, `width` on `mtd`, `separator`, `largeop` and filtered `style`; `xmlns` is a namespace check; `build.options: {katex: {output: "html"}}` declares HTML-only output. SVG `fill`/`stroke` on `g` and `svg`, `stroke` on `text`/`tspan`. `build.subset.data` may name `block:<name>`, a JSON block in the part's code between `/*@egatari-block <name>*/` and `/*@egatari-block-end*/`, re-serialised canonically; `build.subset` may be an array.
- §6.1 containment and identifiers: an exception thrown by an element part MUST NOT escape to the player or other parts (a base class SHOULD catch, report once and show the text equivalent; players SHOULD also catch); ids a part writes (e.g. `clipPath`) MUST be unique across parts and part versions in one file and deterministic.
- §8.0 line breaking: Japanese and Chinese text follows W3C JLREQ (行頭禁則・行末禁則・分離禁止), at least CSS `line-break: strict`, on slides, the text pane, captions and the presenter's script; hanging punctuation allowed.
- §9C.2 article front matter `writing-mode` (`horizontal-tb` | `vertical-rl`); vertical-rl pages progress right to left, as EPUB `page-progression-direction="rtl"`. Player P2: text size in at least three steps, reflowing, per viewer, following EPUB reading-system user settings; vertical writing turns pages leftward (left arrow and left taps go forward).

## WD 2026-10-26

Snapshot for Egatari Studio 0.6.0 (the first release in the 1.0 file shape). It includes everything below, the article layer (§9C) among it, and the first draft of [Egatari Player 1.0](egatari-player-1.0.md), now a separate document. Files written to earlier drafts are not compatible (§7.1); they keep playing with their own player.

**The 1.0 file shape (owner, 2026-10-25: the format describes the lesson; players are separate and anyone may write one)**
- §4.1 the bundled player: the runtime script is one conforming player carried in the file, not part of the format; `player` `{name, version}` is REQUIRED in the index and `deck-meta`; `generator` names the producer only; the lesson MUST be playable without the bundled player; an editor that rebuilds tells the user when the player changes; information panels show format, player, producer in that order.
- §4.2 network policy in the file: every file carries a fixed Content-Security-Policy `<meta>` first in `<head>` (baseline `connect-src 'none'`, every resource `data:`/`blob:` only); only extensions that allow network access add their declared destinations (`live` to `connect-src`, `embed` to `frame-src`); validators, editors and hosts check it. `extensions/live.md` and `extensions/embed.md` refer to it.
- No backward compatibility with earlier drafts (§7.1): files without `player` are pre-1.0 drafts; they keep playing with their own player; 1.0 editors MAY refuse to edit them and point to an earlier editor or migration instructions.
- Removed: slide keys from heading text, hand-written `data-key` and `s<n>` (every slide has an id; narration headings carry `{#id}`); `?mode=lecture`; `:name:` in Egatari Text; camera `camera-v1` (§8.3A) and `zoom` in `deck-marks` — zooming is a component effect (owner, 2026-10-25).
- §8: the contract link points to egatari/egatari-studio.
- Lessons without slides: a lesson has slides, an article, or both; `entry` is no longer required when `article` is present (schema `anyOf`); an article-only lesson has no steps, narration or audio in 1.0, its primary face is `read`. `index.article` is now in the schema.
- **§8 is now normative** (Appendix A item 1, part 1): §8.0 slides (`deck.html` structure, kinds of slide, steps including automatic list steps and the conclusion as max + 1, `data-at`, drawn strokes, motion length with the timing constants, meaning classes, math syntax and the allowed `\html…` commands, references in the source), §8.2 blocks and turns, §8.6 emphasis marks, §8.7 morphs. `docs/contract.md` of Egatari Studio is no longer normative.
- §8.4 steps of a component: `data-from` (default 1), the `steps` attribute, k = clamp(K − from + 1, 0, steps), (k, ∞) outside the range, piecewise-linear mapping of t onto narration cues when the counts match. Declarations a player needs (`steps`, `props`, `variants`, `clock`, `preview`) are on the component class in the file; the release manifest only repeats them. New context member `entered` (first render after entering the slide from elsewhere or by a jump).
- `ctx.slide` is the slide's key (a string), not an element or index; exempt content (`data-preview="none"`, `preview: "none"`) stays hidden even inside a faint ancestor; `player` and `generator` may carry `title`, the name to show people.
- §8.4 presentation variants by name only: the lesson seed (`data-egatari-seed`) and the component `seed` attribute are removed; a component shows `variant="<name>"` or its default (the first in its manifest); producers may write variant names when making a lesson (owner, 2026-10-26: the seed made the format heavier than the benefit).
- §8.4 theme colours: colour carries meaning (roles are the format, values the theme's); components MUST use only the vocabulary, slides SHOULD (other colours are reported, not invalid).
- §8.4 answers under preview: components draw later steps faintly under preview unless they declare `preview: "none"` (answers); authors may mark elements `data-preview="none"`; Player P1: faint opacity from the theme's `--preview-opacity` (default 0.45).
- §8.4 component sounds: a `note` may sound past the end of its step on forward crossings (live and video) and stops on going back, jumping or seeking; tempo is the component's own (music parts).
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
